from fastapi import APIRouter, Depends, HTTPException
from ..db import new_id, now_iso
from ..deps import get_db, get_current_user

router = APIRouter()


@router.get("/assets")
def list_assets(
    status: str | None = None,
    assigned_to: str | None = None,
    conn=Depends(get_db),
    _user=Depends(get_current_user),
):
    query = """
        SELECT a.*,
               e.first_name || ' ' || e.last_name as assigned_to_name
        FROM assets a
        LEFT JOIN employees e ON a.assigned_to = e.id
    """
    conditions, params = [], []
    if status:
        conditions.append("a.status = ?")
        params.append(status)
    if assigned_to:
        conditions.append("a.assigned_to = ?")
        params.append(assigned_to)
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    query += " ORDER BY a.created_at DESC"
    rows = conn.execute(query, params).fetchall()
    return [dict(r) for r in rows]


@router.post("/assets")
def create_asset(body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    if not body.get("name"):
        raise HTTPException(status_code=400, detail="name is required")
    if not body.get("category"):
        raise HTTPException(status_code=400, detail="category is required")
    if body.get("assigned_to"):
        if not conn.execute("SELECT id FROM employees WHERE id = ?", (body["assigned_to"],)).fetchone():
            raise HTTPException(status_code=400, detail="assigned_to employee does not exist")
    ts = now_iso()
    aid = new_id()
    conn.execute("""
        INSERT INTO assets (id, name, asset_tag, category, serial_number, purchase_date, purchase_cost, status, assigned_to, assigned_date, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (aid, body["name"], body.get("asset_tag"), body["category"],
          body.get("serial_number"), body.get("purchase_date"), body.get("purchase_cost"),
          body.get("status", "available"), body.get("assigned_to"),
          body.get("assigned_date"), body.get("notes"), ts, ts))
    conn.commit()
    row = conn.execute("""
        SELECT a.*,
               e.first_name || ' ' || e.last_name as assigned_to_name
        FROM assets a
        LEFT JOIN employees e ON a.assigned_to = e.id
        WHERE a.id = ?
    """, (aid,)).fetchone()
    return dict(row)


@router.put("/assets/{asset_id}")
def update_asset(asset_id: str, body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    if "assigned_to" in body and body["assigned_to"]:
        if not conn.execute("SELECT id FROM employees WHERE id = ?", (body["assigned_to"],)).fetchone():
            raise HTTPException(status_code=400, detail="assigned_to employee does not exist")
    fields = ["name", "asset_tag", "category", "serial_number", "purchase_date", "purchase_cost", "status", "assigned_to", "assigned_date", "notes"]
    updates, values = [], []
    for f in fields:
        if f in body:
            updates.append(f"{f} = ?")
            values.append(body[f])
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    updates.append("updated_at = ?")
    values.extend([now_iso(), asset_id])
    conn.execute(f"UPDATE assets SET {', '.join(updates)} WHERE id = ?", values)
    conn.commit()
    row = conn.execute("""
        SELECT a.*,
               e.first_name || ' ' || e.last_name as assigned_to_name
        FROM assets a
        LEFT JOIN employees e ON a.assigned_to = e.id
        WHERE a.id = ?
    """, (asset_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Asset not found")
    return dict(row)


@router.delete("/assets/{asset_id}")
def delete_asset(asset_id: str, conn=Depends(get_db), _user=Depends(get_current_user)):
    conn.execute("DELETE FROM assets WHERE id = ?", (asset_id,))
    conn.commit()
    return {"ok": True}
