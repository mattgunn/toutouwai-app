from fastapi import APIRouter, Depends, HTTPException
from ..db import new_id, now_iso
from ..deps import get_db, get_current_user

router = APIRouter()


@router.get("/notice-periods")
def list_notice_periods(
    employee_id: str | None = None,
    status: str | None = None,
    conn=Depends(get_db),
    _user=Depends(get_current_user),
):
    query = """
        SELECT np.*, e.first_name || ' ' || e.last_name as employee_name
        FROM notice_periods np
        JOIN employees e ON np.employee_id = e.id
    """
    conditions, params = [], []
    if employee_id:
        conditions.append("np.employee_id = ?")
        params.append(employee_id)
    if status:
        conditions.append("np.status = ?")
        params.append(status)
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    query += " ORDER BY np.created_at DESC"
    rows = conn.execute(query, params).fetchall()
    return [dict(r) for r in rows]


@router.get("/notice-periods/{notice_id}")
def get_notice_period(notice_id: str, conn=Depends(get_db), _user=Depends(get_current_user)):
    row = conn.execute("""
        SELECT np.*, e.first_name || ' ' || e.last_name as employee_name
        FROM notice_periods np
        JOIN employees e ON np.employee_id = e.id
        WHERE np.id = ?
    """, (notice_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Notice period not found")
    return dict(row)


@router.post("/notice-periods")
def create_notice_period(body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    if not body.get("employee_id"):
        raise HTTPException(status_code=400, detail="employee_id is required")
    if not body.get("notice_type"):
        raise HTTPException(status_code=400, detail="notice_type is required")
    if not body.get("notice_date"):
        raise HTTPException(status_code=400, detail="notice_date is required")
    if not body.get("effective_date"):
        raise HTTPException(status_code=400, detail="effective_date is required")
    if not conn.execute("SELECT id FROM employees WHERE id = ?", (body["employee_id"],)).fetchone():
        raise HTTPException(status_code=400, detail="employee_id does not exist")
    ts = now_iso()
    nid = new_id()
    conn.execute("""
        INSERT INTO notice_periods (id, employee_id, notice_type, notice_date, effective_date,
            last_working_day, notice_length_days, status, reason, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (nid, body["employee_id"], body["notice_type"], body["notice_date"],
          body["effective_date"], body.get("last_working_day"), body.get("notice_length_days"),
          body.get("status", "pending"), body.get("reason"), body.get("notes"), ts, ts))
    conn.commit()
    row = conn.execute("""
        SELECT np.*, e.first_name || ' ' || e.last_name as employee_name
        FROM notice_periods np
        JOIN employees e ON np.employee_id = e.id
        WHERE np.id = ?
    """, (nid,)).fetchone()
    return dict(row)


@router.put("/notice-periods/{notice_id}")
def update_notice_period(notice_id: str, body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    fields = ["notice_type", "notice_date", "effective_date", "last_working_day", "notice_length_days", "status", "reason", "notes"]
    updates, values = [], []
    for f in fields:
        if f in body:
            updates.append(f"{f} = ?")
            values.append(body[f])
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    updates.append("updated_at = ?")
    values.append(now_iso())
    values.append(notice_id)
    conn.execute(f"UPDATE notice_periods SET {', '.join(updates)} WHERE id = ?", values)
    conn.commit()
    row = conn.execute("""
        SELECT np.*, e.first_name || ' ' || e.last_name as employee_name
        FROM notice_periods np
        JOIN employees e ON np.employee_id = e.id
        WHERE np.id = ?
    """, (notice_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Notice period not found")
    return dict(row)


@router.delete("/notice-periods/{notice_id}")
def delete_notice_period(notice_id: str, conn=Depends(get_db), _user=Depends(get_current_user)):
    conn.execute("DELETE FROM notice_periods WHERE id = ?", (notice_id,))
    conn.commit()
    return {"ok": True}
