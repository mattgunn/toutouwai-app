"""Tests for the audit router: listing and filtering audit log entries."""
from api.db import new_id, now_iso


def _seed_audit_entries(db, admin_user, count=5, entity_type="employee"):
    ts = now_iso()
    for i in range(count):
        db.execute(
            """INSERT INTO audit_log (id, entity_type, entity_id, action, field_name,
               old_value, new_value, user_id, user_name, user_email, created_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
            (new_id(), entity_type, new_id(), "update", "status",
             "active", "on_leave", admin_user["id"], admin_user["name"],
             admin_user["email"], ts),
        )
    db.commit()


def test_audit_list_empty(client):
    resp = client.get("/api/audit")
    assert resp.status_code == 200
    data = resp.json()
    assert data["entries"] == []
    assert data["total"] == 0


def test_audit_list_with_entries(client, db, admin_user):
    _seed_audit_entries(db, admin_user, count=3)
    resp = client.get("/api/audit")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 3
    assert len(data["entries"]) == 3


def test_audit_filter_by_entity_type(client, db, admin_user):
    _seed_audit_entries(db, admin_user, count=3, entity_type="employee")
    _seed_audit_entries(db, admin_user, count=2, entity_type="leave_request")

    resp = client.get("/api/audit?entity_type=employee")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 3
    for entry in data["entries"]:
        assert entry["entity_type"] == "employee"


def test_audit_filter_by_user_id(client, db, admin_user):
    _seed_audit_entries(db, admin_user, count=3)
    resp = client.get(f"/api/audit?user_id={admin_user['id']}")
    assert resp.status_code == 200
    assert resp.json()["total"] == 3


def test_audit_pagination(client, db, admin_user):
    _seed_audit_entries(db, admin_user, count=10)
    resp = client.get("/api/audit?per_page=3&page=1")
    data = resp.json()
    assert data["total"] == 10
    assert len(data["entries"]) == 3
    assert data["page"] == 1

    resp2 = client.get("/api/audit?per_page=3&page=2")
    data2 = resp2.json()
    assert len(data2["entries"]) == 3
    assert data2["page"] == 2

    # Entries on page 1 and 2 should be different
    ids1 = {e["id"] for e in data["entries"]}
    ids2 = {e["id"] for e in data2["entries"]}
    assert ids1.isdisjoint(ids2)


def test_audit_filter_by_entity_id(client, db, admin_user):
    ts = now_iso()
    target_id = new_id()
    db.execute(
        """INSERT INTO audit_log (id, entity_type, entity_id, action, user_id, user_name, user_email, created_at)
        VALUES (?,?,?,?,?,?,?,?)""",
        (new_id(), "employee", target_id, "create", admin_user["id"],
         admin_user["name"], admin_user["email"], ts),
    )
    _seed_audit_entries(db, admin_user, count=3)

    resp = client.get(f"/api/audit?entity_id={target_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["entries"][0]["entity_id"] == target_id
