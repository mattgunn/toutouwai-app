from fastapi import APIRouter, Depends, HTTPException
from ..db import new_id, now_iso
from ..deps import get_db, get_current_user

router = APIRouter()


@router.get("/learning/prerequisites")
def list_prerequisites(
    course_id: str | None = None,
    conn=Depends(get_db),
    _user=Depends(get_current_user),
):
    query = """
        SELECT tp.*,
               c.title as course_title,
               pc.title as prerequisite_title
        FROM training_prerequisites tp
        JOIN courses c ON tp.course_id = c.id
        JOIN courses pc ON tp.prerequisite_course_id = pc.id
    """
    params = []
    if course_id:
        query += " WHERE tp.course_id = ?"
        params.append(course_id)
    query += " ORDER BY tp.created_at DESC"
    rows = conn.execute(query, params).fetchall()
    return [dict(r) for r in rows]


@router.get("/learning/prerequisites/{prereq_id}")
def get_prerequisite(prereq_id: str, conn=Depends(get_db), _user=Depends(get_current_user)):
    row = conn.execute("""
        SELECT tp.*,
               c.title as course_title,
               pc.title as prerequisite_title
        FROM training_prerequisites tp
        JOIN courses c ON tp.course_id = c.id
        JOIN courses pc ON tp.prerequisite_course_id = pc.id
        WHERE tp.id = ?
    """, (prereq_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Prerequisite not found")
    return dict(row)


@router.post("/learning/prerequisites")
def create_prerequisite(body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    if not body.get("course_id"):
        raise HTTPException(status_code=400, detail="course_id is required")
    if not body.get("prerequisite_course_id"):
        raise HTTPException(status_code=400, detail="prerequisite_course_id is required")
    if not conn.execute("SELECT id FROM courses WHERE id = ?", (body["course_id"],)).fetchone():
        raise HTTPException(status_code=400, detail="course_id does not exist")
    if not conn.execute("SELECT id FROM courses WHERE id = ?", (body["prerequisite_course_id"],)).fetchone():
        raise HTTPException(status_code=400, detail="prerequisite_course_id does not exist")
    ts = now_iso()
    pid = new_id()
    conn.execute("""
        INSERT INTO training_prerequisites (id, course_id, prerequisite_course_id, is_mandatory, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (pid, body["course_id"], body["prerequisite_course_id"],
          body.get("is_mandatory", 1), ts, ts))
    conn.commit()
    row = conn.execute("""
        SELECT tp.*,
               c.title as course_title,
               pc.title as prerequisite_title
        FROM training_prerequisites tp
        JOIN courses c ON tp.course_id = c.id
        JOIN courses pc ON tp.prerequisite_course_id = pc.id
        WHERE tp.id = ?
    """, (pid,)).fetchone()
    return dict(row)


@router.put("/learning/prerequisites/{prereq_id}")
def update_prerequisite(prereq_id: str, body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    fields = ["is_mandatory"]
    updates, values = [], []
    for f in fields:
        if f in body:
            updates.append(f"{f} = ?")
            values.append(body[f])
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    updates.append("updated_at = ?")
    values.append(now_iso())
    values.append(prereq_id)
    conn.execute(f"UPDATE training_prerequisites SET {', '.join(updates)} WHERE id = ?", values)
    conn.commit()
    row = conn.execute("""
        SELECT tp.*,
               c.title as course_title,
               pc.title as prerequisite_title
        FROM training_prerequisites tp
        JOIN courses c ON tp.course_id = c.id
        JOIN courses pc ON tp.prerequisite_course_id = pc.id
        WHERE tp.id = ?
    """, (prereq_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Prerequisite not found")
    return dict(row)


@router.delete("/learning/prerequisites/{prereq_id}")
def delete_prerequisite(prereq_id: str, conn=Depends(get_db), _user=Depends(get_current_user)):
    conn.execute("DELETE FROM training_prerequisites WHERE id = ?", (prereq_id,))
    conn.commit()
    return {"ok": True}
