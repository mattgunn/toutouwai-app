from fastapi import APIRouter, Depends, HTTPException
from ..db import new_id, now_iso
from ..deps import get_db, get_current_user

router = APIRouter()


COST_CENTER_SELECT = """
    SELECT cc.*,
           d.name as department_name,
           e.first_name || ' ' || e.last_name as manager_name
    FROM cost_centers cc
    LEFT JOIN departments d ON cc.department_id = d.id
    LEFT JOIN employees e ON cc.manager_id = e.id
"""


@router.get("/cost-centers")
def list_cost_centers(conn=Depends(get_db), _user=Depends(get_current_user)):
    rows = conn.execute(
        COST_CENTER_SELECT + " ORDER BY cc.code"
    ).fetchall()
    return [dict(r) for r in rows]


@router.get("/cost-centers/{cost_center_id}")
def get_cost_center(cost_center_id: str, conn=Depends(get_db), _user=Depends(get_current_user)):
    row = conn.execute(
        COST_CENTER_SELECT + " WHERE cc.id = ?", (cost_center_id,)
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Cost center not found")
    return dict(row)


@router.post("/cost-centers")
def create_cost_center(body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    if not body.get("code"):
        raise HTTPException(status_code=400, detail="code is required")
    if not body.get("name"):
        raise HTTPException(status_code=400, detail="name is required")
    if body.get("department_id"):
        if not conn.execute("SELECT id FROM departments WHERE id = ?", (body["department_id"],)).fetchone():
            raise HTTPException(status_code=400, detail="department_id does not exist")
    if body.get("manager_id"):
        if not conn.execute("SELECT id FROM employees WHERE id = ?", (body["manager_id"],)).fetchone():
            raise HTTPException(status_code=400, detail="manager_id does not exist")
    ts = now_iso()
    cid = new_id()
    conn.execute("""
        INSERT INTO cost_centers (id, code, name, description, department_id, manager_id,
            budget, currency, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (cid, body["code"], body["name"], body.get("description"),
          body.get("department_id"), body.get("manager_id"),
          body.get("budget"), body.get("currency", "NZD"),
          body.get("is_active", 1), ts, ts))
    conn.commit()
    row = conn.execute(
        COST_CENTER_SELECT + " WHERE cc.id = ?", (cid,)
    ).fetchone()
    return dict(row)


@router.put("/cost-centers/{cost_center_id}")
def update_cost_center(cost_center_id: str, body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    fields = ["code", "name", "description", "department_id", "manager_id", "budget", "currency", "is_active"]
    updates, values = [], []
    for f in fields:
        if f in body:
            updates.append(f"{f} = ?")
            values.append(body[f])
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    updates.append("updated_at = ?")
    values.append(now_iso())
    values.append(cost_center_id)
    conn.execute(f"UPDATE cost_centers SET {', '.join(updates)} WHERE id = ?", values)
    conn.commit()
    row = conn.execute(
        COST_CENTER_SELECT + " WHERE cc.id = ?", (cost_center_id,)
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Cost center not found")
    return dict(row)


@router.delete("/cost-centers/{cost_center_id}")
def delete_cost_center(cost_center_id: str, conn=Depends(get_db), _user=Depends(get_current_user)):
    conn.execute("DELETE FROM cost_centers WHERE id = ?", (cost_center_id,))
    conn.commit()
    return {"ok": True}
