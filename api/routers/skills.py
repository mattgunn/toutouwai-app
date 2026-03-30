from fastapi import APIRouter, Depends, HTTPException
from ..db import new_id, now_iso
from ..deps import get_db, get_current_user

router = APIRouter()


# --- Skill Catalog ---

@router.get("/skills/catalog")
def list_skills(conn=Depends(get_db), _user=Depends(get_current_user)):
    rows = conn.execute("""
        SELECT s.*,
               (SELECT COUNT(*) FROM employee_skills es WHERE es.skill_id = s.id) as employee_count
        FROM skills s
        ORDER BY s.name
    """).fetchall()
    return [dict(r) for r in rows]


@router.post("/skills/catalog")
def create_skill(body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    if not body.get("name"):
        raise HTTPException(status_code=400, detail="name is required")
    ts = now_iso()
    sid = new_id()
    conn.execute("""
        INSERT INTO skills (id, name, category, description, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (sid, body["name"], body.get("category"), body.get("description"), ts, ts))
    conn.commit()
    row = conn.execute("""
        SELECT s.*,
               (SELECT COUNT(*) FROM employee_skills es WHERE es.skill_id = s.id) as employee_count
        FROM skills s WHERE s.id = ?
    """, (sid,)).fetchone()
    return dict(row)


@router.put("/skills/catalog/{skill_id}")
def update_skill(skill_id: str, body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    fields = ["name", "category", "description"]
    updates, values = [], []
    for f in fields:
        if f in body:
            updates.append(f"{f} = ?")
            values.append(body[f])
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    updates.append("updated_at = ?")
    values.extend([now_iso(), skill_id])
    conn.execute(f"UPDATE skills SET {', '.join(updates)} WHERE id = ?", values)
    conn.commit()
    row = conn.execute("""
        SELECT s.*,
               (SELECT COUNT(*) FROM employee_skills es WHERE es.skill_id = s.id) as employee_count
        FROM skills s WHERE s.id = ?
    """, (skill_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Skill not found")
    return dict(row)


@router.delete("/skills/catalog/{skill_id}")
def delete_skill(skill_id: str, conn=Depends(get_db), _user=Depends(get_current_user)):
    conn.execute("DELETE FROM employee_skills WHERE skill_id = ?", (skill_id,))
    conn.execute("DELETE FROM skills WHERE id = ?", (skill_id,))
    conn.commit()
    return {"ok": True}


# --- Employee Skills ---

@router.get("/skills/employee")
def list_employee_skills(
    employee_id: str | None = None,
    skill_id: str | None = None,
    conn=Depends(get_db),
    _user=Depends(get_current_user),
):
    query = """
        SELECT es.*,
               e.first_name || ' ' || e.last_name as employee_name,
               s.name as skill_name
        FROM employee_skills es
        JOIN employees e ON es.employee_id = e.id
        JOIN skills s ON es.skill_id = s.id
    """
    conditions, params = [], []
    if employee_id:
        conditions.append("es.employee_id = ?")
        params.append(employee_id)
    if skill_id:
        conditions.append("es.skill_id = ?")
        params.append(skill_id)
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    query += " ORDER BY es.created_at DESC"
    rows = conn.execute(query, params).fetchall()
    return [dict(r) for r in rows]


@router.post("/skills/employee")
def create_employee_skill(body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    if not body.get("employee_id"):
        raise HTTPException(status_code=400, detail="employee_id is required")
    if not body.get("skill_id"):
        raise HTTPException(status_code=400, detail="skill_id is required")
    if not conn.execute("SELECT id FROM employees WHERE id = ?", (body["employee_id"],)).fetchone():
        raise HTTPException(status_code=400, detail="employee_id does not exist")
    if not conn.execute("SELECT id FROM skills WHERE id = ?", (body["skill_id"],)).fetchone():
        raise HTTPException(status_code=400, detail="skill_id does not exist")
    ts = now_iso()
    esid = new_id()
    conn.execute("""
        INSERT INTO employee_skills (id, employee_id, skill_id, proficiency_level, years_experience, notes, verified_by, verified_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (esid, body["employee_id"], body["skill_id"], body.get("proficiency_level", "beginner"),
          body.get("years_experience"), body.get("notes"),
          body.get("verified_by"), body.get("verified_at"), ts, ts))
    conn.commit()
    row = conn.execute("""
        SELECT es.*,
               e.first_name || ' ' || e.last_name as employee_name,
               s.name as skill_name
        FROM employee_skills es
        JOIN employees e ON es.employee_id = e.id
        JOIN skills s ON es.skill_id = s.id
        WHERE es.id = ?
    """, (esid,)).fetchone()
    return dict(row)


@router.put("/skills/employee/{record_id}")
def update_employee_skill(record_id: str, body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    fields = ["proficiency_level", "years_experience", "notes", "verified_by", "verified_at"]
    updates, values = [], []
    for f in fields:
        if f in body:
            updates.append(f"{f} = ?")
            values.append(body[f])
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    updates.append("updated_at = ?")
    values.extend([now_iso(), record_id])
    conn.execute(f"UPDATE employee_skills SET {', '.join(updates)} WHERE id = ?", values)
    conn.commit()
    row = conn.execute("""
        SELECT es.*,
               e.first_name || ' ' || e.last_name as employee_name,
               s.name as skill_name
        FROM employee_skills es
        JOIN employees e ON es.employee_id = e.id
        JOIN skills s ON es.skill_id = s.id
        WHERE es.id = ?
    """, (record_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Employee skill not found")
    return dict(row)


@router.delete("/skills/employee/{record_id}")
def delete_employee_skill(record_id: str, conn=Depends(get_db), _user=Depends(get_current_user)):
    conn.execute("DELETE FROM employee_skills WHERE id = ?", (record_id,))
    conn.commit()
    return {"ok": True}
