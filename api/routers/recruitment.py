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
