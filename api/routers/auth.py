import json
import os
import smtplib
from email.mime.text import MIMEText
import jwt
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from ..db import get_connection, new_id, now_iso
from ..deps import JWT_SECRET, JWT_ALGORITHM, get_db, get_current_user, ALL_MODULES

router = APIRouter()

SMTP_HOST = os.environ.get("SMTP_HOST", "")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASS = os.environ.get("SMTP_PASS", "")
EMAIL_FROM = os.environ.get("EMAIL_FROM", "")
DEFAULT_ADMIN_EMAIL = os.environ.get("DEFAULT_ADMIN_EMAIL", "")


def send_login_email(to_email: str, login_url: str):
    """Send the magic login link via SMTP. Falls back to console if SMTP not configured."""
    if not SMTP_HOST or not SMTP_USER:
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
    msg["From"] = EMAIL_FROM or SMTP_USER
    msg["To"] = to_email

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(msg["From"], [to_email], msg.as_string())
        print(f"  Login email sent to {to_email}")
    except Exception as e:
        print(f"  SMTP failed ({e}), printing link to console:")
        print(f"  {login_url}")


class RequestLinkBody(BaseModel):
    email: str


@router.post("/request-link")
def request_link(body: RequestLinkBody, conn=Depends(get_db)):
    # Auto-create user if they don't exist (first user or default admin becomes admin)
    row = conn.execute("SELECT * FROM users WHERE email = ?", (body.email,)).fetchone()
    if not row:
        user_count = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        is_default_admin = body.email == DEFAULT_ADMIN_EMAIL
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
    token = jwt.encode({"sub": row["id"], "type": "login"}, JWT_SECRET, algorithm=JWT_ALGORITHM)
    login_url = f"http://localhost:5183/verify?token={token}"
    send_login_email(body.email, login_url)

    return {"ok": True}


@router.get("/verify")
def verify(token: str):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    # Issue a session JWT
    session_jwt = jwt.encode({"sub": payload["sub"]}, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return {"jwt": session_jwt}


@router.get("/me")
def me(user=Depends(get_current_user)):
    return user
