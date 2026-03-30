from fastapi import APIRouter, Depends, HTTPException
from ..db import new_id, now_iso
from ..deps import get_db, get_current_user

router = APIRouter()


@router.get("/delegations")
def list_delegations(
    delegator_id: str | None = None,
    delegate_id: str | None = None,
    is_active: int | None = None,
    conn=Depends(get_db),
    _user=Depends(get_current_user),
):
    query = """
        SELECT d.*,
               u1.name as delegator_name,
               u2.name as delegate_name
        FROM delegations d
        LEFT JOIN users u1 ON d.delegator_id = u1.id
        LEFT JOIN users u2 ON d.delegate_id = u2.id
    """
    conditions, params = [], []
    if delegator_id:
        conditions.append("d.delegator_id = ?")
        params.append(delegator_id)
    if delegate_id:
        conditions.append("d.delegate_id = ?")
        params.append(delegate_id)
    if is_active is not None:
        conditions.append("d.is_active = ?")
        params.append(is_active)
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    query += " ORDER BY d.created_at DESC"
    rows = conn.execute(query, params).fetchall()
    return [dict(r) for r in rows]


@router.get("/delegations/active")
def list_active_delegations(conn=Depends(get_db), _user=Depends(get_current_user)):
    ts = now_iso()
    rows = conn.execute("""
        SELECT d.*,
               u1.name as delegator_name,
               u2.name as delegate_name
        FROM delegations d
        LEFT JOIN users u1 ON d.delegator_id = u1.id
        LEFT JOIN users u2 ON d.delegate_id = u2.id
        WHERE d.is_active = 1
          AND (d.start_date IS NULL OR d.start_date <= ?)
          AND (d.end_date IS NULL OR d.end_date >= ?)
        ORDER BY d.created_at DESC
    """, (ts, ts)).fetchall()
    return [dict(r) for r in rows]


@router.get("/delegations/{delegation_id}")
def get_delegation(delegation_id: str, conn=Depends(get_db), _user=Depends(get_current_user)):
    row = conn.execute("""
        SELECT d.*,
               u1.name as delegator_name,
               u2.name as delegate_name
        FROM delegations d
        LEFT JOIN users u1 ON d.delegator_id = u1.id
        LEFT JOIN users u2 ON d.delegate_id = u2.id
        WHERE d.id = ?
    """, (delegation_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Delegation not found")
    return dict(row)


@router.post("/delegations")
def create_delegation(body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    if not body.get("delegator_id"):
        raise HTTPException(status_code=400, detail="delegator_id is required")
    if not body.get("delegate_id"):
        raise HTTPException(status_code=400, detail="delegate_id is required")
    if not body.get("entity_type"):
        raise HTTPException(status_code=400, detail="entity_type is required")
    if not conn.execute("SELECT id FROM users WHERE id = ?", (body["delegator_id"],)).fetchone():
        raise HTTPException(status_code=400, detail="delegator_id does not exist")
    if not conn.execute("SELECT id FROM users WHERE id = ?", (body["delegate_id"],)).fetchone():
        raise HTTPException(status_code=400, detail="delegate_id does not exist")
    ts = now_iso()
    did = new_id()
    conn.execute("""
        INSERT INTO delegations (id, delegator_id, delegate_id, entity_type,
            is_active, start_date, end_date, reason, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (did, body["delegator_id"], body["delegate_id"], body["entity_type"],
          body.get("is_active", 1),
          body.get("start_date"), body.get("end_date"), body.get("reason"),
          body.get("notes"), ts, ts))
    conn.commit()
    row = conn.execute("""
        SELECT d.*,
               u1.name as delegator_name,
               u2.name as delegate_name
        FROM delegations d
        LEFT JOIN users u1 ON d.delegator_id = u1.id
        LEFT JOIN users u2 ON d.delegate_id = u2.id
        WHERE d.id = ?
    """, (did,)).fetchone()
    return dict(row)


@router.put("/delegations/{delegation_id}")
def update_delegation(delegation_id: str, body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    fields = ["entity_type", "is_active", "start_date", "end_date", "reason", "notes"]
    updates, values = [], []
    for f in fields:
        if f in body:
            updates.append(f"{f} = ?")
            values.append(body[f])
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    updates.append("updated_at = ?")
    values.append(now_iso())
    values.append(delegation_id)
    conn.execute(f"UPDATE delegations SET {', '.join(updates)} WHERE id = ?", values)
    conn.commit()
    row = conn.execute("""
        SELECT d.*,
               u1.name as delegator_name,
               u2.name as delegate_name
        FROM delegations d
        LEFT JOIN users u1 ON d.delegator_id = u1.id
        LEFT JOIN users u2 ON d.delegate_id = u2.id
        WHERE d.id = ?
    """, (delegation_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Delegation not found")
    return dict(row)


@router.delete("/delegations/{delegation_id}")
def delete_delegation(delegation_id: str, conn=Depends(get_db), _user=Depends(get_current_user)):
    conn.execute("DELETE FROM delegations WHERE id = ?", (delegation_id,))
    conn.commit()
    return {"ok": True}
