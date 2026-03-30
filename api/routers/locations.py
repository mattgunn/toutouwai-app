from fastapi import APIRouter, Depends, HTTPException
from ..db import new_id, now_iso
from ..deps import get_db, get_current_user

router = APIRouter()


@router.get("/locations")
def list_locations(conn=Depends(get_db), _user=Depends(get_current_user)):
    rows = conn.execute("""
        SELECT * FROM locations ORDER BY name
    """).fetchall()
    return [dict(r) for r in rows]


@router.post("/locations")
def create_location(body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    if not body.get("name"):
        raise HTTPException(status_code=400, detail="name is required")
    ts = now_iso()
    lid = new_id()
    conn.execute("""
        INSERT INTO locations (id, name, address, city, state, country, postal_code, timezone, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (lid, body["name"], body.get("address"), body.get("city"), body.get("state"),
          body.get("country"), body.get("postal_code"), body.get("timezone"),
          body.get("is_active", 1), ts, ts))
    conn.commit()
    row = conn.execute("SELECT * FROM locations WHERE id = ?", (lid,)).fetchone()
    return dict(row)


@router.put("/locations/{location_id}")
def update_location(location_id: str, body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    fields = ["name", "address", "city", "state", "country", "postal_code", "timezone", "is_active"]
    updates, values = [], []
    for f in fields:
        if f in body:
            updates.append(f"{f} = ?")
            values.append(body[f])
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    updates.append("updated_at = ?")
    values.extend([now_iso(), location_id])
    conn.execute(f"UPDATE locations SET {', '.join(updates)} WHERE id = ?", values)
    conn.commit()
    row = conn.execute("SELECT * FROM locations WHERE id = ?", (location_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Location not found")
    return dict(row)


@router.delete("/locations/{location_id}")
def delete_location(location_id: str, conn=Depends(get_db), _user=Depends(get_current_user)):
    conn.execute("DELETE FROM locations WHERE id = ?", (location_id,))
    conn.commit()
    return {"ok": True}
