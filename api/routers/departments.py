from fastapi import APIRouter, Depends, HTTPException
from ..db import new_id, now_iso
from ..deps import get_db, get_current_user

router = APIRouter()


@router.get("/departments")
def list_departments(conn=Depends(get_db), _user=Depends(get_current_user)):
    rows = conn.execute("""
        SELECT d.*,
               h.first_name || ' ' || h.last_name as head_name,
               (SELECT COUNT(*) FROM employees WHERE department_id = d.id) as employee_count
        FROM departments d
        LEFT JOIN employees h ON d.head_id = h.id
        ORDER BY d.name
    """).fetchall()
    return [dict(r) for r in rows]


@router.post("/departments")
def create_department(body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    ts = now_iso()
    did = new_id()
    conn.execute(
        "INSERT INTO departments (id, name, description, head_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        (did, body["name"], body.get("description"), body.get("head_id"), ts, ts),
    )
    conn.commit()
    return dict(conn.execute("SELECT * FROM departments WHERE id = ?", (did,)).fetchone())


@router.put("/departments/{dept_id}")
def update_department(dept_id: str, body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    updates, values = [], []
    for f in ["name", "description", "head_id"]:
        if f in body:
            updates.append(f"{f} = ?")
            values.append(body[f])
    if updates:
        updates.append("updated_at = ?")
        values.extend([now_iso(), dept_id])
        conn.execute(f"UPDATE departments SET {', '.join(updates)} WHERE id = ?", values)
        conn.commit()
    row = conn.execute("SELECT * FROM departments WHERE id = ?", (dept_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Department not found")
    return dict(row)


@router.delete("/departments/{dept_id}")
def delete_department(dept_id: str, conn=Depends(get_db), _user=Depends(get_current_user)):
    conn.execute("DELETE FROM departments WHERE id = ?", (dept_id,))
    conn.commit()
    return {"ok": True}
