from fastapi import APIRouter, Depends, HTTPException, Query
from ..db import new_id, now_iso
from ..deps import get_db, get_current_user

router = APIRouter()


@router.get("/documents")
def list_documents(
    employee_id: str = "",
    category: str = "",
    conn=Depends(get_db),
    _user=Depends(get_current_user),
):
    conditions, params = [], []
    if employee_id:
        conditions.append("doc.employee_id = ?")
        params.append(employee_id)
    if category:
        conditions.append("doc.category = ?")
        params.append(category)
    where = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    rows = conn.execute(f"""
        SELECT doc.*, e.first_name || ' ' || e.last_name as employee_name,
               u.name as uploaded_by_name
        FROM documents doc
        LEFT JOIN employees e ON doc.employee_id = e.id
        LEFT JOIN users u ON doc.uploaded_by = u.id
        {where}
        ORDER BY doc.created_at DESC
    """, params).fetchall()
    return [dict(r) for r in rows]


@router.post("/documents")
def create_document(body: dict, conn=Depends(get_db), user=Depends(get_current_user)):
    if body.get("employee_id"):
        if not conn.execute("SELECT id FROM employees WHERE id = ?", (body["employee_id"],)).fetchone():
            raise HTTPException(status_code=400, detail="employee_id does not exist")
    ts = now_iso()
    did = new_id()
    conn.execute("""
        INSERT INTO documents (id, employee_id, name, file_path, file_size, mime_type, category, description, uploaded_by, expiry_date, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (did, body.get("employee_id"), body["name"], body.get("file_path"),
          body.get("file_size"), body.get("mime_type"), body.get("category", "general"),
          body.get("description"), user["id"], body.get("expiry_date"), ts, ts))
    conn.commit()
    row = conn.execute("""
        SELECT doc.*, e.first_name || ' ' || e.last_name as employee_name,
               u.name as uploaded_by_name
        FROM documents doc
        LEFT JOIN employees e ON doc.employee_id = e.id
        LEFT JOIN users u ON doc.uploaded_by = u.id
        WHERE doc.id = ?
    """, (did,)).fetchone()
    return dict(row)


@router.put("/documents/{document_id}")
def update_document(document_id: str, body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    fields = ["employee_id", "name", "file_path", "file_size", "mime_type", "category", "description", "expiry_date"]
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
    values.append(document_id)
    conn.execute(f"UPDATE documents SET {', '.join(updates)} WHERE id = ?", values)
    conn.commit()
    row = conn.execute("""
        SELECT doc.*, e.first_name || ' ' || e.last_name as employee_name,
               u.name as uploaded_by_name
        FROM documents doc
        LEFT JOIN employees e ON doc.employee_id = e.id
        LEFT JOIN users u ON doc.uploaded_by = u.id
        WHERE doc.id = ?
    """, (document_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Document not found")
    return dict(row)


@router.delete("/documents/{document_id}")
def delete_document(document_id: str, conn=Depends(get_db), _user=Depends(get_current_user)):
    conn.execute("DELETE FROM documents WHERE id = ?", (document_id,))
    conn.commit()
    return {"ok": True}


@router.get("/documents/expiring")
def list_expiring_documents(
    days: int = Query(30, ge=1),
    conn=Depends(get_db),
    _user=Depends(get_current_user),
):
    rows = conn.execute("""
        SELECT doc.*, e.first_name || ' ' || e.last_name as employee_name,
               u.name as uploaded_by_name
        FROM documents doc
        LEFT JOIN employees e ON doc.employee_id = e.id
        LEFT JOIN users u ON doc.uploaded_by = u.id
        WHERE doc.expiry_date IS NOT NULL
          AND doc.expiry_date <= date('now', '+' || ? || ' days')
        ORDER BY doc.expiry_date ASC
    """, (days,)).fetchall()
    return [dict(r) for r in rows]
