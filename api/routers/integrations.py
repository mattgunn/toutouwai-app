"""Integrations router — PayHero + Azure AD."""

import json
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse

from ..db import now_iso
from ..deps import get_db, get_current_user, JWT_SECRET, JWT_ALGORITHM

router = APIRouter()

_CONFIG_FILE = Path(__file__).resolve().parent.parent.parent / "config.json"


def _load_config() -> dict:
    try:
        with open(_CONFIG_FILE) as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def _integration_enabled(key: str) -> bool:
    return bool(_load_config().get(key, {}).get("enabled", False))


def _get_setting(conn, key: str) -> str | None:
    row = conn.execute("SELECT value FROM settings WHERE key = ?", (key,)).fetchone()
    return row["value"] if row else None


def _get_payhero_credentials(conn) -> tuple[str, str]:
    api_key = _get_setting(conn, "payhero_api_key")
    sub_key = _get_setting(conn, "payhero_subscription_key")
    if not api_key or not sub_key:
        raise HTTPException(status_code=400, detail="PayHero credentials not configured. Set API Key and Subscription Key in Settings → Integrations.")
    return api_key, sub_key


# ══════════════════════════════════════════════════════════════════════
# PayHero
# ══════════════════════════════════════════════════════════════════════

@router.get("/integrations/payhero/status")
def payhero_status(conn=Depends(get_db), _user=Depends(get_current_user)):
    row = conn.execute(
        "SELECT COUNT(*) AS c FROM settings WHERE key IN ('payhero_api_key', 'payhero_subscription_key') AND value IS NOT NULL AND value != ''"
    ).fetchone()
    return {
        "configured": row["c"] == 2,
        "enabled": _integration_enabled("payhero"),
    }


@router.post("/integrations/payhero/test")
def payhero_test(conn=Depends(get_db), _user=Depends(get_current_user)):
    from modules.payhero._client import payhero_login, PayHeroError
    api_key, sub_key = _get_payhero_credentials(conn)
    try:
        payhero_login(api_key, sub_key)
        return {"ok": True}
    except PayHeroError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/integrations/payhero/sync")
def payhero_sync(conn=Depends(get_db), _user=Depends(get_current_user)):
    """Fetch employees from PayHero and return a preview."""
    if not _integration_enabled("payhero"):
        raise HTTPException(status_code=400, detail="PayHero integration is disabled")
    from modules.payhero._client import payhero_login, payhero_fetch_employees, PayHeroError
    from modules.payhero._sync import build_employee_preview

    api_key, sub_key = _get_payhero_credentials(conn)
    try:
        auth = payhero_login(api_key, sub_key)
        ph_employees = payhero_fetch_employees(auth, sub_key)
    except PayHeroError as e:
        raise HTTPException(status_code=502, detail=str(e))

    preview = build_employee_preview(conn, ph_employees)
    return {
        "entries": preview,
        "total": len(preview),
        "to_create": sum(1 for p in preview if p["action"] == "create"),
        "to_update": sum(1 for p in preview if p["action"] == "update"),
    }


@router.post("/integrations/payhero/import")
def payhero_import(conn=Depends(get_db), _user=Depends(get_current_user)):
    """Confirm import — pull employees from PayHero into HRIS."""
    if not _integration_enabled("payhero"):
        raise HTTPException(status_code=400, detail="PayHero integration is disabled")
    from modules.payhero._client import payhero_login, payhero_fetch_employees, PayHeroError
    from modules.payhero._sync import sync_employees_from_payhero

    api_key, sub_key = _get_payhero_credentials(conn)
    try:
        auth = payhero_login(api_key, sub_key)
        ph_employees = payhero_fetch_employees(auth, sub_key)
    except PayHeroError as e:
        raise HTTPException(status_code=502, detail=str(e))

    results = sync_employees_from_payhero(conn, ph_employees)
    return {"status": "ok", "results": results}


@router.post("/integrations/payhero/push")
def payhero_push(conn=Depends(get_db), _user=Depends(get_current_user)):
    """Push HRIS employee changes to PayHero. (Placeholder — PayHero API write access TBD)."""
    if not _integration_enabled("payhero"):
        raise HTTPException(status_code=400, detail="PayHero integration is disabled")
    # PayHero's public API currently has limited write endpoints.
    # This is a placeholder for when write access becomes available.
    return {"status": "ok", "detail": "PayHero push is not yet available — API write access pending"}


# ══════════════════════════════════════════════════════════════════════
# Azure AD
# ══════════════════════════════════════════════════════════════════════

@router.get("/integrations/azure-ad/status")
def azure_ad_status(_user=Depends(get_current_user)):
    from modules.azure_ad._tokens import load_tokens, has_credentials
    tokens = load_tokens()
    return {
        "connected": tokens is not None and "access_token" in (tokens or {}),
        "enabled": _integration_enabled("azure_ad"),
        "has_credentials": has_credentials(),
        "tenant_id": _load_config().get("azure_ad", {}).get("tenant_id", ""),
    }


@router.get("/integrations/azure-ad/connect")
def azure_ad_connect(_user=Depends(get_current_user)):
    """Redirect to Microsoft OAuth authorization."""
    from modules.azure_ad._tokens import get_authorize_url, has_credentials
    if not has_credentials():
        raise HTTPException(status_code=400, detail="Azure AD credentials not configured in .env")
    redirect_uri = "http://localhost:5183/api/integrations/azure-ad/callback"
    url = get_authorize_url(redirect_uri)
    return RedirectResponse(url)


@router.get("/integrations/azure-ad/callback")
def azure_ad_callback(code: str = "", error: str = ""):
    """OAuth callback — exchange code for tokens."""
    if error:
        return RedirectResponse(f"/settings?error={error}")
    if not code:
        return RedirectResponse("/settings?error=no_code")

    from modules.azure_ad._tokens import exchange_code
    try:
        redirect_uri = "http://localhost:5183/api/integrations/azure-ad/callback"
        exchange_code(code, redirect_uri)
        return RedirectResponse("/settings?connected=azure_ad")
    except Exception as e:
        return RedirectResponse(f"/settings?error={str(e)[:100]}")


@router.post("/integrations/azure-ad/disconnect")
def azure_ad_disconnect(_user=Depends(get_current_user)):
    from modules.azure_ad._tokens import clear_tokens
    clear_tokens()
    return {"status": "ok"}


@router.post("/integrations/azure-ad/sync")
def azure_ad_sync(conn=Depends(get_db), _user=Depends(get_current_user)):
    """Fetch users/groups from Azure AD and return a preview."""
    if not _integration_enabled("azure_ad"):
        raise HTTPException(status_code=400, detail="Azure AD integration is disabled")

    from modules.azure_ad._tokens import get_valid_access_token
    from modules.azure_ad._client import fetch_ad_users, GraphAPIError
    from modules.azure_ad._sync import build_ad_user_preview

    token = get_valid_access_token()
    if not token:
        raise HTTPException(status_code=400, detail="Azure AD not connected. Connect first in Settings → Integrations.")

    try:
        ad_users = fetch_ad_users(token)
    except GraphAPIError as e:
        raise HTTPException(status_code=502, detail=str(e))

    preview = build_ad_user_preview(conn, ad_users)
    return {
        "entries": preview,
        "total": len(preview),
        "to_create": sum(1 for p in preview if p["action"] == "create"),
        "to_update": sum(1 for p in preview if p["action"] == "update"),
    }


@router.post("/integrations/azure-ad/import")
def azure_ad_import(conn=Depends(get_db), _user=Depends(get_current_user)):
    """Confirm import — pull users and groups from Azure AD into HRIS."""
    if not _integration_enabled("azure_ad"):
        raise HTTPException(status_code=400, detail="Azure AD integration is disabled")

    from modules.azure_ad._tokens import get_valid_access_token
    from modules.azure_ad._client import fetch_ad_users, fetch_ad_groups, GraphAPIError
    from modules.azure_ad._sync import sync_users_from_ad, sync_groups_as_departments

    token = get_valid_access_token()
    if not token:
        raise HTTPException(status_code=400, detail="Azure AD not connected")

    try:
        ad_users = fetch_ad_users(token)
        ad_groups = fetch_ad_groups(token)
    except GraphAPIError as e:
        raise HTTPException(status_code=502, detail=str(e))

    results = {}

    # Sync groups as departments if enabled
    cfg = _load_config().get("azure_ad", {})
    if cfg.get("sync_groups_as_departments", True):
        results["departments"] = sync_groups_as_departments(conn, ad_groups)

    results["employees"] = sync_users_from_ad(conn, ad_users)
    return {"status": "ok", "results": results}


@router.post("/integrations/azure-ad/push")
def azure_ad_push(body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    """Push a specific HRIS employee to Azure AD."""
    if not _integration_enabled("azure_ad"):
        raise HTTPException(status_code=400, detail="Azure AD integration is disabled")

    from modules.azure_ad._tokens import get_valid_access_token
    from modules.azure_ad._sync import push_employee_to_ad
    from modules.azure_ad._client import GraphAPIError

    token = get_valid_access_token()
    if not token:
        raise HTTPException(status_code=400, detail="Azure AD not connected")

    employee_id = body.get("employee_id")
    if not employee_id:
        raise HTTPException(status_code=400, detail="employee_id required")

    # Get domain from config or env
    import os
    domain = os.environ.get("AZURE_AD_DOMAIN", "yourdomain.onmicrosoft.com")

    try:
        ad_id = push_employee_to_ad(conn, employee_id, token, domain)
    except GraphAPIError as e:
        raise HTTPException(status_code=502, detail=str(e))

    if not ad_id:
        raise HTTPException(status_code=404, detail="Employee not found")

    return {"status": "ok", "azure_ad_id": ad_id}


# ══════════════════════════════════════════════════════════════════════
# Microsoft SSO Login
# ══════════════════════════════════════════════════════════════════════

@router.post("/auth/microsoft")
def microsoft_sso_login(body: dict, conn=Depends(get_db)):
    """Validate a Microsoft ID token and issue an HRIS JWT.

    The frontend sends { id_token } after Microsoft SSO.
    We decode it to get the user's email, then find/create the user.
    """
    import jwt as pyjwt

    id_token = body.get("id_token", "")
    if not id_token:
        raise HTTPException(status_code=400, detail="id_token required")

    # Decode without verification for now (in production, verify with Microsoft's public keys)
    try:
        claims = pyjwt.decode(id_token, options={"verify_signature": False})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID token")

    email = (claims.get("preferred_username") or claims.get("email") or "").strip().lower()
    name = claims.get("name", "")

    if not email:
        raise HTTPException(status_code=400, detail="No email in ID token")

    # Find or create user
    row = conn.execute("SELECT * FROM users WHERE LOWER(email) = ?", (email,)).fetchone()
    if not row:
        from ..db import new_id
        from ..deps import ALL_MODULES
        ts = now_iso()
        user_count = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        role = "admin" if user_count == 0 else "member"
        permissions = json.dumps(ALL_MODULES) if role == "admin" else json.dumps([])
        user_id = new_id()
        conn.execute(
            "INSERT INTO users (id, name, email, role, permissions, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (user_id, name or email.split("@")[0], email, role, permissions, ts, ts),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()

    # Issue HRIS JWT
    session_jwt = pyjwt.encode({"sub": row["id"]}, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return {"jwt": session_jwt}
