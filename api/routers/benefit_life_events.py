from fastapi import APIRouter, Depends, HTTPException
from ..db import new_id, now_iso
from ..deps import get_db, get_current_user

router = APIRouter()


@router.get("/benefits/life-events")
def list_life_events(
    employee_id: str | None = None,
    status: str | None = None,
    event_type: str | None = None,
    conn=Depends(get_db),
    _user=Depends(get_current_user),
):
    query = """
        SELECT ble.*, e.first_name || ' ' || e.last_name as employee_name
        FROM benefit_life_events ble
        JOIN employees e ON ble.employee_id = e.id
    """
    conditions, params = [], []
    if employee_id:
        conditions.append("ble.employee_id = ?")
        params.append(employee_id)
    if status:
        conditions.append("ble.status = ?")
        params.append(status)
    if event_type:
        conditions.append("ble.event_type = ?")
        params.append(event_type)
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    query += " ORDER BY ble.created_at DESC"
    rows = conn.execute(query, params).fetchall()
    return [dict(r) for r in rows]


@router.get("/benefits/life-events/{event_id}")
def get_life_event(event_id: str, conn=Depends(get_db), _user=Depends(get_current_user)):
    row = conn.execute("""
        SELECT ble.*, e.first_name || ' ' || e.last_name as employee_name
        FROM benefit_life_events ble
        JOIN employees e ON ble.employee_id = e.id
        WHERE ble.id = ?
    """, (event_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Life event not found")
    return dict(row)


@router.post("/benefits/life-events")
def create_life_event(body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    if not body.get("employee_id"):
        raise HTTPException(status_code=400, detail="employee_id is required")
    if not body.get("event_type"):
        raise HTTPException(status_code=400, detail="event_type is required")
    if not body.get("event_date"):
        raise HTTPException(status_code=400, detail="event_date is required")
    if not conn.execute("SELECT id FROM employees WHERE id = ?", (body["employee_id"],)).fetchone():
        raise HTTPException(status_code=400, detail="employee_id does not exist")
    ts = now_iso()
    eid = new_id()
    conn.execute("""
        INSERT INTO benefit_life_events (id, employee_id, event_type, event_date, description,
            status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (eid, body["employee_id"], body["event_type"], body["event_date"],
          body.get("description"), body.get("status", "pending"), ts, ts))
    conn.commit()
    row = conn.execute("""
        SELECT ble.*, e.first_name || ' ' || e.last_name as employee_name
        FROM benefit_life_events ble
        JOIN employees e ON ble.employee_id = e.id
        WHERE ble.id = ?
    """, (eid,)).fetchone()
    return dict(row)


@router.put("/benefits/life-events/{event_id}")
def update_life_event(event_id: str, body: dict, conn=Depends(get_db), user=Depends(get_current_user)):
    fields = ["event_type", "event_date", "description", "status"]
    updates, values = [], []
    for f in fields:
        if f in body:
            updates.append(f"{f} = ?")
            values.append(body[f])
    # Handle processing: when status is set to processed, record who and when
    if body.get("status") == "processed":
        updates.append("processed_by = ?")
        values.append(user["id"])
        updates.append("processed_at = ?")
        values.append(now_iso())
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    updates.append("updated_at = ?")
    values.append(now_iso())
    values.append(event_id)
    conn.execute(f"UPDATE benefit_life_events SET {', '.join(updates)} WHERE id = ?", values)
    conn.commit()
    row = conn.execute("""
        SELECT ble.*, e.first_name || ' ' || e.last_name as employee_name
        FROM benefit_life_events ble
        JOIN employees e ON ble.employee_id = e.id
        WHERE ble.id = ?
    """, (event_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Life event not found")
    return dict(row)


@router.delete("/benefits/life-events/{event_id}")
def delete_life_event(event_id: str, conn=Depends(get_db), _user=Depends(get_current_user)):
    conn.execute("DELETE FROM benefit_life_events WHERE id = ?", (event_id,))
    conn.commit()
    return {"ok": True}
