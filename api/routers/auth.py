import json
import os
import smtplib
import urllib.request
from datetime import datetime, timedelta, timezone
from email.mime.text import MIMEText
import jwt
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from ..db import get_connection, new_id, now_iso
from ..deps import JWT_SECRET, JWT_ALGORITHM, get_db, get_current_user, ALL_MODULES

router = APIRouter()


def _smtp_cfg():
    """Read SMTP config at call time so .env is already loaded."""
    return {
        "host": os.environ.get("SMTP_HOST", ""),
        "port": int(os.environ.get("SMTP_PORT", "587")),
        "user": os.environ.get("SMTP_USER", ""),
        "password": os.environ.get("SMTP_PASS", ""),
        "from_addr": os.environ.get("EMAIL_FROM", "") or os.environ.get("SMTP_USER", ""),
    }


def send_login_email(to_email: str, login_url: str):
    """Send the magic login link via SMTP. Falls back to console if SMTP not configured."""
    cfg = _smtp_cfg()

    if not cfg["host"] or not cfg["user"]:
        print(f"\n{'='*60}")
        print(f"  Login link for {to_email}:")
        print(f"  {login_url}")
        print(f"{'='*60}\n")
        return

    msg = MIMEText(
        f"Click here to sign in to HRIS:\n\n{login_url}\n\nThis link is valid for one use.",
        "plain",
    )
    msg["Subject"] = "HRIS Login Link"
    msg["From"] = cfg["from_addr"]
    msg["To"] = to_email

    try:
        with smtplib.SMTP(cfg["host"], cfg["port"]) as server:
            server.starttls()
            server.login(cfg["user"], cfg["password"])
            server.sendmail(msg["From"], [to_email], msg.as_string())
        print(f"  Login email sent to {to_email}")
    except Exception as e:
        print(f"  SMTP failed ({e}), printing link to console:")
        print(f"  {login_url}")


class RequestLinkBody(BaseModel):
    email: str


@router.post("/request-link")
def request_link(body: RequestLinkBody, request: Request, conn=Depends(get_db)):
    # Auto-create user if they don't exist (first user or default admin becomes admin)
    row = conn.execute("SELECT * FROM users WHERE email = ?", (body.email,)).fetchone()
    if not row:
        user_count = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        is_default_admin = body.email == os.environ.get("DEFAULT_ADMIN_EMAIL", "")
        ts = now_iso()
        user_id = new_id()
        role = "admin" if (user_count == 0 or is_default_admin) else "member"
        permissions = json.dumps(ALL_MODULES) if role == "admin" else json.dumps([])
        name = body.email.split("@")[0].replace(".", " ").title()
        conn.execute(
            "INSERT INTO users (id, name, email, role, permissions, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (user_id, name, body.email, role, permissions, ts, ts),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()

    # Generate token and send via email (or console fallback)
    token = jwt.encode({"sub": row["id"], "type": "login", "exp": datetime.now(timezone.utc) + timedelta(minutes=15)}, JWT_SECRET, algorithm=JWT_ALGORITHM)
    base_url = os.environ.get("APP_BASE_URL", "")
    if not base_url:
        origin = request.headers.get("origin", "")
        base_url = origin or "http://localhost:5183"
    login_url = f"{base_url}/verify?token={token}"
    send_login_email(body.email, login_url)

    return {"ok": True}


@router.get("/verify")
def verify(token: str):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    # Issue a session JWT (7 day expiry)
    session_jwt = jwt.encode({"sub": payload["sub"], "exp": datetime.now(timezone.utc) + timedelta(days=7)}, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return {"jwt": session_jwt}


@router.get("/sso-callback", response_class=HTMLResponse)
def sso_callback(code: str = Query(...), conn=Depends(get_db)):
    """SSO callback from Control Tower — exchange code for local JWT."""
    try:
        req = urllib.request.Request(
            f"http://localhost:9000/api/sso/token?code={code}",
            method="POST", headers={"Content-Type": "application/json"}, data=b"",
        )
        resp = urllib.request.urlopen(req, timeout=5)
        data = json.loads(resp.read())
    except Exception:
        raise HTTPException(401, "SSO token exchange failed")

    email = data.get("email", "")
    row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    if not row:
        # Auto-create user from tower SSO
        ts = now_iso()
        user_id = new_id()
        name = email.split("@")[0].replace(".", " ").title()
        is_default_admin = email == os.environ.get("DEFAULT_ADMIN_EMAIL", "")
        user_count = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        role = "admin" if (user_count == 0 or is_default_admin) else "member"
        permissions = json.dumps(ALL_MODULES) if role == "admin" else json.dumps([])
        conn.execute(
            "INSERT INTO users (id, name, email, role, permissions, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (user_id, name, email, role, permissions, ts, ts),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()

    session_jwt = jwt.encode(
        {"sub": row["id"], "exp": datetime.now(timezone.utc) + timedelta(days=7)},
        JWT_SECRET, algorithm=JWT_ALGORITHM,
    )
    return HTMLResponse(
        f"<html><body><script>"
        f"localStorage.setItem('hris_jwt','{session_jwt}');"
        f"window.location.href='/';"
        f"</script></body></html>"
    )


@router.get("/me")
def me(user=Depends(get_current_user)):
    return user
