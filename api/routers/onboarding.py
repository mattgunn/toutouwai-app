from fastapi import APIRouter, Depends, HTTPException
from ..db import new_id, now_iso
from ..deps import get_db, get_current_user

router = APIRouter()


# ── Templates ──────────────────────────────────────────────────────

@router.get("/onboarding/templates")
def list_templates(conn=Depends(get_db), _user=Depends(get_current_user)):
    rows = conn.execute("""
        SELECT ot.*, d.name as department_name
        FROM onboarding_templates ot
        LEFT JOIN departments d ON ot.department_id = d.id
        ORDER BY ot.name
    """).fetchall()
    return [dict(r) for r in rows]


@router.post("/onboarding/templates")
def create_template(body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    ts = now_iso()
    tid = new_id()
    conn.execute("""
        INSERT INTO onboarding_templates (id, name, description, department_id, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (tid, body["name"], body.get("description"), body.get("department_id"),
          body.get("is_active", 1), ts, ts))
    conn.commit()
    row = conn.execute("""
        SELECT ot.*, d.name as department_name
        FROM onboarding_templates ot
        LEFT JOIN departments d ON ot.department_id = d.id
        WHERE ot.id = ?
    """, (tid,)).fetchone()
    return dict(row)


@router.put("/onboarding/templates/{template_id}")
def update_template(template_id: str, body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    fields = ["name", "description", "department_id", "is_active"]
    updates = []
    values = []
    for f in fields:
        if f in body:
            updates.append(f"{f} = ?")
            values.append(body[f])
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    updates.append("updated_at = ?")
    values.append(now_iso())
    values.append(template_id)
    conn.execute(f"UPDATE onboarding_templates SET {', '.join(updates)} WHERE id = ?", values)
    conn.commit()
    row = conn.execute("""
        SELECT ot.*, d.name as department_name
        FROM onboarding_templates ot
        LEFT JOIN departments d ON ot.department_id = d.id
        WHERE ot.id = ?
    """, (template_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Template not found")
    return dict(row)


# ── Template Tasks ─────────────────────────────────────────────────

@router.get("/onboarding/templates/{template_id}/tasks")
def list_template_tasks(template_id: str, conn=Depends(get_db), _user=Depends(get_current_user)):
    rows = conn.execute("""
        SELECT * FROM onboarding_template_tasks
        WHERE template_id = ?
        ORDER BY sort_order, created_at
    """, (template_id,)).fetchall()
    return [dict(r) for r in rows]


@router.post("/onboarding/templates/{template_id}/tasks")
def create_template_task(template_id: str, body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    ts = now_iso()
    tid = new_id()
    conn.execute("""
        INSERT INTO onboarding_template_tasks (id, template_id, title, description, assigned_to_role, due_days, sort_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (tid, template_id, body["title"], body.get("description"),
          body.get("assigned_to_role", "hr"), body.get("due_days", 0),
          body.get("sort_order", 0), ts, ts))
    conn.commit()
    row = conn.execute("SELECT * FROM onboarding_template_tasks WHERE id = ?", (tid,)).fetchone()
    return dict(row)


@router.put("/onboarding/templates/tasks/{task_id}")
def update_template_task(task_id: str, body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    fields = ["title", "description", "assigned_to_role", "due_days", "sort_order"]
    updates = []
    values = []
    for f in fields:
        if f in body:
            updates.append(f"{f} = ?")
            values.append(body[f])
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    updates.append("updated_at = ?")
    values.append(now_iso())
    values.append(task_id)
    conn.execute(f"UPDATE onboarding_template_tasks SET {', '.join(updates)} WHERE id = ?", values)
    conn.commit()
    row = conn.execute("SELECT * FROM onboarding_template_tasks WHERE id = ?", (task_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Template task not found")
    return dict(row)


@router.delete("/onboarding/templates/tasks/{task_id}")
def delete_template_task(task_id: str, conn=Depends(get_db), _user=Depends(get_current_user)):
    conn.execute("DELETE FROM onboarding_template_tasks WHERE id = ?", (task_id,))
    conn.commit()
    return {"ok": True}


# ── Checklists ─────────────────────────────────────────────────────

@router.get("/onboarding/checklists")
def list_checklists(
    employee_id: str = "",
    conn=Depends(get_db),
    _user=Depends(get_current_user),
):
    conditions, params = [], []
    if employee_id:
        conditions.append("oc.employee_id = ?")
        params.append(employee_id)
    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    rows = conn.execute(f"""
        SELECT oc.*, e.first_name || ' ' || e.last_name as employee_name,
               ot.name as template_name
        FROM onboarding_checklists oc
        JOIN employees e ON oc.employee_id = e.id
        LEFT JOIN onboarding_templates ot ON oc.template_id = ot.id
        {where}
        ORDER BY oc.created_at DESC
    """, params).fetchall()

    result = []
    for r in rows:
        d = dict(r)
        # Attach tasks and compute progress
        tasks = conn.execute("""
            SELECT * FROM onboarding_tasks
            WHERE checklist_id = ?
            ORDER BY sort_order, created_at
        """, (d["id"],)).fetchall()
        d["tasks"] = [dict(t) for t in tasks]
        total = len(tasks)
        done = sum(1 for t in tasks if t["status"] in ("completed", "skipped"))
        d["total_tasks"] = total
        d["completed_tasks"] = done
        result.append(d)
    return result


@router.post("/onboarding/checklists")
def create_checklist(body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    ts = now_iso()
    cid = new_id()
    employee_id = body["employee_id"]
    template_id = body.get("template_id")

    conn.execute("""
        INSERT INTO onboarding_checklists (id, employee_id, template_id, status, started_at, created_at, updated_at)
        VALUES (?, ?, ?, 'in_progress', ?, ?, ?)
    """, (cid, employee_id, template_id, ts, ts, ts))

    # Copy tasks from template
    if template_id:
        # Get employee start_date for due_date calculation
        emp = conn.execute("SELECT start_date FROM employees WHERE id = ?", (employee_id,)).fetchone()
        start_date = emp["start_date"] if emp else None

        template_tasks = conn.execute("""
            SELECT * FROM onboarding_template_tasks
            WHERE template_id = ?
            ORDER BY sort_order
        """, (template_id,)).fetchall()

        for tt in template_tasks:
            due_date = None
            if start_date and tt["due_days"]:
                from datetime import datetime, timedelta
                try:
                    sd = datetime.fromisoformat(start_date)
                    due_date = (sd + timedelta(days=tt["due_days"])).strftime("%Y-%m-%d")
                except (ValueError, TypeError):
                    pass

            conn.execute("""
                INSERT INTO onboarding_tasks (id, checklist_id, title, description, assigned_to_role, due_date, status, sort_order, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
            """, (new_id(), cid, tt["title"], tt["description"],
                  tt["assigned_to_role"], due_date, tt["sort_order"], ts, ts))

    conn.commit()

    row = conn.execute("""
        SELECT oc.*, e.first_name || ' ' || e.last_name as employee_name,
               ot.name as template_name
        FROM onboarding_checklists oc
        JOIN employees e ON oc.employee_id = e.id
        LEFT JOIN onboarding_templates ot ON oc.template_id = ot.id
        WHERE oc.id = ?
    """, (cid,)).fetchone()
    d = dict(row)
    tasks = conn.execute("SELECT * FROM onboarding_tasks WHERE checklist_id = ? ORDER BY sort_order", (cid,)).fetchall()
    d["tasks"] = [dict(t) for t in tasks]
    d["total_tasks"] = len(tasks)
    d["completed_tasks"] = 0
    return d


# ── Checklist Tasks ────────────────────────────────────────────────

@router.put("/onboarding/tasks/{task_id}")
def update_task(task_id: str, body: dict, conn=Depends(get_db), user=Depends(get_current_user)):
    fields = ["title", "description", "assigned_to_role", "assigned_to_id", "due_date", "status", "sort_order"]
    updates = []
    values = []
    for f in fields:
        if f in body:
            updates.append(f"{f} = ?")
            values.append(body[f])

    # If marking as completed, set completed_at and completed_by
    if body.get("status") == "completed":
        updates.append("completed_at = ?")
        values.append(now_iso())
        updates.append("completed_by = ?")
        values.append(user["id"])
    elif body.get("status") in ("pending", "in_progress"):
        updates.append("completed_at = ?")
        values.append(None)
        updates.append("completed_by = ?")
        values.append(None)

    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    updates.append("updated_at = ?")
    values.append(now_iso())
    values.append(task_id)
    conn.execute(f"UPDATE onboarding_tasks SET {', '.join(updates)} WHERE id = ?", values)

    # Check if all tasks in the checklist are done, then update checklist status
    task = conn.execute("SELECT checklist_id FROM onboarding_tasks WHERE id = ?", (task_id,)).fetchone()
    if task:
        checklist_id = task["checklist_id"]
        stats = conn.execute("""
            SELECT COUNT(*) as total,
                   SUM(CASE WHEN status IN ('completed', 'skipped') THEN 1 ELSE 0 END) as done
            FROM onboarding_tasks WHERE checklist_id = ?
        """, (checklist_id,)).fetchone()
        if stats["total"] > 0 and stats["done"] == stats["total"]:
            conn.execute(
                "UPDATE onboarding_checklists SET status = 'completed', completed_at = ?, updated_at = ? WHERE id = ?",
                (now_iso(), now_iso(), checklist_id),
            )
        else:
            conn.execute(
                "UPDATE onboarding_checklists SET status = 'in_progress', completed_at = NULL, updated_at = ? WHERE id = ?",
                (now_iso(), checklist_id),
            )

    conn.commit()
    row = conn.execute("SELECT * FROM onboarding_tasks WHERE id = ?", (task_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Task not found")
    return dict(row)
