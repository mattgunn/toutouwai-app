from fastapi import APIRouter, Depends, HTTPException
from ..db import new_id, now_iso
from ..deps import get_db, get_current_user

router = APIRouter()


@router.get("/compensation/components")
def list_compensation_components(
    employee_id: str | None = None,
    conn=Depends(get_db),
    _user=Depends(get_current_user),
):
    query = """
        SELECT cc.*,
               e.first_name || ' ' || e.last_name as employee_name
        FROM compensation_components cc
        JOIN employees e ON cc.employee_id = e.id
    """
    params = []
    if employee_id:
        query += " WHERE cc.employee_id = ?"
        params.append(employee_id)
    query += " ORDER BY cc.created_at DESC"
    rows = conn.execute(query, params).fetchall()
    return [dict(r) for r in rows]


@router.post("/compensation/components")
def create_compensation_component(body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    if not body.get("employee_id"):
        raise HTTPException(status_code=400, detail="employee_id is required")
    if not body.get("component_type"):
        raise HTTPException(status_code=400, detail="component_type is required")
    if body.get("amount") is None:
        raise HTTPException(status_code=400, detail="amount is required")
    if not conn.execute("SELECT id FROM employees WHERE id = ?", (body["employee_id"],)).fetchone():
        raise HTTPException(status_code=400, detail="employee_id does not exist")
    ts = now_iso()
    cid = new_id()
    conn.execute("""
        INSERT INTO compensation_components (id, employee_id, component_type, amount, currency, frequency, effective_date, end_date, description, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (cid, body["employee_id"], body["component_type"], body["amount"],
          body.get("currency", "NZD"), body.get("frequency", "annual"),
          body.get("effective_date"), body.get("end_date"),
          body.get("description"), body.get("status", "active"), ts, ts))
    conn.commit()
    row = conn.execute("""
        SELECT cc.*,
               e.first_name || ' ' || e.last_name as employee_name
        FROM compensation_components cc
        JOIN employees e ON cc.employee_id = e.id
        WHERE cc.id = ?
    """, (cid,)).fetchone()
    return dict(row)


@router.put("/compensation/components/{component_id}")
def update_compensation_component(component_id: str, body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    fields = ["component_type", "amount", "currency", "frequency", "effective_date", "end_date", "description", "status"]
    updates, values = [], []
    for f in fields:
        if f in body:
            updates.append(f"{f} = ?")
            values.append(body[f])
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    updates.append("updated_at = ?")
    values.extend([now_iso(), component_id])
    conn.execute(f"UPDATE compensation_components SET {', '.join(updates)} WHERE id = ?", values)
    conn.commit()
    row = conn.execute("""
        SELECT cc.*,
               e.first_name || ' ' || e.last_name as employee_name
        FROM compensation_components cc
        JOIN employees e ON cc.employee_id = e.id
        WHERE cc.id = ?
    """, (component_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Compensation component not found")
    return dict(row)


@router.delete("/compensation/components/{component_id}")
def delete_compensation_component(component_id: str, conn=Depends(get_db), _user=Depends(get_current_user)):
    conn.execute("DELETE FROM compensation_components WHERE id = ?", (component_id,))
    conn.commit()
    return {"ok": True}
