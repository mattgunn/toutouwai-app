from fastapi import APIRouter, Depends, HTTPException
from ..db import new_id, now_iso
from ..deps import get_db, get_current_user

router = APIRouter()


@router.get("/leave/types")
def list_leave_types(conn=Depends(get_db), _user=Depends(get_current_user)):
    rows = conn.execute("SELECT * FROM leave_types ORDER BY name").fetchall()
    return [dict(r) for r in rows]


@router.get("/leave/requests")
def list_leave_requests(
    employee_id: str = "",
    status: str = "",
    conn=Depends(get_db),
    _user=Depends(get_current_user),
):
    conditions, params = [], []
    if employee_id:
        conditions.append("lr.employee_id = ?")
        params.append(employee_id)
    if status:
        conditions.append("lr.status = ?")
        params.append(status)
    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    rows = conn.execute(f"""
        SELECT lr.*, e.first_name || ' ' || e.last_name as employee_name,
               lt.name as leave_type_name
        FROM leave_requests lr
        JOIN employees e ON lr.employee_id = e.id
        JOIN leave_types lt ON lr.leave_type_id = lt.id
        {where}
        ORDER BY lr.created_at DESC
    """, params).fetchall()
    return [dict(r) for r in rows]


@router.post("/leave/requests")
def create_leave_request(body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    if not conn.execute("SELECT id FROM employees WHERE id = ?", (body["employee_id"],)).fetchone():
        raise HTTPException(status_code=400, detail="employee_id does not exist")
    if not conn.execute("SELECT id FROM leave_types WHERE id = ?", (body["leave_type_id"],)).fetchone():
        raise HTTPException(status_code=400, detail="leave_type_id does not exist")
    ts = now_iso()
    lid = new_id()
    conn.execute("""
        INSERT INTO leave_requests (id, employee_id, leave_type_id, start_date, end_date, days, status, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
    """, (lid, body["employee_id"], body["leave_type_id"], body["start_date"], body["end_date"],
          body.get("days", 0), body.get("notes"), ts, ts))
    conn.commit()
    row = conn.execute("""
        SELECT lr.*, e.first_name || ' ' || e.last_name as employee_name, lt.name as leave_type_name
        FROM leave_requests lr JOIN employees e ON lr.employee_id = e.id JOIN leave_types lt ON lr.leave_type_id = lt.id
        WHERE lr.id = ?
    """, (lid,)).fetchone()
    return dict(row)


@router.put("/leave/requests/{request_id}/status")
def update_leave_status(request_id: str, body: dict, conn=Depends(get_db), user=Depends(get_current_user)):
    new_status = body["status"]
    if new_status not in ("approved", "rejected", "cancelled"):
        raise HTTPException(status_code=400, detail="Invalid status")
    conn.execute(
        "UPDATE leave_requests SET status = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ? WHERE id = ?",
        (new_status, user["id"], now_iso(), now_iso(), request_id),
    )
    conn.commit()
    row = conn.execute("""
        SELECT lr.*, e.first_name || ' ' || e.last_name as employee_name, lt.name as leave_type_name
        FROM leave_requests lr JOIN employees e ON lr.employee_id = e.id JOIN leave_types lt ON lr.leave_type_id = lt.id
        WHERE lr.id = ?
    """, (request_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Leave request not found")
    return dict(row)


@router.get("/leave/balances")
def get_leave_balances(conn=Depends(get_db), _user=Depends(get_current_user)):
    rows = conn.execute("""
        SELECT e.id as employee_id, e.first_name || ' ' || e.last_name as employee_name,
               lt.id as leave_type_id, lt.name as leave_type_name,
               lt.days_per_year as entitled,
               COALESCE(SUM(CASE WHEN lr.status = 'approved' THEN lr.days ELSE 0 END), 0) as used
        FROM employees e
        CROSS JOIN leave_types lt
        LEFT JOIN leave_requests lr ON lr.employee_id = e.id AND lr.leave_type_id = lt.id
        WHERE e.status = 'active' AND lt.is_active = 1
        GROUP BY e.id, lt.id
        ORDER BY e.last_name, e.first_name, lt.name
    """).fetchall()
    result = []
    for r in rows:
        d = dict(r)
        d["remaining"] = d["entitled"] - d["used"]
        result.append(d)
    return result
