from fastapi import APIRouter, Depends, HTTPException
from ..db import new_id, now_iso
from ..deps import get_db, get_current_user

router = APIRouter()


@router.get("/announcements")
def list_announcements(
    category: str | None = None,
    is_active: int | None = None,
    conn=Depends(get_db),
    _user=Depends(get_current_user),
):
    query = """
        SELECT a.*, u.name as author_name
        FROM announcements a
        LEFT JOIN users u ON a.author_id = u.id
    """
    conditions, params = [], []
    if category:
        conditions.append("a.category = ?")
        params.append(category)
    if is_active is not None:
        conditions.append("a.is_active = ?")
        params.append(is_active)
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    query += " ORDER BY a.created_at DESC"
    rows = conn.execute(query, params).fetchall()
    return [dict(r) for r in rows]


@router.get("/announcements/active")
def list_active_announcements(conn=Depends(get_db), _user=Depends(get_current_user)):
    rows = conn.execute("""
        SELECT a.*, u.name as author_name
        FROM announcements a
        LEFT JOIN users u ON a.author_id = u.id
        WHERE a.is_active = 1
          AND a.status = 'published'
          AND (a.expires_at IS NULL OR a.expires_at > ?)
        ORDER BY a.priority DESC, a.created_at DESC
    """, (now_iso(),)).fetchall()
    return [dict(r) for r in rows]


@router.get("/announcements/{announcement_id}")
def get_announcement(announcement_id: str, conn=Depends(get_db), _user=Depends(get_current_user)):
    row = conn.execute("""
        SELECT a.*, u.name as author_name
        FROM announcements a
        LEFT JOIN users u ON a.author_id = u.id
        WHERE a.id = ?
    """, (announcement_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Announcement not found")
    return dict(row)


@router.post("/announcements")
def create_announcement(body: dict, conn=Depends(get_db), user=Depends(get_current_user)):
    if not body.get("title"):
        raise HTTPException(status_code=400, detail="title is required")
    if not body.get("content"):
        raise HTTPException(status_code=400, detail="content is required")
    ts = now_iso()
    aid = new_id()
    conn.execute("""
        INSERT INTO announcements (id, title, content, category, priority, status,
            is_active, author_id, expires_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (aid, body["title"], body["content"], body.get("category"),
          body.get("priority", "normal"), body.get("status", "draft"),
          body.get("is_active", 1), user["id"], body.get("expires_at"), ts, ts))
    conn.commit()
    row = conn.execute("""
        SELECT a.*, u.name as author_name
        FROM announcements a
        LEFT JOIN users u ON a.author_id = u.id
        WHERE a.id = ?
    """, (aid,)).fetchone()
    return dict(row)


@router.put("/announcements/{announcement_id}")
def update_announcement(announcement_id: str, body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    fields = ["title", "content", "category", "priority", "status", "is_active", "expires_at"]
    updates, values = [], []
    for f in fields:
        if f in body:
            updates.append(f"{f} = ?")
            values.append(body[f])
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    updates.append("updated_at = ?")
    values.append(now_iso())
    values.append(announcement_id)
    conn.execute(f"UPDATE announcements SET {', '.join(updates)} WHERE id = ?", values)
    conn.commit()
    row = conn.execute("""
        SELECT a.*, u.name as author_name
        FROM announcements a
        LEFT JOIN users u ON a.author_id = u.id
        WHERE a.id = ?
    """, (announcement_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Announcement not found")
    return dict(row)


@router.delete("/announcements/{announcement_id}")
def delete_announcement(announcement_id: str, conn=Depends(get_db), _user=Depends(get_current_user)):
    conn.execute("DELETE FROM announcements WHERE id = ?", (announcement_id,))
    conn.commit()
    return {"ok": True}
