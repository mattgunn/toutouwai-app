from fastapi import APIRouter, Depends, HTTPException
from ..db import new_id, now_iso
from ..deps import get_db, get_current_user

router = APIRouter()


@router.get("/dependents")
def list_dependents(
    employee_id: str | None = None,
    conn=Depends(get_db),
    _user=Depends(get_current_user),
):
    query = """
        SELECT d.*,
               e.first_name || ' ' || e.last_name as employee_name
        FROM dependents d
        JOIN employees e ON d.employee_id = e.id
    """
    params = []
    if employee_id:
        query += " WHERE d.employee_id = ?"
        params.append(employee_id)
    query += " ORDER BY d.created_at DESC"
    rows = conn.execute(query, params).fetchall()
    return [dict(r) for r in rows]


@router.post("/dependents")
def create_dependent(body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    if not body.get("employee_id"):
        raise HTTPException(status_code=400, detail="employee_id is required")
    if not body.get("first_name"):
        raise HTTPException(status_code=400, detail="first_name is required")
    if not body.get("last_name"):
        raise HTTPException(status_code=400, detail="last_name is required")
    if not body.get("relationship"):
        raise HTTPException(status_code=400, detail="relationship is required")
    if not conn.execute("SELECT id FROM employees WHERE id = ?", (body["employee_id"],)).fetchone():
        raise HTTPException(status_code=400, detail="employee_id does not exist")
    ts = now_iso()
    did = new_id()
    conn.execute("""
        INSERT INTO dependents (id, employee_id, first_name, last_name, relationship, date_of_birth, gender, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (did, body["employee_id"], body["first_name"], body["last_name"],
          body["relationship"], body.get("date_of_birth"), body.get("gender"),
          body.get("is_active", 1), ts, ts))
    conn.commit()
    row = conn.execute("""
        SELECT d.*,
               e.first_name || ' ' || e.last_name as employee_name
        FROM dependents d
        JOIN employees e ON d.employee_id = e.id
        WHERE d.id = ?
    """, (did,)).fetchone()
    return dict(row)


@router.put("/dependents/{dependent_id}")
def update_dependent(dependent_id: str, body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    fields = ["first_name", "last_name", "relationship", "date_of_birth", "gender", "is_active"]
    updates, values = [], []
    for f in fields:
        if f in body:
            updates.append(f"{f} = ?")
            values.append(body[f])
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    updates.append("updated_at = ?")
    values.extend([now_iso(), dependent_id])
    conn.execute(f"UPDATE dependents SET {', '.join(updates)} WHERE id = ?", values)
    conn.commit()
    row = conn.execute("""
        SELECT d.*,
               e.first_name || ' ' || e.last_name as employee_name
        FROM dependents d
        JOIN employees e ON d.employee_id = e.id
        WHERE d.id = ?
    """, (dependent_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Dependent not found")
    return dict(row)


@router.delete("/dependents/{dependent_id}")
def delete_dependent(dependent_id: str, conn=Depends(get_db), _user=Depends(get_current_user)):
    conn.execute("DELETE FROM dependents WHERE id = ?", (dependent_id,))
    conn.commit()
    return {"ok": True}
