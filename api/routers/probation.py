from fastapi import APIRouter, Depends, HTTPException
from ..db import new_id, now_iso
from ..deps import get_db, get_current_user

router = APIRouter()


@router.get("/probation")
def list_probations(
    employee_id: str | None = None,
    status: str | None = None,
    conn=Depends(get_db),
    _user=Depends(get_current_user),
):
    query = """
        SELECT p.*, e.first_name || ' ' || e.last_name as employee_name
        FROM probation_periods p
        JOIN employees e ON p.employee_id = e.id
    """
    conditions, params = [], []
    if employee_id:
        conditions.append("p.employee_id = ?")
        params.append(employee_id)
    if status:
        conditions.append("p.status = ?")
        params.append(status)
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    query += " ORDER BY p.created_at DESC"
    rows = conn.execute(query, params).fetchall()
    return [dict(r) for r in rows]


@router.get("/probation/{probation_id}")
def get_probation(probation_id: str, conn=Depends(get_db), _user=Depends(get_current_user)):
    row = conn.execute("""
        SELECT p.*, e.first_name || ' ' || e.last_name as employee_name
        FROM probation_periods p
        JOIN employees e ON p.employee_id = e.id
        WHERE p.id = ?
    """, (probation_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Probation record not found")
    return dict(row)


@router.post("/probation")
def create_probation(body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    if not body.get("employee_id"):
        raise HTTPException(status_code=400, detail="employee_id is required")
    if not body.get("start_date"):
        raise HTTPException(status_code=400, detail="start_date is required")
    if not body.get("end_date"):
        raise HTTPException(status_code=400, detail="end_date is required")
    if not conn.execute("SELECT id FROM employees WHERE id = ?", (body["employee_id"],)).fetchone():
        raise HTTPException(status_code=400, detail="employee_id does not exist")
    ts = now_iso()
    pid = new_id()
    conn.execute("""
        INSERT INTO probation_periods (id, employee_id, start_date, end_date, status, review_date, reviewer_id, notes, outcome, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (pid, body["employee_id"], body["start_date"], body["end_date"],
          body.get("status", "active"), body.get("review_date"), body.get("reviewer_id"),
          body.get("notes"), body.get("outcome"), ts, ts))
    conn.commit()
    row = conn.execute("""
        SELECT p.*, e.first_name || ' ' || e.last_name as employee_name
        FROM probation_periods p
        JOIN employees e ON p.employee_id = e.id
        WHERE p.id = ?
    """, (pid,)).fetchone()
    return dict(row)


@router.put("/probation/{probation_id}")
def update_probation(probation_id: str, body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    fields = ["start_date", "end_date", "status", "review_date", "reviewer_id", "notes", "outcome"]
    updates, values = [], []
    for f in fields:
        if f in body:
            updates.append(f"{f} = ?")
            values.append(body[f])
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    updates.append("updated_at = ?")
    values.append(now_iso())
    values.append(probation_id)
    conn.execute(f"UPDATE probation_periods SET {', '.join(updates)} WHERE id = ?", values)
    conn.commit()
    row = conn.execute("""
        SELECT p.*, e.first_name || ' ' || e.last_name as employee_name
        FROM probation_periods p
        JOIN employees e ON p.employee_id = e.id
        WHERE p.id = ?
    """, (probation_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Probation record not found")
    return dict(row)


@router.delete("/probation/{probation_id}")
def delete_probation(probation_id: str, conn=Depends(get_db), _user=Depends(get_current_user)):
    conn.execute("DELETE FROM probation_periods WHERE id = ?", (probation_id,))
    conn.commit()
    return {"ok": True}
