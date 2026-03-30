from fastapi import APIRouter, Depends, HTTPException
from ..db import new_id, now_iso
from ..deps import get_db, get_current_user

router = APIRouter()


@router.get("/disciplinary")
def list_disciplinary(
    employee_id: str | None = None,
    status: str | None = None,
    conn=Depends(get_db),
    _user=Depends(get_current_user),
):
    query = """
        SELECT d.*,
               e.first_name || ' ' || e.last_name as employee_name
        FROM disciplinary_actions d
        JOIN employees e ON d.employee_id = e.id
    """
    conditions, params = [], []
    if employee_id:
        conditions.append("d.employee_id = ?")
        params.append(employee_id)
    if status:
        conditions.append("d.status = ?")
        params.append(status)
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    query += " ORDER BY d.created_at DESC"
    rows = conn.execute(query, params).fetchall()
    return [dict(r) for r in rows]


@router.post("/disciplinary")
def create_disciplinary(body: dict, conn=Depends(get_db), user=Depends(get_current_user)):
    if not body.get("employee_id"):
        raise HTTPException(status_code=400, detail="employee_id is required")
    if not body.get("action_type"):
        raise HTTPException(status_code=400, detail="action_type is required")
    if not body.get("description"):
        raise HTTPException(status_code=400, detail="description is required")
    if not conn.execute("SELECT id FROM employees WHERE id = ?", (body["employee_id"],)).fetchone():
        raise HTTPException(status_code=400, detail="employee_id does not exist")
    ts = now_iso()
    did = new_id()
    conn.execute("""
        INSERT INTO disciplinary_actions (id, employee_id, action_type, description, incident_date, action_date, issued_by, status, resolution, resolved_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (did, body["employee_id"], body["action_type"], body["description"],
          body.get("incident_date"), body.get("action_date", ts[:10]),
          body.get("issued_by", user["id"]), body.get("status", "open"),
          body.get("resolution"), body.get("resolved_at"), ts, ts))
    conn.commit()
    row = conn.execute("""
        SELECT d.*,
               e.first_name || ' ' || e.last_name as employee_name
        FROM disciplinary_actions d
        JOIN employees e ON d.employee_id = e.id
        WHERE d.id = ?
    """, (did,)).fetchone()
    return dict(row)


@router.put("/disciplinary/{action_id}")
def update_disciplinary(action_id: str, body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    fields = ["action_type", "description", "incident_date", "action_date", "issued_by", "status", "resolution", "resolved_at"]
    updates, values = [], []
    for f in fields:
        if f in body:
            updates.append(f"{f} = ?")
            values.append(body[f])
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    updates.append("updated_at = ?")
    values.extend([now_iso(), action_id])
    conn.execute(f"UPDATE disciplinary_actions SET {', '.join(updates)} WHERE id = ?", values)
    conn.commit()
    row = conn.execute("""
        SELECT d.*,
               e.first_name || ' ' || e.last_name as employee_name
        FROM disciplinary_actions d
        JOIN employees e ON d.employee_id = e.id
        WHERE d.id = ?
    """, (action_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Disciplinary action not found")
    return dict(row)


@router.delete("/disciplinary/{action_id}")
def delete_disciplinary(action_id: str, conn=Depends(get_db), _user=Depends(get_current_user)):
    conn.execute("DELETE FROM disciplinary_actions WHERE id = ?", (action_id,))
    conn.commit()
    return {"ok": True}
