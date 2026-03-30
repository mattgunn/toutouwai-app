from fastapi import APIRouter, Depends, HTTPException
from ..db import new_id, now_iso
from ..deps import get_db, get_current_user

router = APIRouter()


@router.get("/emergency-contacts")
def list_emergency_contacts(
    employee_id: str | None = None,
    conn=Depends(get_db),
    _user=Depends(get_current_user),
):
    query = """
        SELECT ec.*,
               e.first_name || ' ' || e.last_name as employee_name
        FROM emergency_contacts ec
        JOIN employees e ON ec.employee_id = e.id
    """
    params = []
    if employee_id:
        query += " WHERE ec.employee_id = ?"
        params.append(employee_id)
    query += " ORDER BY ec.created_at DESC"
    rows = conn.execute(query, params).fetchall()
    return [dict(r) for r in rows]


@router.post("/emergency-contacts")
def create_emergency_contact(body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    if not body.get("employee_id"):
        raise HTTPException(status_code=400, detail="employee_id is required")
    if not body.get("contact_name"):
        raise HTTPException(status_code=400, detail="contact_name is required")
    if not body.get("phone"):
        raise HTTPException(status_code=400, detail="phone is required")
    if not conn.execute("SELECT id FROM employees WHERE id = ?", (body["employee_id"],)).fetchone():
        raise HTTPException(status_code=400, detail="employee_id does not exist")
    ts = now_iso()
    cid = new_id()
    conn.execute("""
        INSERT INTO emergency_contacts (id, employee_id, contact_name, relationship, phone, email, is_primary, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (cid, body["employee_id"], body["contact_name"], body.get("relationship"),
          body["phone"], body.get("email"), body.get("is_primary", 1), ts, ts))
    conn.commit()
    row = conn.execute("""
        SELECT ec.*,
               e.first_name || ' ' || e.last_name as employee_name
        FROM emergency_contacts ec
        JOIN employees e ON ec.employee_id = e.id
        WHERE ec.id = ?
    """, (cid,)).fetchone()
    return dict(row)


@router.put("/emergency-contacts/{contact_id}")
def update_emergency_contact(contact_id: str, body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    fields = ["contact_name", "relationship", "phone", "email", "is_primary"]
    updates, values = [], []
    for f in fields:
        if f in body:
            updates.append(f"{f} = ?")
            values.append(body[f])
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    updates.append("updated_at = ?")
    values.extend([now_iso(), contact_id])
    conn.execute(f"UPDATE emergency_contacts SET {', '.join(updates)} WHERE id = ?", values)
    conn.commit()
    row = conn.execute("""
        SELECT ec.*,
               e.first_name || ' ' || e.last_name as employee_name
        FROM emergency_contacts ec
        JOIN employees e ON ec.employee_id = e.id
        WHERE ec.id = ?
    """, (contact_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Emergency contact not found")
    return dict(row)


@router.delete("/emergency-contacts/{contact_id}")
def delete_emergency_contact(contact_id: str, conn=Depends(get_db), _user=Depends(get_current_user)):
    conn.execute("DELETE FROM emergency_contacts WHERE id = ?", (contact_id,))
    conn.commit()
    return {"ok": True}
