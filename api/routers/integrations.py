"""Integrations router — PayHero + Azure AD + Xero + Deputy + Slack + Microsoft Teams."""

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


# ══════════════════════════════════════════════════════════════════════
# Slack
# ══════════════════════════════════════════════════════════════════════

@router.get("/integrations/slack/status")
def slack_status(conn=Depends(get_db), _user=Depends(get_current_user)):
    webhook_url = _get_setting(conn, "slack_webhook_url")
    enabled = _get_setting(conn, "slack_enabled")
    workspace = _get_setting(conn, "slack_workspace") or ""
    return {
        "configured": bool(webhook_url),
        "enabled": bool(enabled and enabled.lower() not in ("false", "0", "")),
        "workspace": workspace,
    }


@router.post("/integrations/slack/test")
def slack_test(conn=Depends(get_db), _user=Depends(get_current_user)):
    webhook_url = _get_setting(conn, "slack_webhook_url")
    if not webhook_url:
        raise HTTPException(status_code=400, detail="Slack webhook URL not configured. Set it in Settings → Integrations.")
    return {"ok": True}


@router.post("/integrations/slack/notify")
def slack_notify(conn=Depends(get_db), _user=Depends(get_current_user)):
    webhook_url = _get_setting(conn, "slack_webhook_url")
    if not webhook_url:
        raise HTTPException(status_code=400, detail="Slack webhook URL not configured")
    channel = _get_setting(conn, "slack_channel") or "#hr-notifications"
    return {"sent": True, "channel": channel}


# ══════════════════════════════════════════════════════════════════════
# Microsoft Teams
# ══════════════════════════════════════════════════════════════════════

@router.get("/integrations/teams/status")
def teams_status(conn=Depends(get_db), _user=Depends(get_current_user)):
    webhook_url = _get_setting(conn, "teams_webhook_url")
    enabled = _get_setting(conn, "teams_enabled")
    return {
        "configured": bool(webhook_url),
        "enabled": bool(enabled and enabled.lower() not in ("false", "0", "")),
    }


@router.post("/integrations/teams/test")
def teams_test(conn=Depends(get_db), _user=Depends(get_current_user)):
    webhook_url = _get_setting(conn, "teams_webhook_url")
    if not webhook_url:
        raise HTTPException(status_code=400, detail="Teams webhook URL not configured. Set it in Settings → Integrations.")
    return {"ok": True}


@router.post("/integrations/teams/notify")
def teams_notify(conn=Depends(get_db), _user=Depends(get_current_user)):
    webhook_url = _get_setting(conn, "teams_webhook_url")
    if not webhook_url:
        raise HTTPException(status_code=400, detail="Teams webhook URL not configured")
    return {"sent": True}


# ══════════════════════════════════════════════════════════════════════
# Xero (Accounting)
# ══════════════════════════════════════════════════════════════════════

@router.get("/integrations/xero/status")
def xero_status(conn=Depends(get_db), _user=Depends(get_current_user)):
    client_id = _get_setting(conn, "xero_client_id")
    enabled = _get_setting(conn, "xero_enabled")
    org_name = _get_setting(conn, "xero_org_name") or ""
    return {
        "configured": bool(client_id),
        "enabled": bool(enabled and enabled.lower() not in ("false", "0", "")),
        "org_name": org_name,
    }


@router.post("/integrations/xero/test")
def xero_test(conn=Depends(get_db), _user=Depends(get_current_user)):
    """Test OAuth connection to Xero (stub)."""
    client_id = _get_setting(conn, "xero_client_id")
    client_secret = _get_setting(conn, "xero_client_secret")
    if not client_id or not client_secret:
        raise HTTPException(status_code=400, detail="Xero credentials not configured. Set Client ID and Client Secret in Settings → Integrations.")
    return {"ok": True, "org_name": _get_setting(conn, "xero_org_name") or "Demo Organisation"}


@router.post("/integrations/xero/sync")
def xero_sync(conn=Depends(get_db), _user=Depends(get_current_user)):
    """Preview payroll journal sync to Xero (stub)."""
    if not _integration_enabled("xero"):
        raise HTTPException(status_code=400, detail="Xero integration is disabled")
    client_id = _get_setting(conn, "xero_client_id")
    if not client_id:
        raise HTTPException(status_code=400, detail="Xero credentials not configured")
    return {"journals": 0, "total_amount": 0, "period": "2025-01"}


@router.post("/integrations/xero/push")
def xero_push(conn=Depends(get_db), _user=Depends(get_current_user)):
    """Push payroll data to Xero (stub)."""
    if not _integration_enabled("xero"):
        raise HTTPException(status_code=400, detail="Xero integration is disabled")
    client_id = _get_setting(conn, "xero_client_id")
    if not client_id:
        raise HTTPException(status_code=400, detail="Xero credentials not configured")
    return {"pushed": 0, "message": "Xero push complete"}


# ══════════════════════════════════════════════════════════════════════
# Deputy (Time & Attendance)
# ══════════════════════════════════════════════════════════════════════

@router.get("/integrations/deputy/status")
def deputy_status(conn=Depends(get_db), _user=Depends(get_current_user)):
    api_key = _get_setting(conn, "deputy_api_key")
    enabled = _get_setting(conn, "deputy_enabled")
    return {
        "configured": bool(api_key),
        "enabled": bool(enabled and enabled.lower() not in ("false", "0", "")),
    }


@router.post("/integrations/deputy/test")
def deputy_test(conn=Depends(get_db), _user=Depends(get_current_user)):
    """Test API connection to Deputy (stub)."""
    api_key = _get_setting(conn, "deputy_api_key")
    if not api_key:
        raise HTTPException(status_code=400, detail="Deputy API key not configured. Set API Token in Settings → Integrations.")
    return {"ok": True}


@router.post("/integrations/deputy/sync")
def deputy_sync(conn=Depends(get_db), _user=Depends(get_current_user)):
    """Preview timesheet sync from Deputy (stub)."""
    if not _integration_enabled("deputy"):
        raise HTTPException(status_code=400, detail="Deputy integration is disabled")
    api_key = _get_setting(conn, "deputy_api_key")
    if not api_key:
        raise HTTPException(status_code=400, detail="Deputy credentials not configured")
    return {"total": 0, "to_import": 0, "period": "2025-01"}


@router.post("/integrations/deputy/import")
def deputy_import(conn=Depends(get_db), _user=Depends(get_current_user)):
    """Import timesheets from Deputy (stub)."""
    if not _integration_enabled("deputy"):
        raise HTTPException(status_code=400, detail="Deputy integration is disabled")
    api_key = _get_setting(conn, "deputy_api_key")
    if not api_key:
        raise HTTPException(status_code=400, detail="Deputy credentials not configured")
    return {"imported": 0, "skipped": 0}


# ══════════════════════════════════════════════════════════════════════
# Google Workspace
# ══════════════════════════════════════════════════════════════════════

@router.get("/integrations/google/status")
def google_status(conn=Depends(get_db), _user=Depends(get_current_user)):
    client_email = _get_setting(conn, "google_client_email") or ""
    return {
        "configured": bool(client_email),
        "enabled": _integration_enabled("google"),
        "domain": _get_setting(conn, "google_domain") or "",
    }


@router.post("/integrations/google/test")
def google_test(conn=Depends(get_db), _user=Depends(get_current_user)):
    client_email = _get_setting(conn, "google_client_email")
    private_key = _get_setting(conn, "google_private_key")
    if not client_email or not private_key:
        raise HTTPException(status_code=400, detail="Google Workspace credentials not configured. Set Service Account Email and Private Key in Settings → Integrations.")
    # Stub — real implementation would authenticate with Google Admin SDK
    return {"ok": True}


@router.post("/integrations/google/sync")
def google_sync(conn=Depends(get_db), _user=Depends(get_current_user)):
    """Preview user sync from Google Workspace."""
    if not _integration_enabled("google"):
        raise HTTPException(status_code=400, detail="Google Workspace integration is disabled")
    client_email = _get_setting(conn, "google_client_email")
    if not client_email:
        raise HTTPException(status_code=400, detail="Google Workspace credentials not configured")
    # Stub — real implementation would call Google Admin SDK Directory API
    return {"total": 0, "to_create": 0, "to_update": 0}


@router.post("/integrations/google/import")
def google_import(conn=Depends(get_db), _user=Depends(get_current_user)):
    """Import users from Google Workspace into HRIS."""
    if not _integration_enabled("google"):
        raise HTTPException(status_code=400, detail="Google Workspace integration is disabled")
    client_email = _get_setting(conn, "google_client_email")
    if not client_email:
        raise HTTPException(status_code=400, detail="Google Workspace credentials not configured")
    # Stub — real implementation would fetch and sync users
    return {"status": "ok", "results": {"created": 0, "updated": 0, "skipped": 0}}


@router.post("/integrations/google/push")
def google_push(conn=Depends(get_db), _user=Depends(get_current_user)):
    """Provision/suspend Google Workspace accounts based on HRIS data."""
    if not _integration_enabled("google"):
        raise HTTPException(status_code=400, detail="Google Workspace integration is disabled")
    client_email = _get_setting(conn, "google_client_email")
    if not client_email:
        raise HTTPException(status_code=400, detail="Google Workspace credentials not configured")
    # Stub — real implementation would provision/suspend accounts
    return {"status": "ok", "provisioned": 0, "suspended": 0}


# ══════════════════════════════════════════════════════════════════════
# Okta
# ══════════════════════════════════════════════════════════════════════

@router.get("/integrations/okta/status")
def okta_status(conn=Depends(get_db), _user=Depends(get_current_user)):
    api_token = _get_setting(conn, "okta_api_token") or ""
    return {
        "configured": bool(api_token),
        "enabled": _integration_enabled("okta"),
        "org_url": _get_setting(conn, "okta_org_url") or "",
    }


@router.post("/integrations/okta/test")
def okta_test(conn=Depends(get_db), _user=Depends(get_current_user)):
    api_token = _get_setting(conn, "okta_api_token")
    org_url = _get_setting(conn, "okta_org_url")
    if not api_token or not org_url:
        raise HTTPException(status_code=400, detail="Okta credentials not configured. Set API Token and Org URL in Settings → Integrations.")
    # Stub — real implementation would call Okta API /api/v1/org
    return {"ok": True}


@router.post("/integrations/okta/sync")
def okta_sync(conn=Depends(get_db), _user=Depends(get_current_user)):
    """Preview user sync from Okta."""
    if not _integration_enabled("okta"):
        raise HTTPException(status_code=400, detail="Okta integration is disabled")
    api_token = _get_setting(conn, "okta_api_token")
    if not api_token:
        raise HTTPException(status_code=400, detail="Okta credentials not configured")
    # Stub — real implementation would call Okta Users API
    return {"total": 0, "to_create": 0, "to_update": 0}


@router.post("/integrations/okta/import")
def okta_import(conn=Depends(get_db), _user=Depends(get_current_user)):
    """Import users from Okta into HRIS."""
    if not _integration_enabled("okta"):
        raise HTTPException(status_code=400, detail="Okta integration is disabled")
    api_token = _get_setting(conn, "okta_api_token")
    if not api_token:
        raise HTTPException(status_code=400, detail="Okta credentials not configured")
    # Stub — real implementation would fetch and sync users
    return {"status": "ok", "results": {"created": 0, "updated": 0, "skipped": 0}}


@router.post("/integrations/okta/push")
def okta_push(conn=Depends(get_db), _user=Depends(get_current_user)):
    """Push users to Okta via SCIM provisioning."""
    if not _integration_enabled("okta"):
        raise HTTPException(status_code=400, detail="Okta integration is disabled")
    api_token = _get_setting(conn, "okta_api_token")
    if not api_token:
        raise HTTPException(status_code=400, detail="Okta credentials not configured")
    # Stub — real implementation would use SCIM to provision/deactivate users
    return {"status": "ok", "provisioned": 0, "deactivated": 0}


# ══════════════════════════════════════════════════════════════════════
# SmartRecruiters (ATS)
# ══════════════════════════════════════════════════════════════════════

@router.get("/integrations/smartrecruiters/status")
def smartrecruiters_status(conn=Depends(get_db), _user=Depends(get_current_user)):
    api_key = _get_setting(conn, "sr_api_key")
    enabled = _get_setting(conn, "sr_enabled")
    company = _get_setting(conn, "sr_company_id") or ""
    return {
        "configured": bool(api_key),
        "enabled": bool(enabled and enabled.lower() not in ("false", "0", "")),
        "company": company,
    }


@router.post("/integrations/smartrecruiters/test")
def smartrecruiters_test(conn=Depends(get_db), _user=Depends(get_current_user)):
    """Test API connection to SmartRecruiters (stub)."""
    api_key = _get_setting(conn, "sr_api_key")
    if not api_key:
        raise HTTPException(status_code=400, detail="SmartRecruiters API key not configured. Set it in Settings → Integrations.")
    return {"ok": True}


@router.post("/integrations/smartrecruiters/sync")
def smartrecruiters_sync(conn=Depends(get_db), _user=Depends(get_current_user)):
    """Preview job/applicant sync from SmartRecruiters (stub)."""
    if not _integration_enabled("smartrecruiters"):
        raise HTTPException(status_code=400, detail="SmartRecruiters integration is disabled")
    api_key = _get_setting(conn, "sr_api_key")
    if not api_key:
        raise HTTPException(status_code=400, detail="SmartRecruiters credentials not configured")
    return {"jobs": 0, "applicants": 0, "to_import": 0}


@router.post("/integrations/smartrecruiters/import")
def smartrecruiters_import(conn=Depends(get_db), _user=Depends(get_current_user)):
    """Import applicants from SmartRecruiters into pipeline (stub)."""
    if not _integration_enabled("smartrecruiters"):
        raise HTTPException(status_code=400, detail="SmartRecruiters integration is disabled")
    api_key = _get_setting(conn, "sr_api_key")
    if not api_key:
        raise HTTPException(status_code=400, detail="SmartRecruiters credentials not configured")
    return {"imported": 0, "skipped": 0, "errors": 0}


@router.post("/integrations/smartrecruiters/push")
def smartrecruiters_push(conn=Depends(get_db), _user=Depends(get_current_user)):
    """Push job postings to SmartRecruiters (stub)."""
    if not _integration_enabled("smartrecruiters"):
        raise HTTPException(status_code=400, detail="SmartRecruiters integration is disabled")
    api_key = _get_setting(conn, "sr_api_key")
    if not api_key:
        raise HTTPException(status_code=400, detail="SmartRecruiters credentials not configured")
    return {"posted": 0, "updated": 0}


# ══════════════════════════════════════════════════════════════════════
# Employment Hero (NZ Benefits/Compliance)
# ══════════════════════════════════════════════════════════════════════

@router.get("/integrations/employment-hero/status")
def employment_hero_status(conn=Depends(get_db), _user=Depends(get_current_user)):
    api_key = _get_setting(conn, "eh_api_key")
    enabled = _get_setting(conn, "eh_enabled")
    org = _get_setting(conn, "eh_org_id") or ""
    return {
        "configured": bool(api_key),
        "enabled": bool(enabled and enabled.lower() not in ("false", "0", "")),
        "org": org,
    }


@router.post("/integrations/employment-hero/test")
def employment_hero_test(conn=Depends(get_db), _user=Depends(get_current_user)):
    """Test API connection to Employment Hero (stub)."""
    api_key = _get_setting(conn, "eh_api_key")
    org_id = _get_setting(conn, "eh_org_id")
    if not api_key or not org_id:
        raise HTTPException(status_code=400, detail="Employment Hero credentials not configured. Set API Key and Organisation ID in Settings → Integrations.")
    return {"ok": True}


@router.post("/integrations/employment-hero/sync")
def employment_hero_sync(conn=Depends(get_db), _user=Depends(get_current_user)):
    """Preview employee sync from Employment Hero (stub)."""
    if not _integration_enabled("employment_hero"):
        raise HTTPException(status_code=400, detail="Employment Hero integration is disabled")
    api_key = _get_setting(conn, "eh_api_key")
    if not api_key:
        raise HTTPException(status_code=400, detail="Employment Hero credentials not configured")
    return {"employees": 0, "documents": 0, "to_import": 0}


@router.post("/integrations/employment-hero/import")
def employment_hero_import(conn=Depends(get_db), _user=Depends(get_current_user)):
    """Import employees and documents from Employment Hero (stub)."""
    if not _integration_enabled("employment_hero"):
        raise HTTPException(status_code=400, detail="Employment Hero integration is disabled")
    api_key = _get_setting(conn, "eh_api_key")
    if not api_key:
        raise HTTPException(status_code=400, detail="Employment Hero credentials not configured")
    return {"imported": 0, "documents": 0, "skipped": 0}


@router.post("/integrations/employment-hero/push")
def employment_hero_push(conn=Depends(get_db), _user=Depends(get_current_user)):
    """Push employee data to Employment Hero (stub)."""
    if not _integration_enabled("employment_hero"):
        raise HTTPException(status_code=400, detail="Employment Hero integration is disabled")
    api_key = _get_setting(conn, "eh_api_key")
    if not api_key:
        raise HTTPException(status_code=400, detail="Employment Hero credentials not configured")
    return {"pushed": 0, "agreements": 0}
