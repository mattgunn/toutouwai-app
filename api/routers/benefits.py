from fastapi import APIRouter, Depends, HTTPException
from ..db import new_id, now_iso
from ..deps import get_db, get_current_user

router = APIRouter()


# ── Benefit Plans ────────────────────────────────────────────────────

@router.get("/benefits/plans")
def list_plans(conn=Depends(get_db), _user=Depends(get_current_user)):
    rows = conn.execute("""
        SELECT bp.*,
               (SELECT COUNT(*) FROM benefit_enrollments be WHERE be.plan_id = bp.id AND be.status = 'active') as active_enrollments
        FROM benefit_plans bp
        ORDER BY bp.name
    """).fetchall()
    return [dict(r) for r in rows]


@router.post("/benefits/plans")
def create_plan(body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    ts = now_iso()
    pid = new_id()
    conn.execute("""
        INSERT INTO benefit_plans (id, name, type, provider, description, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        pid, body["name"], body["type"], body.get("provider"),
        body.get("description"), body.get("is_active", 1), ts, ts,
    ))
    conn.commit()
    row = conn.execute("""
        SELECT bp.*,
               (SELECT COUNT(*) FROM benefit_enrollments be WHERE be.plan_id = bp.id AND be.status = 'active') as active_enrollments
        FROM benefit_plans bp
        WHERE bp.id = ?
    """, (pid,)).fetchone()
    return dict(row)


@router.put("/benefits/plans/{plan_id}")
def update_plan(plan_id: str, body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    fields = ["name", "type", "provider", "description", "is_active"]
    updates, values = [], []
    for f in fields:
        if f in body:
            updates.append(f"{f} = ?")
            values.append(body[f])
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    updates.append("updated_at = ?")
    values.extend([now_iso(), plan_id])
    conn.execute(f"UPDATE benefit_plans SET {', '.join(updates)} WHERE id = ?", values)
    conn.commit()
    row = conn.execute("""
        SELECT bp.*,
               (SELECT COUNT(*) FROM benefit_enrollments be WHERE be.plan_id = bp.id AND be.status = 'active') as active_enrollments
        FROM benefit_plans bp
        WHERE bp.id = ?
    """, (plan_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Plan not found")
    return dict(row)


# ── Benefit Enrollments ──────────────────────────────────────────────

@router.get("/benefits/enrollments")
def list_enrollments(employee_id: str = "", plan_id: str = "", conn=Depends(get_db), _user=Depends(get_current_user)):
    conditions, params = [], []
    if employee_id:
        conditions.append("be.employee_id = ?")
        params.append(employee_id)
    if plan_id:
        conditions.append("be.plan_id = ?")
        params.append(plan_id)
    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    rows = conn.execute(f"""
        SELECT be.*, e.first_name || ' ' || e.last_name as employee_name,
               bp.name as plan_name, bp.type as plan_type
        FROM benefit_enrollments be
        JOIN employees e ON be.employee_id = e.id
        JOIN benefit_plans bp ON be.plan_id = bp.id
        {where}
        ORDER BY be.start_date DESC
    """, params).fetchall()
    return [dict(r) for r in rows]


@router.post("/benefits/enrollments")
def create_enrollment(body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    if not conn.execute("SELECT id FROM employees WHERE id = ?", (body["employee_id"],)).fetchone():
        raise HTTPException(status_code=400, detail="employee_id does not exist")
    if not conn.execute("SELECT id FROM benefit_plans WHERE id = ?", (body["plan_id"],)).fetchone():
        raise HTTPException(status_code=400, detail="plan_id does not exist")
    ts = now_iso()
    eid = new_id()
    conn.execute("""
        INSERT INTO benefit_enrollments (id, employee_id, plan_id, status, start_date, end_date,
            coverage_level, employee_contribution, employer_contribution, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        eid, body["employee_id"], body["plan_id"], body.get("status", "active"),
        body["start_date"], body.get("end_date"), body.get("coverage_level", "employee"),
        body.get("employee_contribution", 0), body.get("employer_contribution", 0), ts, ts,
    ))
    conn.commit()
    row = conn.execute("""
        SELECT be.*, e.first_name || ' ' || e.last_name as employee_name,
               bp.name as plan_name, bp.type as plan_type
        FROM benefit_enrollments be
        JOIN employees e ON be.employee_id = e.id
        JOIN benefit_plans bp ON be.plan_id = bp.id
        WHERE be.id = ?
    """, (eid,)).fetchone()
    return dict(row)


@router.put("/benefits/enrollments/{enrollment_id}")
def update_enrollment(enrollment_id: str, body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    fields = ["status", "start_date", "end_date", "coverage_level", "employee_contribution", "employer_contribution"]
    updates, values = [], []
    for f in fields:
        if f in body:
            updates.append(f"{f} = ?")
            values.append(body[f])
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    updates.append("updated_at = ?")
    values.extend([now_iso(), enrollment_id])
    conn.execute(f"UPDATE benefit_enrollments SET {', '.join(updates)} WHERE id = ?", values)
    conn.commit()
    row = conn.execute("""
        SELECT be.*, e.first_name || ' ' || e.last_name as employee_name,
               bp.name as plan_name, bp.type as plan_type
        FROM benefit_enrollments be
        JOIN employees e ON be.employee_id = e.id
        JOIN benefit_plans bp ON be.plan_id = bp.id
        WHERE be.id = ?
    """, (enrollment_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    return dict(row)
