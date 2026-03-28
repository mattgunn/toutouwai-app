"""Tests for the workflows router: definitions, steps, instances, and approvals."""
from api.db import new_id, now_iso


def _create_definition(client, **overrides):
    payload = {
        "name": "Leave Approval",
        "trigger_entity": "leave_request",
        "trigger_action": "create",
    }
    payload.update(overrides)
    return client.post("/api/workflows/definitions", json=payload)


def _create_step(client, def_id, **overrides):
    payload = {"step_order": 1, "approver_type": "manager"}
    payload.update(overrides)
    return client.post(f"/api/workflows/definitions/{def_id}/steps", json=payload)


# ── Definitions ────────────────────────────────────────────────────


def test_create_definition(client):
    resp = _create_definition(client)
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Leave Approval"
    assert data["trigger_entity"] == "leave_request"
    assert data["is_active"] == 1


def test_list_definitions_empty(client):
    resp = client.get("/api/workflows/definitions")
    assert resp.status_code == 200
    assert resp.json() == []


def test_list_definitions(client):
    _create_definition(client, name="WF A")
    _create_definition(client, name="WF B", trigger_entity="expense", trigger_action="create")
    resp = client.get("/api/workflows/definitions")
    assert resp.status_code == 200
    names = [d["name"] for d in resp.json()]
    assert "WF A" in names
    assert "WF B" in names


def test_list_definitions_includes_step_count(client):
    did = _create_definition(client).json()["id"]
    _create_step(client, did, step_order=1)
    _create_step(client, did, step_order=2, approver_type="hr")
    resp = client.get("/api/workflows/definitions")
    wf = [d for d in resp.json() if d["id"] == did][0]
    assert wf["step_count"] == 2


def test_update_definition(client):
    did = _create_definition(client).json()["id"]
    resp = client.put(f"/api/workflows/definitions/{did}", json={"name": "Updated WF"})
    assert resp.status_code == 200
    assert resp.json()["name"] == "Updated WF"


def test_update_definition_no_fields(client):
    did = _create_definition(client).json()["id"]
    resp = client.put(f"/api/workflows/definitions/{did}", json={})
    assert resp.status_code == 400


def test_update_definition_not_found(client):
    resp = client.put("/api/workflows/definitions/nonexistent", json={"name": "X"})
    assert resp.status_code == 404


# ── Steps ──────────────────────────────────────────────────────────


def test_create_step(client):
    did = _create_definition(client).json()["id"]
    resp = _create_step(client, did)
    assert resp.status_code == 200
    data = resp.json()
    assert data["definition_id"] == did
    assert data["approver_type"] == "manager"


def test_list_steps(client):
    did = _create_definition(client).json()["id"]
    _create_step(client, did, step_order=1)
    _create_step(client, did, step_order=2, approver_type="hr")
    resp = client.get(f"/api/workflows/definitions/{did}/steps")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 2
    assert data[0]["step_order"] <= data[1]["step_order"]


def test_update_step(client):
    did = _create_definition(client).json()["id"]
    step_id = _create_step(client, did).json()["id"]
    resp = client.put(f"/api/workflows/steps/{step_id}", json={"approver_type": "hr"})
    assert resp.status_code == 200
    assert resp.json()["approver_type"] == "hr"


def test_update_step_no_fields(client):
    did = _create_definition(client).json()["id"]
    step_id = _create_step(client, did).json()["id"]
    resp = client.put(f"/api/workflows/steps/{step_id}", json={})
    assert resp.status_code == 400


def test_update_step_not_found(client):
    resp = client.put("/api/workflows/steps/nonexistent", json={"approver_type": "hr"})
    assert resp.status_code == 404


def test_delete_step(client):
    did = _create_definition(client).json()["id"]
    step_id = _create_step(client, did).json()["id"]
    resp = client.delete(f"/api/workflows/steps/{step_id}")
    assert resp.status_code == 200
    assert resp.json()["ok"] is True
    steps = client.get(f"/api/workflows/definitions/{did}/steps").json()
    assert all(s["id"] != step_id for s in steps)


# ── Instances ──────────────────────────────────────────────────────


def _seed_instance(db, admin_user):
    """Insert a workflow instance directly in the DB for testing."""
    ts = now_iso()
    did = new_id()
    db.execute(
        """INSERT INTO workflow_definitions (id, name, trigger_entity, trigger_action, is_active, created_at, updated_at)
        VALUES (?,?,?,?,1,?,?)""",
        (did, "Test WF", "leave_request", "create", ts, ts),
    )
    iid = new_id()
    db.execute(
        """INSERT INTO workflow_instances (id, definition_id, entity_type, entity_id, initiated_by, status, created_at, updated_at)
        VALUES (?,?,?,?,?,?,?,?)""",
        (iid, did, "leave_request", new_id(), admin_user["id"], "pending", ts, ts),
    )
    db.commit()
    return did, iid


def test_list_instances_empty(client):
    resp = client.get("/api/workflows/instances")
    assert resp.status_code == 200
    data = resp.json()
    assert data["instances"] == []
    assert data["total"] == 0


def test_list_instances(client, db, admin_user):
    _seed_instance(db, admin_user)
    resp = client.get("/api/workflows/instances")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1
    assert len(data["instances"]) >= 1


def test_list_instances_filter_by_status(client, db, admin_user):
    _seed_instance(db, admin_user)
    resp = client.get("/api/workflows/instances?status=pending")
    assert resp.status_code == 200
    for inst in resp.json()["instances"]:
        assert inst["status"] == "pending"


def test_list_instances_pagination(client, db, admin_user):
    for _ in range(3):
        _seed_instance(db, admin_user)
    resp = client.get("/api/workflows/instances?per_page=2&page=1")
    data = resp.json()
    assert len(data["instances"]) == 2
    assert data["total"] >= 3


# ── Approvals ──────────────────────────────────────────────────────


def _seed_approval(db, admin_user):
    ts = now_iso()
    did = new_id()
    db.execute(
        """INSERT INTO workflow_definitions (id, name, trigger_entity, trigger_action, is_active, created_at, updated_at)
        VALUES (?,?,?,?,1,?,?)""",
        (did, "Test WF", "leave_request", "create", ts, ts),
    )
    step_id = new_id()
    db.execute(
        """INSERT INTO workflow_steps (id, definition_id, step_order, approver_type, created_at, updated_at)
        VALUES (?,?,1,'manager',?,?)""",
        (step_id, did, ts, ts),
    )
    iid = new_id()
    db.execute(
        """INSERT INTO workflow_instances (id, definition_id, entity_type, entity_id, initiated_by, status, created_at, updated_at)
        VALUES (?,?,?,?,?,?,?,?)""",
        (iid, did, "leave_request", new_id(), admin_user["id"], "pending", ts, ts),
    )
    aid = new_id()
    db.execute(
        """INSERT INTO workflow_approvals (id, instance_id, step_id, approver_id, status, created_at, updated_at)
        VALUES (?,?,?,?,'pending',?,?)""",
        (aid, iid, step_id, admin_user["id"], ts, ts),
    )
    db.commit()
    return iid, aid


def test_approve(client, db, admin_user):
    iid, aid = _seed_approval(db, admin_user)
    resp = client.post(f"/api/workflows/approvals/{aid}/approve", json={"comments": "Looks good"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "approved"

    # Verify instance is approved (since it was the only approval)
    row = db.execute("SELECT status FROM workflow_instances WHERE id = ?", (iid,)).fetchone()
    assert row["status"] == "approved"


def test_reject(client, db, admin_user):
    iid, aid = _seed_approval(db, admin_user)
    resp = client.post(f"/api/workflows/approvals/{aid}/reject", json={"comments": "Not allowed"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "rejected"

    row = db.execute("SELECT status FROM workflow_instances WHERE id = ?", (iid,)).fetchone()
    assert row["status"] == "rejected"


def test_my_approvals(client, db, admin_user):
    _seed_approval(db, admin_user)
    resp = client.get("/api/workflows/my-approvals")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1
    assert data[0]["status"] == "pending"


def test_my_approvals_empty_after_approve(client, db, admin_user):
    _, aid = _seed_approval(db, admin_user)
    client.post(f"/api/workflows/approvals/{aid}/approve", json={})
    resp = client.get("/api/workflows/my-approvals")
    assert resp.status_code == 200
    assert len(resp.json()) == 0
