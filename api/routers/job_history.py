from fastapi import APIRouter, Depends, HTTPException
from ..db import new_id, now_iso
from ..deps import get_db, get_current_user

router = APIRouter()


@router.get("/job-history")
def list_job_history(
    employee_id: str | None = None,
    conn=Depends(get_db),
    _user=Depends(get_current_user),
):
    query = """
        SELECT jh.*,
               e.first_name || ' ' || e.last_name as employee_name,
               p.title as position_title,
               d.name as department_name,
               m.first_name || ' ' || m.last_name as manager_name
        FROM job_history jh
        JOIN employees e ON jh.employee_id = e.id
        LEFT JOIN positions p ON jh.position_id = p.id
        LEFT JOIN departments d ON jh.department_id = d.id
        LEFT JOIN employees m ON jh.manager_id = m.id
    """
    params = []
    if employee_id:
        query += " WHERE jh.employee_id = ?"
        params.append(employee_id)
    query += " ORDER BY jh.effective_date DESC"
    rows = conn.execute(query, params).fetchall()
    return [dict(r) for r in rows]


@router.post("/job-history")
def create_job_history(body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    if not body.get("employee_id"):
        raise HTTPException(status_code=400, detail="employee_id is required")
    if not body.get("effective_date"):
        raise HTTPException(status_code=400, detail="effective_date is required")
    if not conn.execute("SELECT id FROM employees WHERE id = ?", (body["employee_id"],)).fetchone():
        raise HTTPException(status_code=400, detail="employee_id does not exist")
    if body.get("position_id"):
        if not conn.execute("SELECT id FROM positions WHERE id = ?", (body["position_id"],)).fetchone():
            raise HTTPException(status_code=400, detail="position_id does not exist")
    if body.get("department_id"):
        if not conn.execute("SELECT id FROM departments WHERE id = ?", (body["department_id"],)).fetchone():
            raise HTTPException(status_code=400, detail="department_id does not exist")
    if body.get("manager_id"):
        if not conn.execute("SELECT id FROM employees WHERE id = ?", (body["manager_id"],)).fetchone():
            raise HTTPException(status_code=400, detail="manager_id does not exist")
    ts = now_iso()
    jid = new_id()
    conn.execute("""
        INSERT INTO job_history (id, employee_id, effective_date, position_id, department_id, manager_id, location, employment_type, reason, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (jid, body["employee_id"], body["effective_date"],
          body.get("position_id"), body.get("department_id"), body.get("manager_id"),
          body.get("location"), body.get("employment_type"),
          body.get("reason"), body.get("notes"), ts, ts))
    conn.commit()
    row = conn.execute("""
        SELECT jh.*,
               e.first_name || ' ' || e.last_name as employee_name,
               p.title as position_title,
               d.name as department_name,
               m.first_name || ' ' || m.last_name as manager_name
        FROM job_history jh
        JOIN employees e ON jh.employee_id = e.id
        LEFT JOIN positions p ON jh.position_id = p.id
        LEFT JOIN departments d ON jh.department_id = d.id
        LEFT JOIN employees m ON jh.manager_id = m.id
        WHERE jh.id = ?
    """, (jid,)).fetchone()
    return dict(row)


@router.put("/job-history/{record_id}")
def update_job_history(record_id: str, body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    if "position_id" in body and body["position_id"]:
        if not conn.execute("SELECT id FROM positions WHERE id = ?", (body["position_id"],)).fetchone():
            raise HTTPException(status_code=400, detail="position_id does not exist")
    if "department_id" in body and body["department_id"]:
        if not conn.execute("SELECT id FROM departments WHERE id = ?", (body["department_id"],)).fetchone():
            raise HTTPException(status_code=400, detail="department_id does not exist")
    if "manager_id" in body and body["manager_id"]:
        if not conn.execute("SELECT id FROM employees WHERE id = ?", (body["manager_id"],)).fetchone():
            raise HTTPException(status_code=400, detail="manager_id does not exist")
    fields = ["effective_date", "position_id", "department_id", "manager_id", "location", "employment_type", "reason", "notes"]
    updates, values = [], []
    for f in fields:
        if f in body:
            updates.append(f"{f} = ?")
            values.append(body[f])
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    updates.append("updated_at = ?")
    values.extend([now_iso(), record_id])
    conn.execute(f"UPDATE job_history SET {', '.join(updates)} WHERE id = ?", values)
    conn.commit()
    row = conn.execute("""
        SELECT jh.*,
               e.first_name || ' ' || e.last_name as employee_name,
               p.title as position_title,
               d.name as department_name,
               m.first_name || ' ' || m.last_name as manager_name
        FROM job_history jh
        JOIN employees e ON jh.employee_id = e.id
        LEFT JOIN positions p ON jh.position_id = p.id
        LEFT JOIN departments d ON jh.department_id = d.id
        LEFT JOIN employees m ON jh.manager_id = m.id
        WHERE jh.id = ?
    """, (record_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Job history record not found")
    return dict(row)


@router.delete("/job-history/{record_id}")
def delete_job_history(record_id: str, conn=Depends(get_db), _user=Depends(get_current_user)):
    conn.execute("DELETE FROM job_history WHERE id = ?", (record_id,))
    conn.commit()
    return {"ok": True}
