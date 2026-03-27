from fastapi import APIRouter, Depends, HTTPException, Query
from ..db import new_id, now_iso
from ..deps import get_db, get_current_user
from ..audit_helpers import log_audit

router = APIRouter()


@router.get("/employees")
def list_employees(
    search: str = "",
    department: str = "",
    status: str = "",
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    conn=Depends(get_db),
    _user=Depends(get_current_user),
):
    conditions = []
    params = []

    if search:
        conditions.append("(e.first_name || ' ' || e.last_name LIKE ? OR e.email LIKE ?)")
        params.extend([f"%{search}%", f"%{search}%"])
    if department:
        conditions.append("e.department_id = ?")
        params.append(department)
    if status:
        conditions.append("e.status = ?")
        params.append(status)

    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    total = conn.execute(f"SELECT COUNT(*) FROM employees e {where}", params).fetchone()[0]

    offset = (page - 1) * per_page
    rows = conn.execute(f"""
        SELECT e.*, d.name as department_name, p.title as position_title,
               m.first_name || ' ' || m.last_name as manager_name
        FROM employees e
        LEFT JOIN departments d ON e.department_id = d.id
        LEFT JOIN positions p ON e.position_id = p.id
        LEFT JOIN employees m ON e.manager_id = m.id
        {where}
        ORDER BY e.last_name, e.first_name
        LIMIT ? OFFSET ?
    """, params + [per_page, offset]).fetchall()

    return {
        "employees": [dict(r) for r in rows],
        "total": total,
        "page": page,
        "per_page": per_page,
    }


@router.get("/employees/{employee_id}")
def get_employee(employee_id: str, conn=Depends(get_db), _user=Depends(get_current_user)):
    row = conn.execute("""
        SELECT e.*, d.name as department_name, p.title as position_title,
               m.first_name || ' ' || m.last_name as manager_name
        FROM employees e
        LEFT JOIN departments d ON e.department_id = d.id
        LEFT JOIN positions p ON e.position_id = p.id
        LEFT JOIN employees m ON e.manager_id = m.id
        WHERE e.id = ?
    """, (employee_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Employee not found")
    return dict(row)


@router.post("/employees")
def create_employee(body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    ts = now_iso()
    eid = new_id()
    conn.execute("""
        INSERT INTO employees (id, first_name, last_name, email, phone, department_id, position_id,
            manager_id, start_date, status, avatar_url, address, date_of_birth, emergency_contact, notes,
            created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        eid, body["first_name"], body["last_name"], body["email"],
        body.get("phone"), body.get("department_id"), body.get("position_id"),
        body.get("manager_id"), body.get("start_date"), body.get("status", "active"),
        body.get("avatar_url"), body.get("address"), body.get("date_of_birth"),
        body.get("emergency_contact"), body.get("notes"), ts, ts,
    ))
    log_audit(conn, "employee", eid, "create", _user)
    conn.commit()
    return get_employee(eid, conn=conn, _user=_user)


@router.put("/employees/{employee_id}")
def update_employee(employee_id: str, body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    # Fetch old values for audit
    old_row = conn.execute("SELECT * FROM employees WHERE id = ?", (employee_id,)).fetchone()
    old_data = dict(old_row) if old_row else {}

    fields = ["first_name", "last_name", "email", "phone", "department_id", "position_id",
              "manager_id", "start_date", "end_date", "status", "avatar_url", "address",
              "date_of_birth", "emergency_contact", "notes"]
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
    values.append(employee_id)
    conn.execute(f"UPDATE employees SET {', '.join(updates)} WHERE id = ?", values)

    # Log audit for each changed field
    for f in fields:
        if f in body and body[f] != old_data.get(f):
            log_audit(conn, "employee", employee_id, "update", _user,
                      field_name=f, old_value=old_data.get(f), new_value=body[f])

    conn.commit()
    return get_employee(employee_id, conn=conn, _user=_user)
