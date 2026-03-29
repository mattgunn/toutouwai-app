from fastapi import APIRouter, Depends, HTTPException
from ..db import new_id, now_iso
from ..deps import get_db, get_current_user

router = APIRouter()


@router.get("/succession")
def list_plans(conn=Depends(get_db), _user=Depends(get_current_user)):
    rows = conn.execute("""
        SELECT sp.*, p.title as position_title, d.name as department_name,
               e.first_name || ' ' || e.last_name as incumbent_name,
               (SELECT COUNT(*) FROM succession_candidates sc WHERE sc.plan_id = sp.id) as candidate_count
        FROM succession_plans sp
        JOIN positions p ON sp.position_id = p.id
        LEFT JOIN departments d ON p.department_id = d.id
        LEFT JOIN employees e ON sp.incumbent_id = e.id
        ORDER BY sp.created_at DESC
    """).fetchall()
    return [dict(r) for r in rows]


@router.post("/succession")
def create_plan(body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    ts = now_iso()
    pid = new_id()
    conn.execute("""
        INSERT INTO succession_plans (id, position_id, incumbent_id, risk_of_loss,
            impact_of_loss, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        pid, body["position_id"], body.get("incumbent_id"),
        body.get("risk_of_loss", "low"), body.get("impact_of_loss", "low"),
        body.get("notes"), ts, ts,
    ))
    conn.commit()
    row = conn.execute("""
        SELECT sp.*, p.title as position_title, d.name as department_name,
               e.first_name || ' ' || e.last_name as incumbent_name,
               (SELECT COUNT(*) FROM succession_candidates sc WHERE sc.plan_id = sp.id) as candidate_count
        FROM succession_plans sp
        JOIN positions p ON sp.position_id = p.id
        LEFT JOIN departments d ON p.department_id = d.id
        LEFT JOIN employees e ON sp.incumbent_id = e.id
        WHERE sp.id = ?
    """, (pid,)).fetchone()
    return dict(row)


@router.put("/succession/{plan_id}")
def update_plan(plan_id: str, body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    fields = ["position_id", "incumbent_id", "risk_of_loss", "impact_of_loss", "notes"]
    updates, values = [], []
    for f in fields:
        if f in body:
            updates.append(f"{f} = ?")
            values.append(body[f])
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    updates.append("updated_at = ?")
    values.extend([now_iso(), plan_id])
    conn.execute(f"UPDATE succession_plans SET {', '.join(updates)} WHERE id = ?", values)
    conn.commit()
    row = conn.execute("""
        SELECT sp.*, p.title as position_title, d.name as department_name,
               e.first_name || ' ' || e.last_name as incumbent_name,
               (SELECT COUNT(*) FROM succession_candidates sc WHERE sc.plan_id = sp.id) as candidate_count
        FROM succession_plans sp
        JOIN positions p ON sp.position_id = p.id
        LEFT JOIN departments d ON p.department_id = d.id
        LEFT JOIN employees e ON sp.incumbent_id = e.id
        WHERE sp.id = ?
    """, (plan_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Succession plan not found")
    return dict(row)


# ── Candidates ───────────────────────────────────────────────────────

@router.get("/succession/{plan_id}/candidates")
def list_candidates(plan_id: str, conn=Depends(get_db), _user=Depends(get_current_user)):
    rows = conn.execute("""
        SELECT sc.*, e.first_name || ' ' || e.last_name as employee_name,
               p.title as current_position
        FROM succession_candidates sc
        JOIN employees e ON sc.employee_id = e.id
        LEFT JOIN positions p ON e.position_id = p.id
        WHERE sc.plan_id = ?
        ORDER BY sc.readiness, e.last_name
    """, (plan_id,)).fetchall()
    return [dict(r) for r in rows]


@router.post("/succession/{plan_id}/candidates")
def add_candidate(plan_id: str, body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    if not conn.execute("SELECT id FROM employees WHERE id = ?", (body["employee_id"],)).fetchone():
        raise HTTPException(status_code=400, detail="employee_id does not exist")
    ts = now_iso()
    cid = new_id()
    conn.execute("""
        INSERT INTO succession_candidates (id, plan_id, employee_id, readiness, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        cid, plan_id, body["employee_id"],
        body.get("readiness", "not_ready"), body.get("notes"), ts, ts,
    ))
    conn.commit()
    row = conn.execute("""
        SELECT sc.*, e.first_name || ' ' || e.last_name as employee_name,
               p.title as current_position
        FROM succession_candidates sc
        JOIN employees e ON sc.employee_id = e.id
        LEFT JOIN positions p ON e.position_id = p.id
        WHERE sc.id = ?
    """, (cid,)).fetchone()
    return dict(row)


@router.put("/succession/candidates/{candidate_id}")
def update_candidate(candidate_id: str, body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    fields = ["readiness", "notes"]
    updates, values = [], []
    for f in fields:
        if f in body:
            updates.append(f"{f} = ?")
            values.append(body[f])
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    updates.append("updated_at = ?")
    values.extend([now_iso(), candidate_id])
    conn.execute(f"UPDATE succession_candidates SET {', '.join(updates)} WHERE id = ?", values)
    conn.commit()
    row = conn.execute("""
        SELECT sc.*, e.first_name || ' ' || e.last_name as employee_name,
               p.title as current_position
        FROM succession_candidates sc
        JOIN employees e ON sc.employee_id = e.id
        LEFT JOIN positions p ON e.position_id = p.id
        WHERE sc.id = ?
    """, (candidate_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return dict(row)


@router.delete("/succession/candidates/{candidate_id}")
def remove_candidate(candidate_id: str, conn=Depends(get_db), _user=Depends(get_current_user)):
    conn.execute("DELETE FROM succession_candidates WHERE id = ?", (candidate_id,))
    conn.commit()
    return {"ok": True}
