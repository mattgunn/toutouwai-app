from fastapi import APIRouter, Depends, HTTPException
from ..db import new_id, now_iso
from ..deps import get_db, get_current_user

router = APIRouter()


def _get_employee_for_user(conn, user):
    """Find the employee record linked to the current user (by user_id or email)."""
    row = conn.execute("""
        SELECT e.*, d.name as department_name, p.title as position_title,
               m.first_name || ' ' || m.last_name as manager_name
        FROM employees e
        LEFT JOIN departments d ON e.department_id = d.id
        LEFT JOIN positions p ON e.position_id = p.id
        LEFT JOIN employees m ON e.manager_id = m.id
        WHERE e.user_id = ? OR e.email = ?
        LIMIT 1
    """, (user["id"], user["email"])).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="No employee profile linked to your account")
    return row


# ── Profile ────────────────────────────────────────────────────────

@router.get("/self-service/profile")
def get_profile(conn=Depends(get_db), user=Depends(get_current_user)):
    row = _get_employee_for_user(conn, user)
    return dict(row)


@router.put("/self-service/profile")
def update_profile(body: dict, conn=Depends(get_db), user=Depends(get_current_user)):
    emp = _get_employee_for_user(conn, user)
    allowed = ["phone", "address", "emergency_contact"]
    updates = []
    values = []
    for f in allowed:
        if f in body:
            updates.append(f"{f} = ?")
            values.append(body[f])
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    updates.append("updated_at = ?")
    values.append(now_iso())
    values.append(emp["id"])
    conn.execute(f"UPDATE employees SET {', '.join(updates)} WHERE id = ?", values)
    conn.commit()
    row = _get_employee_for_user(conn, user)
    return dict(row)


# ── Leave ──────────────────────────────────────────────────────────

@router.get("/self-service/leave")
def get_own_leave(conn=Depends(get_db), user=Depends(get_current_user)):
    emp = _get_employee_for_user(conn, user)
    rows = conn.execute("""
        SELECT lr.*, lt.name as leave_type_name
        FROM leave_requests lr
        JOIN leave_types lt ON lr.leave_type_id = lt.id
        WHERE lr.employee_id = ?
        ORDER BY lr.created_at DESC
    """, (emp["id"],)).fetchall()
    return [dict(r) for r in rows]


@router.post("/self-service/leave")
def submit_own_leave(body: dict, conn=Depends(get_db), user=Depends(get_current_user)):
    emp = _get_employee_for_user(conn, user)
    if not conn.execute("SELECT id FROM leave_types WHERE id = ?", (body["leave_type_id"],)).fetchone():
        raise HTTPException(status_code=400, detail="leave_type_id does not exist")
    ts = now_iso()
    lid = new_id()
    conn.execute("""
        INSERT INTO leave_requests (id, employee_id, leave_type_id, start_date, end_date, days, status, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
    """, (lid, emp["id"], body["leave_type_id"], body["start_date"], body["end_date"],
          body.get("days", 0), body.get("notes"), ts, ts))
    conn.commit()
    row = conn.execute("""
        SELECT lr.*, lt.name as leave_type_name
        FROM leave_requests lr
        JOIN leave_types lt ON lr.leave_type_id = lt.id
        WHERE lr.id = ?
    """, (lid,)).fetchone()
    return dict(row)


@router.get("/self-service/leave/balances")
def get_own_leave_balances(conn=Depends(get_db), user=Depends(get_current_user)):
    emp = _get_employee_for_user(conn, user)
    rows = conn.execute("""
        SELECT lt.id as leave_type_id, lt.name as leave_type_name,
               lt.days_per_year as entitled,
               COALESCE(SUM(CASE WHEN lr.status = 'approved' THEN lr.days ELSE 0 END), 0) as used
        FROM leave_types lt
        LEFT JOIN leave_requests lr ON lr.leave_type_id = lt.id AND lr.employee_id = ?
        WHERE lt.is_active = 1
        GROUP BY lt.id
        ORDER BY lt.name
    """, (emp["id"],)).fetchall()
    result = []
    for r in rows:
        d = dict(r)
        d["remaining"] = d["entitled"] - d["used"]
        result.append(d)
    return result


# ── Time ───────────────────────────────────────────────────────────

@router.get("/self-service/time")
def get_own_time(conn=Depends(get_db), user=Depends(get_current_user)):
    emp = _get_employee_for_user(conn, user)
    rows = conn.execute("""
        SELECT * FROM time_entries
        WHERE employee_id = ?
        ORDER BY date DESC
        LIMIT 50
    """, (emp["id"],)).fetchall()
    return [dict(r) for r in rows]


@router.post("/self-service/time")
def submit_own_time(body: dict, conn=Depends(get_db), user=Depends(get_current_user)):
    emp = _get_employee_for_user(conn, user)
    ts = now_iso()
    tid = new_id()
    conn.execute("""
        INSERT INTO time_entries (id, employee_id, date, hours, project, description, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (tid, emp["id"], body["date"], body["hours"],
          body.get("project"), body.get("description"), ts, ts))
    conn.commit()
    row = conn.execute("SELECT * FROM time_entries WHERE id = ?", (tid,)).fetchone()
    return dict(row)


# ── Documents ──────────────────────────────────────────────────────

@router.get("/self-service/documents")
def get_own_documents(conn=Depends(get_db), user=Depends(get_current_user)):
    emp = _get_employee_for_user(conn, user)
    rows = conn.execute("""
        SELECT doc.*, u.name as uploaded_by_name
        FROM documents doc
        LEFT JOIN users u ON doc.uploaded_by = u.id
        WHERE doc.employee_id = ?
        ORDER BY doc.created_at DESC
    """, (emp["id"],)).fetchall()
    return [dict(r) for r in rows]


# ── Onboarding ─────────────────────────────────────────────────────

@router.get("/self-service/onboarding")
def get_own_onboarding(conn=Depends(get_db), user=Depends(get_current_user)):
    emp = _get_employee_for_user(conn, user)
    rows = conn.execute("""
        SELECT oc.*, ot.name as template_name
        FROM onboarding_checklists oc
        LEFT JOIN onboarding_templates ot ON oc.template_id = ot.id
        WHERE oc.employee_id = ?
        ORDER BY oc.created_at DESC
    """, (emp["id"],)).fetchall()

    result = []
    for r in rows:
        d = dict(r)
        tasks = conn.execute("""
            SELECT * FROM onboarding_tasks
            WHERE checklist_id = ?
            ORDER BY sort_order, created_at
        """, (d["id"],)).fetchall()
        d["tasks"] = [dict(t) for t in tasks]
        d["total_tasks"] = len(tasks)
        d["completed_tasks"] = sum(1 for t in tasks if t["status"] in ("completed", "skipped"))
        result.append(d)
    return result
