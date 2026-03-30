"""Tests for the delegations endpoints."""


class TestCreateDelegation:
    def test_create_success(self, client, admin_user):
        resp = client.post("/api/delegations", json={
            "delegator_id": admin_user["id"],
            "delegate_id": admin_user["id"],
            "entity_type": "leave_approval",
            "start_date": "2026-03-01",
            "end_date": "2026-03-15",
            "reason": "Out of office",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["entity_type"] == "leave_approval"
        assert data["is_active"] == 1
        assert "delegator_name" in data
        assert "delegate_name" in data

    def test_create_missing_delegator_id(self, client, admin_user):
        resp = client.post("/api/delegations", json={
            "delegate_id": admin_user["id"], "entity_type": "leave_approval",
        })
        assert resp.status_code == 400

    def test_create_missing_delegate_id(self, client, admin_user):
        resp = client.post("/api/delegations", json={
            "delegator_id": admin_user["id"], "entity_type": "leave_approval",
        })
        assert resp.status_code == 400

    def test_create_missing_entity_type(self, client, admin_user):
        resp = client.post("/api/delegations", json={
            "delegator_id": admin_user["id"],
            "delegate_id": admin_user["id"],
        })
        assert resp.status_code == 400

    def test_create_invalid_delegator_id(self, client, admin_user):
        resp = client.post("/api/delegations", json={
            "delegator_id": "nonexistent",
            "delegate_id": admin_user["id"],
            "entity_type": "leave_approval",
        })
        assert resp.status_code == 400

    def test_create_invalid_delegate_id(self, client, admin_user):
        resp = client.post("/api/delegations", json={
            "delegator_id": admin_user["id"],
            "delegate_id": "nonexistent",
            "entity_type": "leave_approval",
        })
        assert resp.status_code == 400


class TestListDelegations:
    def test_list_empty(self, client):
        resp = client.get("/api/delegations")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_after_create(self, client, admin_user):
        client.post("/api/delegations", json={
            "delegator_id": admin_user["id"],
            "delegate_id": admin_user["id"],
            "entity_type": "leave_approval",
        })
        resp = client.get("/api/delegations")
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    def test_filter_by_delegator_id(self, client, admin_user):
        client.post("/api/delegations", json={
            "delegator_id": admin_user["id"],
            "delegate_id": admin_user["id"],
            "entity_type": "leave_approval",
        })
        resp = client.get(f"/api/delegations?delegator_id={admin_user['id']}")
        assert resp.status_code == 200
        for d in resp.json():
            assert d["delegator_id"] == admin_user["id"]


class TestUpdateDelegation:
    def test_update_success(self, client, admin_user):
        r = client.post("/api/delegations", json={
            "delegator_id": admin_user["id"],
            "delegate_id": admin_user["id"],
            "entity_type": "leave_approval",
        })
        did = r.json()["id"]
        resp = client.put(f"/api/delegations/{did}", json={"is_active": 0})
        assert resp.status_code == 200
        assert resp.json()["is_active"] == 0

    def test_update_no_fields(self, client, admin_user):
        r = client.post("/api/delegations", json={
            "delegator_id": admin_user["id"],
            "delegate_id": admin_user["id"],
            "entity_type": "leave_approval",
        })
        did = r.json()["id"]
        resp = client.put(f"/api/delegations/{did}", json={})
        assert resp.status_code == 400

    def test_update_nonexistent(self, client):
        resp = client.put("/api/delegations/nonexistent", json={"is_active": 0})
        assert resp.status_code == 404


class TestDeleteDelegation:
    def test_delete_success(self, client, admin_user):
        r = client.post("/api/delegations", json={
            "delegator_id": admin_user["id"],
            "delegate_id": admin_user["id"],
            "entity_type": "leave_approval",
        })
        did = r.json()["id"]
        resp = client.delete(f"/api/delegations/{did}")
        assert resp.status_code == 200
        assert resp.json()["ok"] is True
