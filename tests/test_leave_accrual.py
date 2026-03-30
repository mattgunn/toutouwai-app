"""Tests for the leave accrual policy endpoints."""


class TestCreateAccrualPolicy:
    def test_create_success(self, client, seed_leave_types):
        lt_id = seed_leave_types[0]
        resp = client.post("/api/leave/accrual-policies", json={
            "leave_type_id": lt_id,
            "name": "Standard Annual Accrual",
            "accrual_rate": 1.67,
            "accrual_frequency": "monthly",
            "max_balance": 30,
            "carry_over_limit": 5,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Standard Annual Accrual"
        assert data["accrual_rate"] == 1.67
        assert data["accrual_frequency"] == "monthly"
        assert data["is_active"] == 1
        assert "leave_type_name" in data

    def test_create_missing_leave_type_id(self, client):
        resp = client.post("/api/leave/accrual-policies", json={
            "name": "Test", "accrual_rate": 1.0, "accrual_frequency": "monthly",
        })
        assert resp.status_code == 400

    def test_create_missing_name(self, client, seed_leave_types):
        resp = client.post("/api/leave/accrual-policies", json={
            "leave_type_id": seed_leave_types[0],
            "accrual_rate": 1.0, "accrual_frequency": "monthly",
        })
        assert resp.status_code == 400

    def test_create_missing_accrual_rate(self, client, seed_leave_types):
        resp = client.post("/api/leave/accrual-policies", json={
            "leave_type_id": seed_leave_types[0],
            "name": "Test", "accrual_frequency": "monthly",
        })
        assert resp.status_code == 400

    def test_create_missing_accrual_frequency(self, client, seed_leave_types):
        resp = client.post("/api/leave/accrual-policies", json={
            "leave_type_id": seed_leave_types[0],
            "name": "Test", "accrual_rate": 1.0,
        })
        assert resp.status_code == 400

    def test_create_invalid_leave_type_id(self, client):
        resp = client.post("/api/leave/accrual-policies", json={
            "leave_type_id": "nonexistent",
            "name": "Test", "accrual_rate": 1.0, "accrual_frequency": "monthly",
        })
        assert resp.status_code == 400


class TestListAccrualPolicies:
    def test_list_empty(self, client):
        resp = client.get("/api/leave/accrual-policies")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_after_create(self, client, seed_leave_types):
        client.post("/api/leave/accrual-policies", json={
            "leave_type_id": seed_leave_types[0],
            "name": "Policy A", "accrual_rate": 1.0, "accrual_frequency": "monthly",
        })
        resp = client.get("/api/leave/accrual-policies")
        assert resp.status_code == 200
        assert len(resp.json()) >= 1


class TestUpdateAccrualPolicy:
    def test_update_success(self, client, seed_leave_types):
        r = client.post("/api/leave/accrual-policies", json={
            "leave_type_id": seed_leave_types[0],
            "name": "Old Policy", "accrual_rate": 1.0, "accrual_frequency": "monthly",
        })
        pid = r.json()["id"]
        resp = client.put(f"/api/leave/accrual-policies/{pid}", json={"name": "New Policy"})
        assert resp.status_code == 200
        assert resp.json()["name"] == "New Policy"

    def test_update_no_fields(self, client, seed_leave_types):
        r = client.post("/api/leave/accrual-policies", json={
            "leave_type_id": seed_leave_types[0],
            "name": "Test", "accrual_rate": 1.0, "accrual_frequency": "monthly",
        })
        pid = r.json()["id"]
        resp = client.put(f"/api/leave/accrual-policies/{pid}", json={})
        assert resp.status_code == 400

    def test_update_nonexistent(self, client):
        resp = client.put("/api/leave/accrual-policies/nonexistent", json={"name": "X"})
        assert resp.status_code == 404

    def test_update_invalid_leave_type_id(self, client, seed_leave_types):
        r = client.post("/api/leave/accrual-policies", json={
            "leave_type_id": seed_leave_types[0],
            "name": "Test", "accrual_rate": 1.0, "accrual_frequency": "monthly",
        })
        pid = r.json()["id"]
        resp = client.put(f"/api/leave/accrual-policies/{pid}", json={
            "leave_type_id": "nonexistent",
        })
        assert resp.status_code == 400


class TestDeleteAccrualPolicy:
    def test_delete_success(self, client, seed_leave_types):
        r = client.post("/api/leave/accrual-policies", json={
            "leave_type_id": seed_leave_types[0],
            "name": "To Delete", "accrual_rate": 1.0, "accrual_frequency": "monthly",
        })
        pid = r.json()["id"]
        resp = client.delete(f"/api/leave/accrual-policies/{pid}")
        assert resp.status_code == 200
        assert resp.json()["ok"] is True
