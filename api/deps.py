import json
import os
import jwt
from fastapi import Depends, HTTPException, Request
from .db import get_connection

JWT_SECRET = os.environ.get("JWT_SECRET", "hris-dev-secret-change-in-production")
JWT_ALGORITHM = "HS256"

ALL_MODULES = [
    "dashboard", "employees", "departments", "positions",
    "leave", "timesheets", "recruitment", "performance",
    "reports", "settings", "compensation", "benefits", "succession",
]


def get_db():
    conn = get_connection()
    try:
        yield conn
    finally:
        conn.close()


def get_current_user(request: Request, conn=Depends(get_db)):
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = auth[7:]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    row = conn.execute("SELECT * FROM users WHERE id = ? AND is_active = 1", (user_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=401, detail="User not found")

    return {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "role": row["role"],
        "is_super_admin": row["role"] == "admin",
        "permissions": json.loads(row["permissions"]),
    }


def require_admin(user=Depends(get_current_user)):
    if user["role"] != "admin" and not user["is_super_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user
