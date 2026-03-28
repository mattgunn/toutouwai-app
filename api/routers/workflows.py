from fastapi import APIRouter, Depends, HTTPException, Query
from ..db import new_id, now_iso
from ..deps import get_db, get_current_user

router = APIRouter()


# --- Definitions ---

@router.get("/workflows/definitions")
def list_definitions(conn=Depends(get_db), _user=Depends(get_current_user)):
    rows = conn.execute("""
        SELECT wd.*, COUNT(ws.id) as step_count
        FROM workflow_definitions wd
        LEFT JOIN workflow_steps ws ON ws.definition_id = wd.id
        GROUP BY wd.id
        ORDER BY wd.name
    """).fetchall()
    return [dict(r) for r in rows]


@router.post("/workflows/definitions")
def create_definition(body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    ts = now_iso()
    did = new_id()
    conn.execute("""
        INSERT INTO workflow_definitions (id, name, trigger_entity, trigger_action, description, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (did, body["name"], body["trigger_entity"], body["trigger_action"],
          body.get("description"), body.get("is_active", 1), ts, ts))
    conn.commit()
    row = conn.execute("SELECT * FROM workflow_definitions WHERE id = ?", (did,)).fetchone()
    return dict(row)


@router.put("/workflows/definitions/{def_id}")
def update_definition(def_id: str, body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    fields = ["name", "trigger_entity", "trigger_action", "description", "is_active"]
    updates, values = [], []
    for f in fields:
        if f in body:
            updates.append(f"{f} = ?")
            values.append(body[f])
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    updates.append("updated_at = ?")
    values.append(now_iso())
    values.append(def_id)
    conn.execute(f"UPDATE workflow_definitions SET {', '.join(updates)} WHERE id = ?", values)
    conn.commit()
    row = conn.execute("SELECT * FROM workflow_definitions WHERE id = ?", (def_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Definition not found")
    return dict(row)


# --- Steps ---

@router.get("/workflows/definitions/{def_id}/steps")
def list_steps(def_id: str, conn=Depends(get_db), _user=Depends(get_current_user)):
    rows = conn.execute("""
        SELECT ws.*, u.name as approver_user_name
        FROM workflow_steps ws
        LEFT JOIN users u ON ws.approver_user_id = u.id
        WHERE ws.definition_id = ?
        ORDER BY ws.step_order
    """, (def_id,)).fetchall()
    return [dict(r) for r in rows]


@router.post("/workflows/definitions/{def_id}/steps")
def create_step(def_id: str, body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    ts = now_iso()
    sid = new_id()
    conn.execute("""
        INSERT INTO workflow_steps (id, definition_id, step_order, approver_type, approver_role, approver_user_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (sid, def_id, body.get("step_order", 1), body.get("approver_type", "manager"),
          body.get("approver_role"), body.get("approver_user_id"), ts, ts))
    conn.commit()
    row = conn.execute("""
        SELECT ws.*, u.name as approver_user_name
        FROM workflow_steps ws
        LEFT JOIN users u ON ws.approver_user_id = u.id
        WHERE ws.id = ?
    """, (sid,)).fetchone()
    return dict(row)


@router.put("/workflows/steps/{step_id}")
def update_step(step_id: str, body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    fields = ["step_order", "approver_type", "approver_role", "approver_user_id"]
    updates, values = [], []
    for f in fields:
        if f in body:
            updates.append(f"{f} = ?")
            values.append(body[f])
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    updates.append("updated_at = ?")
    values.append(now_iso())
    values.append(step_id)
    conn.execute(f"UPDATE workflow_steps SET {', '.join(updates)} WHERE id = ?", values)
    conn.commit()
    row = conn.execute("""
        SELECT ws.*, u.name as approver_user_name
        FROM workflow_steps ws
        LEFT JOIN users u ON ws.approver_user_id = u.id
        WHERE ws.id = ?
    """, (step_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Step not found")
    return dict(row)


@router.delete("/workflows/definitions/{def_id}")
def delete_definition(def_id: str, conn=Depends(get_db), _user=Depends(get_current_user)):
    conn.execute("DELETE FROM workflow_approvals WHERE instance_id IN (SELECT id FROM workflow_instances WHERE definition_id = ?)", (def_id,))
    conn.execute("DELETE FROM workflow_instances WHERE definition_id = ?", (def_id,))
    conn.execute("DELETE FROM workflow_steps WHERE definition_id = ?", (def_id,))
    conn.execute("DELETE FROM workflow_definitions WHERE id = ?", (def_id,))
    conn.commit()
    return {"ok": True}


@router.delete("/workflows/steps/{step_id}")
def delete_step(step_id: str, conn=Depends(get_db), _user=Depends(get_current_user)):
    conn.execute("DELETE FROM workflow_steps WHERE id = ?", (step_id,))
    conn.commit()
    return {"ok": True}


@router.post("/workflows/instances")
def create_instance(body: dict, conn=Depends(get_db), user=Depends(get_current_user)):
    ts = now_iso()
    iid = new_id()
    conn.execute("""
        INSERT INTO workflow_instances (id, definition_id, entity_type, entity_id, initiated_by, status, current_step, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (iid, body["definition_id"], body["entity_type"], body["entity_id"],
          user["id"], "pending", 1, ts, ts))
    conn.commit()
    row = conn.execute("""
        SELECT wi.*, wd.name as definition_name, u.name as initiated_by_name
        FROM workflow_instances wi
        LEFT JOIN workflow_definitions wd ON wi.definition_id = wd.id
        LEFT JOIN users u ON wi.initiated_by = u.id
        WHERE wi.id = ?
    """, (iid,)).fetchone()
    return dict(row)


# --- Instances ---

@router.get("/workflows/instances")
def list_instances(
    status: str = "",
    entity_type: str = "",
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    conn=Depends(get_db),
    _user=Depends(get_current_user),
):
    conditions, params = [], []
    if status:
        conditions.append("wi.status = ?")
        params.append(status)
    if entity_type:
        conditions.append("wi.entity_type = ?")
        params.append(entity_type)
    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    total = conn.execute(f"SELECT COUNT(*) FROM workflow_instances wi {where}", params).fetchone()[0]

    offset = (page - 1) * per_page
    rows = conn.execute(f"""
        SELECT wi.*, wd.name as definition_name, u.name as initiated_by_name
        FROM workflow_instances wi
        LEFT JOIN workflow_definitions wd ON wi.definition_id = wd.id
        LEFT JOIN users u ON wi.initiated_by = u.id
        {where}
        ORDER BY wi.created_at DESC
        LIMIT ? OFFSET ?
    """, params + [per_page, offset]).fetchall()

    return {
        "instances": [dict(r) for r in rows],
        "total": total,
        "page": page,
        "per_page": per_page,
    }


# --- Approvals ---

@router.get("/workflows/my-approvals")
def my_approvals(conn=Depends(get_db), user=Depends(get_current_user)):
    rows = conn.execute("""
        SELECT wa.*, wi.entity_type, wi.entity_id, wi.status as instance_status,
               wd.name as definition_name, u.name as initiated_by_name
        FROM workflow_approvals wa
        JOIN workflow_instances wi ON wa.instance_id = wi.id
        JOIN workflow_definitions wd ON wi.definition_id = wd.id
        LEFT JOIN users u ON wi.initiated_by = u.id
        WHERE wa.approver_id = ? AND wa.status = 'pending'
        ORDER BY wa.created_at DESC
    """, (user["id"],)).fetchall()
    return [dict(r) for r in rows]


@router.post("/workflows/approvals/{approval_id}/approve")
def approve(approval_id: str, body: dict = None, conn=Depends(get_db), user=Depends(get_current_user)):
    body = body or {}
    ts = now_iso()
    conn.execute("""
        UPDATE workflow_approvals SET status = 'approved', comments = ?, decided_at = ?, updated_at = ?
        WHERE id = ? AND approver_id = ?
    """, (body.get("comments"), ts, ts, approval_id, user["id"]))

    # Check if all approvals for instance are done
    approval = conn.execute("SELECT * FROM workflow_approvals WHERE id = ?", (approval_id,)).fetchone()
    if approval:
        pending = conn.execute("""
            SELECT COUNT(*) FROM workflow_approvals
            WHERE instance_id = ? AND status = 'pending'
        """, (approval["instance_id"],)).fetchone()[0]
        if pending == 0:
            conn.execute("""
                UPDATE workflow_instances SET status = 'approved', updated_at = ? WHERE id = ?
            """, (ts, approval["instance_id"]))

    conn.commit()
    return {"ok": True, "status": "approved"}


@router.post("/workflows/approvals/{approval_id}/reject")
def reject(approval_id: str, body: dict, conn=Depends(get_db), user=Depends(get_current_user)):
    ts = now_iso()
    conn.execute("""
        UPDATE workflow_approvals SET status = 'rejected', comments = ?, decided_at = ?, updated_at = ?
        WHERE id = ? AND approver_id = ?
    """, (body.get("comments", ""), ts, ts, approval_id, user["id"]))

    approval = conn.execute("SELECT * FROM workflow_approvals WHERE id = ?", (approval_id,)).fetchone()
    if approval:
        conn.execute("""
            UPDATE workflow_instances SET status = 'rejected', updated_at = ? WHERE id = ?
        """, (ts, approval["instance_id"]))

    conn.commit()
    return {"ok": True, "status": "rejected"}
