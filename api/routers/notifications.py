from fastapi import APIRouter, Depends, HTTPException
from ..db import new_id, now_iso
from ..deps import get_db, get_current_user

router = APIRouter()


@router.get("/notifications")
def list_notifications(
    user_id: str | None = None,
    is_read: int | None = None,
    conn=Depends(get_db),
    _user=Depends(get_current_user),
):
    query = "SELECT * FROM notifications"
    conditions, params = [], []
    if user_id:
        conditions.append("user_id = ?")
        params.append(user_id)
    if is_read is not None:
        conditions.append("is_read = ?")
        params.append(is_read)
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    query += " ORDER BY created_at DESC"
    rows = conn.execute(query, params).fetchall()
    return [dict(r) for r in rows]


@router.get("/notifications/unread-count")
def unread_count(conn=Depends(get_db), user=Depends(get_current_user)):
    row = conn.execute(
        "SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0",
        (user["id"],),
    ).fetchone()
    return {"count": row["count"]}


@router.post("/notifications")
def create_notification(body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    if not body.get("user_id"):
        raise HTTPException(status_code=400, detail="user_id is required")
    if not body.get("title"):
        raise HTTPException(status_code=400, detail="title is required")
    if not body.get("message"):
        raise HTTPException(status_code=400, detail="message is required")
    if not conn.execute("SELECT id FROM users WHERE id = ?", (body["user_id"],)).fetchone():
        raise HTTPException(status_code=400, detail="user_id does not exist")
    ts = now_iso()
    nid = new_id()
    conn.execute("""
        INSERT INTO notifications (id, user_id, title, message, type, entity_type, entity_id, is_read, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
    """, (nid, body["user_id"], body["title"], body["message"],
          body.get("type", "info"), body.get("entity_type"), body.get("entity_id"), ts))
    conn.commit()
    row = conn.execute("SELECT * FROM notifications WHERE id = ?", (nid,)).fetchone()
    return dict(row)


@router.put("/notifications/{notification_id}/read")
def mark_as_read(notification_id: str, conn=Depends(get_db), _user=Depends(get_current_user)):
    ts = now_iso()
    conn.execute(
        "UPDATE notifications SET is_read = 1, read_at = ? WHERE id = ?",
        (ts, notification_id),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM notifications WHERE id = ?", (notification_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Notification not found")
    return dict(row)


@router.put("/notifications/read-all")
def mark_all_as_read(body: dict, conn=Depends(get_db), user=Depends(get_current_user)):
    uid = body.get("user_id", user["id"])
    ts = now_iso()
    conn.execute(
        "UPDATE notifications SET is_read = 1, read_at = ? WHERE user_id = ? AND is_read = 0",
        (ts, uid),
    )
    conn.commit()
    return {"ok": True}


@router.delete("/notifications/{notification_id}")
def delete_notification(notification_id: str, conn=Depends(get_db), _user=Depends(get_current_user)):
    conn.execute("DELETE FROM notifications WHERE id = ?", (notification_id,))
    conn.commit()
    return {"ok": True}
