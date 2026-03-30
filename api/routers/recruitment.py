from fastapi import APIRouter, Depends, HTTPException
from ..db import new_id, now_iso
from ..deps import get_db, get_current_user

router = APIRouter()


# ── Job Postings ─────────────────────────────────────────────────────

@router.get("/recruitment/postings")
def list_postings(status: str = "", conn=Depends(get_db), _user=Depends(get_current_user)):
    where, params = "", []
    if status:
        where = "WHERE jp.status = ?"
        params.append(status)
    rows = conn.execute(f"""
        SELECT jp.*, d.name as department_name,
               (SELECT COUNT(*) FROM applicants WHERE job_posting_id = jp.id) as applicant_count
        FROM job_postings jp
        LEFT JOIN departments d ON jp.department_id = d.id
        {where}
        ORDER BY jp.created_at DESC
    """, params).fetchall()
    return [dict(r) for r in rows]


@router.get("/recruitment/postings/{posting_id}")
def get_posting(posting_id: str, conn=Depends(get_db), _user=Depends(get_current_user)):
    row = conn.execute("""
        SELECT jp.*, d.name as department_name,
               (SELECT COUNT(*) FROM applicants WHERE job_posting_id = jp.id) as applicant_count
        FROM job_postings jp LEFT JOIN departments d ON jp.department_id = d.id
        WHERE jp.id = ?
    """, (posting_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Job posting not found")
    return dict(row)


@router.post("/recruitment/postings")
def create_posting(body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    ts = now_iso()
    pid = new_id()
    conn.execute("""
        INSERT INTO job_postings (id, title, department_id, description, requirements, status,
            location, employment_type, salary_min, salary_max, published_at, closes_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (pid, body["title"], body.get("department_id"), body.get("description"),
          body.get("requirements"), body.get("status", "draft"), body.get("location"),
          body.get("employment_type", "full_time"), body.get("salary_min"), body.get("salary_max"),
          body.get("published_at"), body.get("closes_at"), ts, ts))
    conn.commit()
    return get_posting(pid, conn=conn, _user=_user)


@router.put("/recruitment/postings/{posting_id}")
def update_posting(posting_id: str, body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    fields = ["title", "department_id", "description", "requirements", "status",
              "location", "employment_type", "salary_min", "salary_max", "published_at", "closes_at"]
    updates, values = [], []
    for f in fields:
        if f in body:
            updates.append(f"{f} = ?")
            values.append(body[f])
    if updates:
        updates.append("updated_at = ?")
        values.extend([now_iso(), posting_id])
        conn.execute(f"UPDATE job_postings SET {', '.join(updates)} WHERE id = ?", values)
        conn.commit()
    return get_posting(posting_id, conn=conn, _user=_user)


# ── Applicants ───────────────────────────────────────────────────────

@router.get("/recruitment/applicants")
def list_applicants(job_posting_id: str = "", stage: str = "", conn=Depends(get_db), _user=Depends(get_current_user)):
    conditions, params = [], []
    if job_posting_id:
        conditions.append("a.job_posting_id = ?")
        params.append(job_posting_id)
    if stage:
        conditions.append("a.stage = ?")
        params.append(stage)
    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    rows = conn.execute(f"""
        SELECT a.*, jp.title as job_title
        FROM applicants a
        LEFT JOIN job_postings jp ON a.job_posting_id = jp.id
        {where}
        ORDER BY a.applied_at DESC
    """, params).fetchall()
    return [dict(r) for r in rows]


@router.get("/recruitment/applicants/{applicant_id}")
def get_applicant(applicant_id: str, conn=Depends(get_db), _user=Depends(get_current_user)):
    row = conn.execute("""
        SELECT a.*, jp.title as job_title
        FROM applicants a LEFT JOIN job_postings jp ON a.job_posting_id = jp.id
        WHERE a.id = ?
    """, (applicant_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Applicant not found")
    return dict(row)


@router.post("/recruitment/applicants")
def create_applicant(body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    if not conn.execute("SELECT id FROM job_postings WHERE id = ?", (body["job_posting_id"],)).fetchone():
        raise HTTPException(status_code=400, detail="job_posting_id does not exist")
    ts = now_iso()
    aid = new_id()
    conn.execute("""
        INSERT INTO applicants (id, first_name, last_name, email, phone, job_posting_id,
            status, stage, resume_url, cover_letter, notes, rating, applied_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'applied', 'applied', ?, ?, ?, ?, ?, ?, ?)
    """, (aid, body["first_name"], body["last_name"], body["email"], body.get("phone"),
          body["job_posting_id"], body.get("resume_url"), body.get("cover_letter"),
          body.get("notes"), body.get("rating"), ts, ts, ts))
    conn.commit()
    return get_applicant(aid, conn=conn, _user=_user)


@router.put("/recruitment/applicants/{applicant_id}")
def update_applicant(applicant_id: str, body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    fields = ["first_name", "last_name", "email", "phone", "status", "stage",
              "resume_url", "cover_letter", "notes", "rating"]
    updates, values = [], []
    for f in fields:
        if f in body:
            updates.append(f"{f} = ?")
            values.append(body[f])
    if updates:
        updates.append("updated_at = ?")
        values.extend([now_iso(), applicant_id])
        conn.execute(f"UPDATE applicants SET {', '.join(updates)} WHERE id = ?", values)
        conn.commit()
    return get_applicant(applicant_id, conn=conn, _user=_user)


@router.put("/recruitment/applicants/{applicant_id}/stage")
def update_applicant_stage(applicant_id: str, body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    conn.execute(
        "UPDATE applicants SET stage = ?, updated_at = ? WHERE id = ?",
        (body["stage"], now_iso(), applicant_id),
    )
    conn.commit()
    return get_applicant(applicant_id, conn=conn, _user=_user)


@router.delete("/recruitment/postings/{posting_id}")
def delete_posting(posting_id: str, conn=Depends(get_db), _user=Depends(get_current_user)):
    conn.execute("DELETE FROM job_postings WHERE id = ?", (posting_id,))
    conn.commit()
    return {"ok": True}


@router.delete("/recruitment/applicants/{applicant_id}")
def delete_applicant(applicant_id: str, conn=Depends(get_db), _user=Depends(get_current_user)):
    conn.execute("DELETE FROM applicants WHERE id = ?", (applicant_id,))
    conn.commit()
    return {"ok": True}


# ── Interviews ──────────────────────────────────────────────────────

@router.get("/recruitment/interviews")
def list_interviews(applicant_id: str = "", conn=Depends(get_db), _user=Depends(get_current_user)):
    conditions, params = [], []
    if applicant_id:
        conditions.append("i.applicant_id = ?")
        params.append(applicant_id)
    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    rows = conn.execute(f"""
        SELECT i.*,
               a.first_name || ' ' || a.last_name as applicant_name,
               e.first_name || ' ' || e.last_name as interviewer_name
        FROM interviews i
        LEFT JOIN applicants a ON i.applicant_id = a.id
        LEFT JOIN employees e ON i.interviewer_id = e.id
        {where}
        ORDER BY i.scheduled_at DESC
    """, params).fetchall()
    return [dict(r) for r in rows]


@router.post("/recruitment/interviews")
def create_interview(body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    if not conn.execute("SELECT id FROM applicants WHERE id = ?", (body["applicant_id"],)).fetchone():
        raise HTTPException(status_code=400, detail="applicant_id does not exist")
    if body.get("interviewer_id"):
        if not conn.execute("SELECT id FROM employees WHERE id = ?", (body["interviewer_id"],)).fetchone():
            raise HTTPException(status_code=400, detail="interviewer_id does not exist")
    ts = now_iso()
    iid = new_id()
    conn.execute("""
        INSERT INTO interviews (id, applicant_id, interviewer_id, interview_type, scheduled_at,
            duration_minutes, location, notes, status, feedback, rating, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (iid, body["applicant_id"], body.get("interviewer_id"), body.get("interview_type", "phone"),
          body["scheduled_at"], body.get("duration_minutes", 60), body.get("location"),
          body.get("notes"), body.get("status", "scheduled"), body.get("feedback"),
          body.get("rating"), ts, ts))
    conn.commit()
    row = conn.execute("""
        SELECT i.*, a.first_name || ' ' || a.last_name as applicant_name,
               e.first_name || ' ' || e.last_name as interviewer_name
        FROM interviews i LEFT JOIN applicants a ON i.applicant_id = a.id
        LEFT JOIN employees e ON i.interviewer_id = e.id
        WHERE i.id = ?
    """, (iid,)).fetchone()
    return dict(row)


@router.put("/recruitment/interviews/{interview_id}")
def update_interview(interview_id: str, body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    fields = ["interviewer_id", "interview_type", "scheduled_at", "duration_minutes",
              "location", "notes", "status", "feedback", "rating"]
    updates, values = [], []
    for f in fields:
        if f in body:
            updates.append(f"{f} = ?")
            values.append(body[f])
    if updates:
        updates.append("updated_at = ?")
        values.extend([now_iso(), interview_id])
        conn.execute(f"UPDATE interviews SET {', '.join(updates)} WHERE id = ?", values)
        conn.commit()
    row = conn.execute("""
        SELECT i.*, a.first_name || ' ' || a.last_name as applicant_name,
               e.first_name || ' ' || e.last_name as interviewer_name
        FROM interviews i LEFT JOIN applicants a ON i.applicant_id = a.id
        LEFT JOIN employees e ON i.interviewer_id = e.id
        WHERE i.id = ?
    """, (interview_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Interview not found")
    return dict(row)


@router.delete("/recruitment/interviews/{interview_id}")
def delete_interview(interview_id: str, conn=Depends(get_db), _user=Depends(get_current_user)):
    conn.execute("DELETE FROM interviews WHERE id = ?", (interview_id,))
    conn.commit()
    return {"ok": True}


# ── Offers ──────────────────────────────────────────────────────────

@router.get("/recruitment/offers")
def list_offers(applicant_id: str = "", status: str = "", conn=Depends(get_db), _user=Depends(get_current_user)):
    conditions, params = [], []
    if applicant_id:
        conditions.append("o.applicant_id = ?")
        params.append(applicant_id)
    if status:
        conditions.append("o.status = ?")
        params.append(status)
    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    rows = conn.execute(f"""
        SELECT o.*,
               a.first_name || ' ' || a.last_name as applicant_name,
               jp.title as job_title,
               p.title as position_title,
               d.name as department_name
        FROM offers o
        LEFT JOIN applicants a ON o.applicant_id = a.id
        LEFT JOIN job_postings jp ON o.job_posting_id = jp.id
        LEFT JOIN positions p ON o.position_id = p.id
        LEFT JOIN departments d ON o.department_id = d.id
        {where}
        ORDER BY o.created_at DESC
    """, params).fetchall()
    return [dict(r) for r in rows]


@router.post("/recruitment/offers")
def create_offer(body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    if not conn.execute("SELECT id FROM applicants WHERE id = ?", (body["applicant_id"],)).fetchone():
        raise HTTPException(status_code=400, detail="applicant_id does not exist")
    if body.get("job_posting_id"):
        if not conn.execute("SELECT id FROM job_postings WHERE id = ?", (body["job_posting_id"],)).fetchone():
            raise HTTPException(status_code=400, detail="job_posting_id does not exist")
    if body.get("position_id"):
        if not conn.execute("SELECT id FROM positions WHERE id = ?", (body["position_id"],)).fetchone():
            raise HTTPException(status_code=400, detail="position_id does not exist")
    if body.get("department_id"):
        if not conn.execute("SELECT id FROM departments WHERE id = ?", (body["department_id"],)).fetchone():
            raise HTTPException(status_code=400, detail="department_id does not exist")
    ts = now_iso()
    oid = new_id()
    conn.execute("""
        INSERT INTO offers (id, applicant_id, job_posting_id, salary, currency, start_date,
            position_id, department_id, status, notes, sent_at, responded_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (oid, body["applicant_id"], body.get("job_posting_id"), body.get("salary"),
          body.get("currency", "NZD"), body.get("start_date"), body.get("position_id"),
          body.get("department_id"), body.get("status", "draft"), body.get("notes"),
          body.get("sent_at"), body.get("responded_at"), ts, ts))
    conn.commit()
    row = conn.execute("""
        SELECT o.*, a.first_name || ' ' || a.last_name as applicant_name,
               jp.title as job_title, p.title as position_title, d.name as department_name
        FROM offers o LEFT JOIN applicants a ON o.applicant_id = a.id
        LEFT JOIN job_postings jp ON o.job_posting_id = jp.id
        LEFT JOIN positions p ON o.position_id = p.id
        LEFT JOIN departments d ON o.department_id = d.id
        WHERE o.id = ?
    """, (oid,)).fetchone()
    return dict(row)


@router.put("/recruitment/offers/{offer_id}")
def update_offer(offer_id: str, body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    fields = ["salary", "currency", "start_date", "position_id", "department_id",
              "status", "notes", "sent_at", "responded_at"]
    updates, values = [], []
    for f in fields:
        if f in body:
            updates.append(f"{f} = ?")
            values.append(body[f])
    if updates:
        updates.append("updated_at = ?")
        values.extend([now_iso(), offer_id])
        conn.execute(f"UPDATE offers SET {', '.join(updates)} WHERE id = ?", values)
        conn.commit()
    row = conn.execute("""
        SELECT o.*, a.first_name || ' ' || a.last_name as applicant_name,
               jp.title as job_title, p.title as position_title, d.name as department_name
        FROM offers o LEFT JOIN applicants a ON o.applicant_id = a.id
        LEFT JOIN job_postings jp ON o.job_posting_id = jp.id
        LEFT JOIN positions p ON o.position_id = p.id
        LEFT JOIN departments d ON o.department_id = d.id
        WHERE o.id = ?
    """, (offer_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Offer not found")
    return dict(row)
