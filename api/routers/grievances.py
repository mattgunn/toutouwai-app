from fastapi import APIRouter, Depends, HTTPException
from ..db import new_id, now_iso
from ..deps import get_db, get_current_user

router = APIRouter()


@router.get("/grievances")
def list_grievances(
    employee_id: str | None = None,
    status: str | None = None,
    priority: str | None = None,
    conn=Depends(get_db),
    _user=Depends(get_current_user),
):
    query = """
        SELECT g.*,
               e.first_name || ' ' || e.last_name as employee_name
        FROM grievances g
        JOIN employees e ON g.employee_id = e.id
    """
    conditions, params = [], []
    if employee_id:
        conditions.append("g.employee_id = ?")
        params.append(employee_id)
    if status:
        conditions.append("g.status = ?")
        params.append(status)
    if priority:
        conditions.append("g.priority = ?")
        params.append(priority)
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    query += " ORDER BY g.created_at DESC"
    rows = conn.execute(query, params).fetchall()
    return [dict(r) for r in rows]


@router.post("/grievances")
def create_grievance(body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    if not body.get("employee_id"):
        raise HTTPException(status_code=400, detail="employee_id is required")
    if not body.get("subject"):
        raise HTTPException(status_code=400, detail="subject is required")
    if not body.get("description"):
        raise HTTPException(status_code=400, detail="description is required")
    if not conn.execute("SELECT id FROM employees WHERE id = ?", (body["employee_id"],)).fetchone():
        raise HTTPException(status_code=400, detail="employee_id does not exist")
    ts = now_iso()
    gid = new_id()
    conn.execute("""
        INSERT INTO grievances (id, employee_id, subject, description, category, priority, status, assigned_to, resolution, filed_date, resolved_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (gid, body["employee_id"], body["subject"], body["description"],
          body.get("category"), body.get("priority", "medium"),
          body.get("status", "submitted"), body.get("assigned_to"),
          body.get("resolution"), body.get("filed_date", ts[:10]),
          body.get("resolved_at"), ts, ts))
    conn.commit()
    row = conn.execute("""
        SELECT g.*,
               e.first_name || ' ' || e.last_name as employee_name
        FROM grievances g
        JOIN employees e ON g.employee_id = e.id
        WHERE g.id = ?
    """, (gid,)).fetchone()
    return dict(row)


@router.put("/grievances/{grievance_id}")
def update_grievance(grievance_id: str, body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    fields = ["subject", "description", "category", "priority", "status", "assigned_to", "resolution", "filed_date", "resolved_at"]
    updates, values = [], []
    for f in fields:
        if f in body:
            updates.append(f"{f} = ?")
            values.append(body[f])
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    updates.append("updated_at = ?")
    values.extend([now_iso(), grievance_id])
    conn.execute(f"UPDATE grievances SET {', '.join(updates)} WHERE id = ?", values)
    conn.commit()
    row = conn.execute("""
        SELECT g.*,
               e.first_name || ' ' || e.last_name as employee_name
        FROM grievances g
        JOIN employees e ON g.employee_id = e.id
        WHERE g.id = ?
    """, (grievance_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Grievance not found")
    return dict(row)


@router.delete("/grievances/{grievance_id}")
def delete_grievance(grievance_id: str, conn=Depends(get_db), _user=Depends(get_current_user)):
    conn.execute("DELETE FROM grievances WHERE id = ?", (grievance_id,))
    conn.commit()
    return {"ok": True}
