from fastapi import APIRouter, Depends, HTTPException
from ..db import new_id, now_iso
from ..deps import get_db, get_current_user

router = APIRouter()


# --- Courses ---

@router.get("/learning/courses")
def list_courses(conn=Depends(get_db), _user=Depends(get_current_user)):
    rows = conn.execute("""
        SELECT c.*,
               (SELECT COUNT(*) FROM course_enrollments ce WHERE ce.course_id = c.id) as enrollment_count
        FROM courses c
        ORDER BY c.created_at DESC
    """).fetchall()
    return [dict(r) for r in rows]


@router.post("/learning/courses")
def create_course(body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    if not body.get("title"):
        raise HTTPException(status_code=400, detail="title is required")
    ts = now_iso()
    cid = new_id()
    conn.execute("""
        INSERT INTO courses (id, title, description, category, format, duration_hours, provider, is_mandatory, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (cid, body["title"], body.get("description"), body.get("category", "general"),
          body.get("format", "online"), body.get("duration_hours", 1), body.get("provider"),
          body.get("is_mandatory", 0), body.get("is_active", 1), ts, ts))
    conn.commit()
    row = conn.execute("""
        SELECT c.*,
               (SELECT COUNT(*) FROM course_enrollments ce WHERE ce.course_id = c.id) as enrollment_count
        FROM courses c WHERE c.id = ?
    """, (cid,)).fetchone()
    return dict(row)


@router.put("/learning/courses/{course_id}")
def update_course(course_id: str, body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    fields = ["title", "description", "category", "format", "duration_hours", "provider", "is_mandatory", "is_active"]
    updates, values = [], []
    for f in fields:
        if f in body:
            updates.append(f"{f} = ?")
            values.append(body[f])
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    updates.append("updated_at = ?")
    values.append(now_iso())
    values.append(course_id)
    conn.execute(f"UPDATE courses SET {', '.join(updates)} WHERE id = ?", values)
    conn.commit()
    row = conn.execute("""
        SELECT c.*,
               (SELECT COUNT(*) FROM course_enrollments ce WHERE ce.course_id = c.id) as enrollment_count
        FROM courses c WHERE c.id = ?
    """, (course_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Course not found")
    return dict(row)


@router.delete("/learning/courses/{course_id}")
def delete_course(course_id: str, conn=Depends(get_db), _user=Depends(get_current_user)):
    conn.execute("DELETE FROM course_enrollments WHERE course_id = ?", (course_id,))
    conn.execute("DELETE FROM courses WHERE id = ?", (course_id,))
    conn.commit()
    return {"ok": True}


# --- Enrollments ---

@router.get("/learning/enrollments")
def list_enrollments(
    employee_id: str | None = None,
    course_id: str | None = None,
    status: str | None = None,
    conn=Depends(get_db),
    _user=Depends(get_current_user),
):
    query = """
        SELECT ce.*,
               e.first_name || ' ' || e.last_name as employee_name,
               c.title as course_title
        FROM course_enrollments ce
        JOIN employees e ON ce.employee_id = e.id
        JOIN courses c ON ce.course_id = c.id
    """
    conditions, params = [], []
    if employee_id:
        conditions.append("ce.employee_id = ?")
        params.append(employee_id)
    if course_id:
        conditions.append("ce.course_id = ?")
        params.append(course_id)
    if status:
        conditions.append("ce.status = ?")
        params.append(status)
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    query += " ORDER BY ce.created_at DESC"
    rows = conn.execute(query, params).fetchall()
    return [dict(r) for r in rows]


@router.post("/learning/enrollments")
def create_enrollment(body: dict, conn=Depends(get_db), user=Depends(get_current_user)):
    if not body.get("employee_id"):
        raise HTTPException(status_code=400, detail="employee_id is required")
    if not body.get("course_id"):
        raise HTTPException(status_code=400, detail="course_id is required")
    # Validate FK references
    if not conn.execute("SELECT id FROM employees WHERE id = ?", (body["employee_id"],)).fetchone():
        raise HTTPException(status_code=400, detail="employee_id does not exist")
    if not conn.execute("SELECT id FROM courses WHERE id = ?", (body["course_id"],)).fetchone():
        raise HTTPException(status_code=400, detail="course_id does not exist")
    ts = now_iso()
    eid = new_id()
    conn.execute("""
        INSERT INTO course_enrollments (id, course_id, employee_id, status, assigned_by, assigned_at, started_at, completed_at, score, certificate_url, due_date, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (eid, body["course_id"], body["employee_id"], body.get("status", "assigned"),
          user["id"], ts, body.get("started_at"), body.get("completed_at"),
          body.get("score"), body.get("certificate_url"), body.get("due_date"), ts, ts))
    conn.commit()
    row = conn.execute("""
        SELECT ce.*,
               e.first_name || ' ' || e.last_name as employee_name,
               c.title as course_title
        FROM course_enrollments ce
        JOIN employees e ON ce.employee_id = e.id
        JOIN courses c ON ce.course_id = c.id
        WHERE ce.id = ?
    """, (eid,)).fetchone()
    return dict(row)


@router.put("/learning/enrollments/{enrollment_id}")
def update_enrollment(enrollment_id: str, body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    fields = ["status", "score", "completed_at", "started_at", "due_date", "certificate_url"]
    updates, values = [], []
    for f in fields:
        if f in body:
            updates.append(f"{f} = ?")
            values.append(body[f])
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    updates.append("updated_at = ?")
    values.append(now_iso())
    values.append(enrollment_id)
    conn.execute(f"UPDATE course_enrollments SET {', '.join(updates)} WHERE id = ?", values)
    conn.commit()
    row = conn.execute("""
        SELECT ce.*,
               e.first_name || ' ' || e.last_name as employee_name,
               c.title as course_title
        FROM course_enrollments ce
        JOIN employees e ON ce.employee_id = e.id
        JOIN courses c ON ce.course_id = c.id
        WHERE ce.id = ?
    """, (enrollment_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    return dict(row)


# --- Certifications ---

@router.get("/learning/certifications")
def list_certifications(
    employee_id: str | None = None,
    conn=Depends(get_db),
    _user=Depends(get_current_user),
):
    query = """
        SELECT cert.*,
               e.first_name || ' ' || e.last_name as employee_name
        FROM certifications cert
        JOIN employees e ON cert.employee_id = e.id
    """
    params = []
    if employee_id:
        query += " WHERE cert.employee_id = ?"
        params.append(employee_id)
    query += " ORDER BY cert.created_at DESC"
    rows = conn.execute(query, params).fetchall()
    return [dict(r) for r in rows]


@router.post("/learning/certifications")
def create_certification(body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    if not body.get("employee_id"):
        raise HTTPException(status_code=400, detail="employee_id is required")
    if not body.get("name"):
        raise HTTPException(status_code=400, detail="name is required")
    if not conn.execute("SELECT id FROM employees WHERE id = ?", (body["employee_id"],)).fetchone():
        raise HTTPException(status_code=400, detail="employee_id does not exist")
    ts = now_iso()
    cid = new_id()
    conn.execute("""
        INSERT INTO certifications (id, employee_id, name, issuer, issue_date, expiry_date, credential_id, credential_url, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (cid, body["employee_id"], body["name"], body.get("issuer"),
          body.get("issue_date"), body.get("expiry_date"), body.get("credential_id"),
          body.get("credential_url"), ts, ts))
    conn.commit()
    row = conn.execute("""
        SELECT cert.*,
               e.first_name || ' ' || e.last_name as employee_name
        FROM certifications cert
        JOIN employees e ON cert.employee_id = e.id
        WHERE cert.id = ?
    """, (cid,)).fetchone()
    return dict(row)


@router.put("/learning/certifications/{cert_id}")
def update_certification(cert_id: str, body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    fields = ["name", "issuer", "issue_date", "expiry_date", "credential_id", "credential_url"]
    updates, values = [], []
    for f in fields:
        if f in body:
            updates.append(f"{f} = ?")
            values.append(body[f])
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    updates.append("updated_at = ?")
    values.append(now_iso())
    values.append(cert_id)
    conn.execute(f"UPDATE certifications SET {', '.join(updates)} WHERE id = ?", values)
    conn.commit()
    row = conn.execute("""
        SELECT cert.*,
               e.first_name || ' ' || e.last_name as employee_name
        FROM certifications cert
        JOIN employees e ON cert.employee_id = e.id
        WHERE cert.id = ?
    """, (cert_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Certification not found")
    return dict(row)


@router.delete("/learning/certifications/{cert_id}")
def delete_certification(cert_id: str, conn=Depends(get_db), _user=Depends(get_current_user)):
    conn.execute("DELETE FROM certifications WHERE id = ?", (cert_id,))
    conn.commit()
    return {"ok": True}
