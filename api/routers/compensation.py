from fastapi import APIRouter, Depends, HTTPException
from ..db import new_id, now_iso
from ..deps import get_db, get_current_user

router = APIRouter()


@router.get("/compensation")
def list_compensation(employee_id: str = "", conn=Depends(get_db), _user=Depends(get_current_user)):
    conditions, params = [], []
    if employee_id:
        conditions.append("c.employee_id = ?")
        params.append(employee_id)
    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    rows = conn.execute(f"""
        SELECT c.*, e.first_name || ' ' || e.last_name as employee_name
        FROM compensation c
        JOIN employees e ON c.employee_id = e.id
        {where}
        ORDER BY c.effective_date DESC
    """, params).fetchall()
    return [dict(r) for r in rows]


@router.get("/compensation/current")
def list_current_compensation(conn=Depends(get_db), _user=Depends(get_current_user)):
    rows = conn.execute("""
        SELECT c.*, e.first_name || ' ' || e.last_name as employee_name,
               e.status as employee_status,
               d.name as department_name, p.title as position_title
        FROM compensation c
        JOIN employees e ON c.employee_id = e.id
        LEFT JOIN departments d ON e.department_id = d.id
        LEFT JOIN positions p ON e.position_id = p.id
        WHERE c.effective_date = (
            SELECT MAX(c2.effective_date) FROM compensation c2
            WHERE c2.employee_id = c.employee_id
        )
        ORDER BY e.last_name, e.first_name
    """).fetchall()
    return [dict(r) for r in rows]


@router.post("/compensation")
def create_compensation(body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    ts = now_iso()
    cid = new_id()
    conn.execute("""
        INSERT INTO compensation (id, employee_id, effective_date, salary, currency,
            pay_frequency, reason, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        cid, body["employee_id"], body["effective_date"], body["salary"],
        body.get("currency", "NZD"), body.get("pay_frequency", "annual"),
        body.get("reason"), body.get("notes"), ts, ts,
    ))
    conn.commit()
    row = conn.execute("""
        SELECT c.*, e.first_name || ' ' || e.last_name as employee_name
        FROM compensation c JOIN employees e ON c.employee_id = e.id
        WHERE c.id = ?
    """, (cid,)).fetchone()
    return dict(row)


@router.put("/compensation/{comp_id}")
def update_compensation(comp_id: str, body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    fields = ["effective_date", "salary", "currency", "pay_frequency", "reason", "notes"]
    updates, values = [], []
    for f in fields:
        if f in body:
            updates.append(f"{f} = ?")
            values.append(body[f])
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    updates.append("updated_at = ?")
    values.extend([now_iso(), comp_id])
    conn.execute(f"UPDATE compensation SET {', '.join(updates)} WHERE id = ?", values)
    conn.commit()
    row = conn.execute("""
        SELECT c.*, e.first_name || ' ' || e.last_name as employee_name
        FROM compensation c JOIN employees e ON c.employee_id = e.id
        WHERE c.id = ?
    """, (comp_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Compensation record not found")
    return dict(row)
