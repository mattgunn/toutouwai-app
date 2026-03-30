from fastapi import APIRouter, Depends, HTTPException
from ..db import new_id, now_iso
from ..deps import get_db, get_current_user

router = APIRouter()


REQUISITION_SELECT = """
    SELECT jr.*,
           d.name as department_name,
           p.title as position_title,
           u.name as requested_by_name
    FROM job_requisitions jr
    LEFT JOIN departments d ON jr.department_id = d.id
    LEFT JOIN positions p ON jr.position_id = p.id
    LEFT JOIN users u ON jr.requested_by = u.id
"""


@router.get("/requisitions")
def list_requisitions(
    status: str | None = None,
    department_id: str | None = None,
    conn=Depends(get_db),
    _user=Depends(get_current_user),
):
    query = REQUISITION_SELECT
    conditions, params = [], []
    if status:
        conditions.append("jr.status = ?")
        params.append(status)
    if department_id:
        conditions.append("jr.department_id = ?")
        params.append(department_id)
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    query += " ORDER BY jr.created_at DESC"
    rows = conn.execute(query, params).fetchall()
    return [dict(r) for r in rows]


@router.get("/requisitions/{requisition_id}")
def get_requisition(requisition_id: str, conn=Depends(get_db), _user=Depends(get_current_user)):
    row = conn.execute(
        REQUISITION_SELECT + " WHERE jr.id = ?", (requisition_id,)
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Requisition not found")
    return dict(row)


@router.post("/requisitions")
def create_requisition(body: dict, conn=Depends(get_db), user=Depends(get_current_user)):
    if not body.get("title"):
        raise HTTPException(status_code=400, detail="title is required")
    if not body.get("department_id"):
        raise HTTPException(status_code=400, detail="department_id is required")
    if not body.get("justification"):
        raise HTTPException(status_code=400, detail="justification is required")
    if not conn.execute("SELECT id FROM departments WHERE id = ?", (body["department_id"],)).fetchone():
        raise HTTPException(status_code=400, detail="department_id does not exist")
    if body.get("position_id"):
        if not conn.execute("SELECT id FROM positions WHERE id = ?", (body["position_id"],)).fetchone():
            raise HTTPException(status_code=400, detail="position_id does not exist")
    ts = now_iso()
    rid = new_id()
    conn.execute("""
        INSERT INTO job_requisitions (id, title, department_id, position_id, number_of_openings,
            justification, status, priority, requested_by, budget_min, budget_max,
            currency, target_start_date, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (rid, body["title"], body["department_id"], body.get("position_id"),
          body.get("number_of_openings", 1), body["justification"],
          body.get("status", "draft"), body.get("priority", "normal"),
          user["id"], body.get("budget_min"), body.get("budget_max"),
          body.get("currency", "NZD"), body.get("target_start_date"),
          ts, ts))
    conn.commit()
    row = conn.execute(
        REQUISITION_SELECT + " WHERE jr.id = ?", (rid,)
    ).fetchone()
    return dict(row)


@router.put("/requisitions/{requisition_id}")
def update_requisition(requisition_id: str, body: dict, conn=Depends(get_db), user=Depends(get_current_user)):
    fields = ["title", "department_id", "position_id", "number_of_openings", "justification",
              "status", "priority", "budget_min", "budget_max", "currency",
              "target_start_date"]
    updates, values = [], []
    for f in fields:
        if f in body:
            updates.append(f"{f} = ?")
            values.append(body[f])
    # Handle approval: when status is set to approved, record who and when
    if body.get("status") == "approved":
        updates.append("approved_by = ?")
        values.append(user["id"])
        updates.append("approved_at = ?")
        values.append(now_iso())
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    updates.append("updated_at = ?")
    values.append(now_iso())
    values.append(requisition_id)
    conn.execute(f"UPDATE job_requisitions SET {', '.join(updates)} WHERE id = ?", values)
    conn.commit()
    row = conn.execute(
        REQUISITION_SELECT + " WHERE jr.id = ?", (requisition_id,)
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Requisition not found")
    return dict(row)


@router.delete("/requisitions/{requisition_id}")
def delete_requisition(requisition_id: str, conn=Depends(get_db), _user=Depends(get_current_user)):
    conn.execute("DELETE FROM job_requisitions WHERE id = ?", (requisition_id,))
    conn.commit()
    return {"ok": True}
