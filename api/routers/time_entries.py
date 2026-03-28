from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from ..db import new_id, now_iso
from ..deps import get_db, get_current_user

router = APIRouter()


@router.get("/time-entries")
def list_time_entries(
    employee_id: str = "",
    date_from: str = "",
    date_to: str = "",
    conn=Depends(get_db),
    _user=Depends(get_current_user),
):
    conditions, params = [], []
    if employee_id:
        conditions.append("t.employee_id = ?")
        params.append(employee_id)
    if date_from:
        conditions.append("t.date >= ?")
        params.append(date_from)
    if date_to:
        conditions.append("t.date <= ?")
        params.append(date_to)
    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    rows = conn.execute(f"""
        SELECT t.*, e.first_name || ' ' || e.last_name as employee_name
        FROM time_entries t
        JOIN employees e ON t.employee_id = e.id
        {where}
        ORDER BY t.date DESC, t.created_at DESC
    """, params).fetchall()
    return [dict(r) for r in rows]


@router.post("/time-entries")
def create_time_entry(body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    # Validate employee_id exists
    if not body.get("employee_id"):
        raise HTTPException(status_code=400, detail="employee_id is required")
    emp = conn.execute("SELECT id FROM employees WHERE id = ?", (body["employee_id"],)).fetchone()
    if not emp:
        raise HTTPException(status_code=400, detail="employee_id does not exist")

    # Validate date is a valid date string
    if not body.get("date"):
        raise HTTPException(status_code=400, detail="date is required")
    try:
        datetime.strptime(body["date"], "%Y-%m-%d")
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="date must be a valid date in YYYY-MM-DD format")

    # Validate hours
    hours = body.get("hours")
    if hours is None:
        raise HTTPException(status_code=400, detail="hours is required")
    try:
        hours_val = float(hours)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="hours must be a number")
    if hours_val < 0 or hours_val > 24:
        raise HTTPException(status_code=400, detail="hours must be between 0 and 24")

    ts = now_iso()
    tid = new_id()
    conn.execute("""
        INSERT INTO time_entries (id, employee_id, date, hours, project, description, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (tid, body["employee_id"], body["date"], body["hours"],
          body.get("project"), body.get("description"), ts, ts))
    conn.commit()
    row = conn.execute("""
        SELECT t.*, e.first_name || ' ' || e.last_name as employee_name
        FROM time_entries t JOIN employees e ON t.employee_id = e.id WHERE t.id = ?
    """, (tid,)).fetchone()
    return dict(row)


@router.put("/time-entries/{entry_id}")
def update_time_entry(entry_id: str, body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    updates, values = [], []
    for f in ["date", "hours", "project", "description"]:
        if f in body:
            updates.append(f"{f} = ?")
            values.append(body[f])
    if updates:
        updates.append("updated_at = ?")
        values.extend([now_iso(), entry_id])
        conn.execute(f"UPDATE time_entries SET {', '.join(updates)} WHERE id = ?", values)
        conn.commit()
    row = conn.execute("""
        SELECT t.*, e.first_name || ' ' || e.last_name as employee_name
        FROM time_entries t JOIN employees e ON t.employee_id = e.id WHERE t.id = ?
    """, (entry_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Time entry not found")
    return dict(row)


@router.delete("/time-entries/{entry_id}")
def delete_time_entry(entry_id: str, conn=Depends(get_db), _user=Depends(get_current_user)):
    conn.execute("DELETE FROM time_entries WHERE id = ?", (entry_id,))
    conn.commit()
    return {"ok": True}
