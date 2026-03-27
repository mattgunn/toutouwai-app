import json
from fastapi import APIRouter, Depends
from ..db import new_id, now_iso
from ..deps import get_db, get_current_user

router = APIRouter()


@router.get("/settings")
def get_settings(conn=Depends(get_db), _user=Depends(get_current_user)):
    rows = conn.execute("SELECT key, value FROM settings").fetchall()
    result = {}
    for row in rows:
        try:
            result[row["key"]] = json.loads(row["value"])
        except (json.JSONDecodeError, TypeError):
            result[row["key"]] = row["value"]
    return result


@router.put("/settings")
def update_settings(body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    for key, value in body.items():
        val_str = json.dumps(value) if not isinstance(value, str) else value
        conn.execute(
            "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?",
            (key, val_str, val_str),
        )
    conn.commit()
    return get_settings(conn=conn, _user=_user)


@router.get("/settings/users")
def list_users(conn=Depends(get_db), _user=Depends(get_current_user)):
    rows = conn.execute("SELECT * FROM users ORDER BY created_at").fetchall()
    return [dict(row) for row in rows]


@router.post("/settings/users")
def create_user(body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    ts = now_iso()
    user_id = new_id()
    conn.execute(
        "INSERT INTO users (id, name, email, role, permissions, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (user_id, body.get("name", ""), body["email"], body.get("role", "member"),
         json.dumps(body.get("permissions", [])), ts, ts),
    )
    conn.commit()
    return dict(conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone())


@router.put("/settings/users/{user_id}")
def update_user(user_id: str, body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    updates = []
    values = []
    for field in ["name", "email", "role", "is_active"]:
        if field in body:
            updates.append(f"{field} = ?")
            values.append(body[field])
    if "permissions" in body:
        updates.append("permissions = ?")
        values.append(json.dumps(body["permissions"]))
    if updates:
        updates.append("updated_at = ?")
        values.append(now_iso())
        values.append(user_id)
        conn.execute(f"UPDATE users SET {', '.join(updates)} WHERE id = ?", values)
        conn.commit()
    return dict(conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone())
