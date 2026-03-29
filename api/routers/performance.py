from fastapi import APIRouter, Depends, HTTPException
from ..db import new_id, now_iso
from ..deps import get_db, get_current_user

router = APIRouter()


# ── Review Cycles ────────────────────────────────────────────────────

@router.get("/performance/cycles")
def list_cycles(conn=Depends(get_db), _user=Depends(get_current_user)):
    rows = conn.execute("""
        SELECT rc.*, (SELECT COUNT(*) FROM reviews WHERE cycle_id = rc.id) as review_count
        FROM review_cycles rc ORDER BY rc.start_date DESC
    """).fetchall()
    return [dict(r) for r in rows]


@router.post("/performance/cycles")
def create_cycle(body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    ts = now_iso()
    cid = new_id()
    conn.execute(
        "INSERT INTO review_cycles (id, name, start_date, end_date, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (cid, body["name"], body["start_date"], body["end_date"], body.get("status", "draft"), ts, ts),
    )
    conn.commit()
    row = conn.execute("""
        SELECT rc.*, (SELECT COUNT(*) FROM reviews WHERE cycle_id = rc.id) as review_count
        FROM review_cycles rc WHERE rc.id = ?
    """, (cid,)).fetchone()
    return dict(row)


# ── Reviews ──────────────────────────────────────────────────────────

@router.get("/performance/reviews")
def list_reviews(cycle_id: str = "", employee_id: str = "", conn=Depends(get_db), _user=Depends(get_current_user)):
    conditions, params = [], []
    if cycle_id:
        conditions.append("r.cycle_id = ?")
        params.append(cycle_id)
    if employee_id:
        conditions.append("r.employee_id = ?")
        params.append(employee_id)
    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    rows = conn.execute(f"""
        SELECT r.*, e.first_name || ' ' || e.last_name as employee_name,
               rv.first_name || ' ' || rv.last_name as reviewer_name,
               rc.name as cycle_name
        FROM reviews r
        JOIN employees e ON r.employee_id = e.id
        LEFT JOIN employees rv ON r.reviewer_id = rv.id
        JOIN review_cycles rc ON r.cycle_id = rc.id
        {where}
        ORDER BY r.created_at DESC
    """, params).fetchall()
    return [dict(r) for r in rows]


@router.post("/performance/reviews")
def create_review(body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    if not conn.execute("SELECT id FROM employees WHERE id = ?", (body["employee_id"],)).fetchone():
        raise HTTPException(status_code=400, detail="employee_id does not exist")
    if not conn.execute("SELECT id FROM employees WHERE id = ?", (body["reviewer_id"],)).fetchone():
        raise HTTPException(status_code=400, detail="reviewer_id does not exist")
    if not conn.execute("SELECT id FROM review_cycles WHERE id = ?", (body["cycle_id"],)).fetchone():
        raise HTTPException(status_code=400, detail="cycle_id does not exist")
    ts = now_iso()
    rid = new_id()
    conn.execute("""
        INSERT INTO reviews (id, employee_id, reviewer_id, cycle_id, rating, feedback, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (rid, body["employee_id"], body["reviewer_id"], body["cycle_id"],
          body.get("rating"), body.get("feedback"), body.get("status", "draft"), ts, ts))
    conn.commit()
    row = conn.execute("""
        SELECT r.*, e.first_name || ' ' || e.last_name as employee_name,
               rv.first_name || ' ' || rv.last_name as reviewer_name,
               rc.name as cycle_name
        FROM reviews r
        JOIN employees e ON r.employee_id = e.id
        LEFT JOIN employees rv ON r.reviewer_id = rv.id
        JOIN review_cycles rc ON r.cycle_id = rc.id
        WHERE r.id = ?
    """, (rid,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Review not found")
    return dict(row)


@router.put("/performance/reviews/{review_id}")
def update_review(review_id: str, body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    fields = ["rating", "feedback", "status", "submitted_at"]
    updates, values = [], []
    for f in fields:
        if f in body:
            updates.append(f"{f} = ?")
            values.append(body[f])
    if updates:
        updates.append("updated_at = ?")
        values.extend([now_iso(), review_id])
        conn.execute(f"UPDATE reviews SET {', '.join(updates)} WHERE id = ?", values)
        conn.commit()
    row = conn.execute("""
        SELECT r.*, e.first_name || ' ' || e.last_name as employee_name,
               rv.first_name || ' ' || rv.last_name as reviewer_name,
               rc.name as cycle_name
        FROM reviews r
        JOIN employees e ON r.employee_id = e.id
        LEFT JOIN employees rv ON r.reviewer_id = rv.id
        JOIN review_cycles rc ON r.cycle_id = rc.id
        WHERE r.id = ?
    """, (review_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Review not found")
    return dict(row)


# ── Goals ────────────────────────────────────────────────────────────

@router.get("/performance/goals")
def list_goals(employee_id: str = "", status: str = "", conn=Depends(get_db), _user=Depends(get_current_user)):
    conditions, params = [], []
    if employee_id:
        conditions.append("g.employee_id = ?")
        params.append(employee_id)
    if status:
        conditions.append("g.status = ?")
        params.append(status)
    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    rows = conn.execute(f"""
        SELECT g.*, e.first_name || ' ' || e.last_name as employee_name
        FROM goals g JOIN employees e ON g.employee_id = e.id
        {where}
        ORDER BY g.due_date, g.created_at DESC
    """, params).fetchall()
    return [dict(r) for r in rows]


@router.post("/performance/goals")
def create_goal(body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    if not conn.execute("SELECT id FROM employees WHERE id = ?", (body["employee_id"],)).fetchone():
        raise HTTPException(status_code=400, detail="employee_id does not exist")
    ts = now_iso()
    gid = new_id()
    conn.execute("""
        INSERT INTO goals (id, employee_id, title, description, due_date, status, progress, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (gid, body["employee_id"], body["title"], body.get("description"),
          body.get("due_date"), body.get("status", "not_started"), body.get("progress", 0), ts, ts))
    conn.commit()
    row = conn.execute("""
        SELECT g.*, e.first_name || ' ' || e.last_name as employee_name
        FROM goals g JOIN employees e ON g.employee_id = e.id WHERE g.id = ?
    """, (gid,)).fetchone()
    return dict(row)


@router.put("/performance/goals/{goal_id}")
def update_goal(goal_id: str, body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    fields = ["title", "description", "due_date", "status", "progress"]
    updates, values = [], []
    for f in fields:
        if f in body:
            updates.append(f"{f} = ?")
            values.append(body[f])
    if updates:
        updates.append("updated_at = ?")
        values.extend([now_iso(), goal_id])
        conn.execute(f"UPDATE goals SET {', '.join(updates)} WHERE id = ?", values)
        conn.commit()
    row = conn.execute("""
        SELECT g.*, e.first_name || ' ' || e.last_name as employee_name
        FROM goals g JOIN employees e ON g.employee_id = e.id WHERE g.id = ?
    """, (goal_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Goal not found")
    return dict(row)


@router.delete("/performance/goals/{goal_id}")
def delete_goal(goal_id: str, conn=Depends(get_db), _user=Depends(get_current_user)):
    conn.execute("DELETE FROM goals WHERE id = ?", (goal_id,))
    conn.commit()
    return {"ok": True}
