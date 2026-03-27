from fastapi import APIRouter, Depends, HTTPException
from ..db import new_id, now_iso
from ..deps import get_db, get_current_user

router = APIRouter()


@router.get("/positions")
def list_positions(conn=Depends(get_db), _user=Depends(get_current_user)):
    rows = conn.execute("""
        SELECT p.*, d.name as department_name,
               (SELECT COUNT(*) FROM employees WHERE position_id = p.id) as employee_count
        FROM positions p
        LEFT JOIN departments d ON p.department_id = d.id
        ORDER BY p.title
    """).fetchall()
    return [dict(r) for r in rows]


@router.post("/positions")
def create_position(body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    ts = now_iso()
    pid = new_id()
    conn.execute(
        "INSERT INTO positions (id, title, department_id, level, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (pid, body["title"], body.get("department_id"), body.get("level"), body.get("description"), ts, ts),
    )
    conn.commit()
    return dict(conn.execute("SELECT * FROM positions WHERE id = ?", (pid,)).fetchone())


@router.put("/positions/{pos_id}")
def update_position(pos_id: str, body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    updates, values = [], []
    for f in ["title", "department_id", "level", "description"]:
        if f in body:
            updates.append(f"{f} = ?")
            values.append(body[f])
    if updates:
        updates.append("updated_at = ?")
        values.extend([now_iso(), pos_id])
        conn.execute(f"UPDATE positions SET {', '.join(updates)} WHERE id = ?", values)
        conn.commit()
    row = conn.execute("SELECT * FROM positions WHERE id = ?", (pos_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Position not found")
    return dict(row)


@router.delete("/positions/{pos_id}")
def delete_position(pos_id: str, conn=Depends(get_db), _user=Depends(get_current_user)):
    conn.execute("DELETE FROM positions WHERE id = ?", (pos_id,))
    conn.commit()
    return {"ok": True}
