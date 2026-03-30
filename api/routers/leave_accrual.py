from fastapi import APIRouter, Depends, HTTPException
from ..db import new_id, now_iso
from ..deps import get_db, get_current_user

router = APIRouter()


@router.get("/leave/accrual-policies")
def list_accrual_policies(conn=Depends(get_db), _user=Depends(get_current_user)):
    rows = conn.execute("""
        SELECT ap.*,
               lt.name as leave_type_name
        FROM leave_accrual_policies ap
        JOIN leave_types lt ON ap.leave_type_id = lt.id
        ORDER BY ap.name
    """).fetchall()
    return [dict(r) for r in rows]


@router.post("/leave/accrual-policies")
def create_accrual_policy(body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    if not body.get("leave_type_id"):
        raise HTTPException(status_code=400, detail="leave_type_id is required")
    if not body.get("name"):
        raise HTTPException(status_code=400, detail="name is required")
    if body.get("accrual_rate") is None:
        raise HTTPException(status_code=400, detail="accrual_rate is required")
    if not body.get("accrual_frequency"):
        raise HTTPException(status_code=400, detail="accrual_frequency is required")
    if not conn.execute("SELECT id FROM leave_types WHERE id = ?", (body["leave_type_id"],)).fetchone():
        raise HTTPException(status_code=400, detail="leave_type_id does not exist")
    ts = now_iso()
    pid = new_id()
    conn.execute("""
        INSERT INTO leave_accrual_policies (id, leave_type_id, name, accrual_rate, accrual_frequency, max_balance, carry_over_limit, waiting_period_days, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (pid, body["leave_type_id"], body["name"], body["accrual_rate"],
          body["accrual_frequency"], body.get("max_balance"), body.get("carry_over_limit"),
          body.get("waiting_period_days", 0), body.get("is_active", 1), ts, ts))
    conn.commit()
    row = conn.execute("""
        SELECT ap.*,
               lt.name as leave_type_name
        FROM leave_accrual_policies ap
        JOIN leave_types lt ON ap.leave_type_id = lt.id
        WHERE ap.id = ?
    """, (pid,)).fetchone()
    return dict(row)


@router.put("/leave/accrual-policies/{policy_id}")
def update_accrual_policy(policy_id: str, body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    if "leave_type_id" in body and body["leave_type_id"]:
        if not conn.execute("SELECT id FROM leave_types WHERE id = ?", (body["leave_type_id"],)).fetchone():
            raise HTTPException(status_code=400, detail="leave_type_id does not exist")
    fields = ["leave_type_id", "name", "accrual_rate", "accrual_frequency", "max_balance", "carry_over_limit", "waiting_period_days", "is_active"]
    updates, values = [], []
    for f in fields:
        if f in body:
            updates.append(f"{f} = ?")
            values.append(body[f])
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    updates.append("updated_at = ?")
    values.extend([now_iso(), policy_id])
    conn.execute(f"UPDATE leave_accrual_policies SET {', '.join(updates)} WHERE id = ?", values)
    conn.commit()
    row = conn.execute("""
        SELECT ap.*,
               lt.name as leave_type_name
        FROM leave_accrual_policies ap
        JOIN leave_types lt ON ap.leave_type_id = lt.id
        WHERE ap.id = ?
    """, (policy_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Accrual policy not found")
    return dict(row)


@router.delete("/leave/accrual-policies/{policy_id}")
def delete_accrual_policy(policy_id: str, conn=Depends(get_db), _user=Depends(get_current_user)):
    conn.execute("DELETE FROM leave_accrual_policies WHERE id = ?", (policy_id,))
    conn.commit()
    return {"ok": True}
