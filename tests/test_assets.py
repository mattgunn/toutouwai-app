"""Tests for the assets endpoints."""


class TestCreateAsset:
    def test_create_success(self, client):
        resp = client.post("/api/assets", json={
            "name": "MacBook Pro 16",
            "asset_tag": "LAP-001",
            "category": "laptop",
            "serial_number": "SN12345",
            "purchase_date": "2025-06-01",
            "purchase_cost": 3500,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "MacBook Pro 16"
        assert data["category"] == "laptop"
        assert data["status"] == "available"

    def test_create_assigned_to_employee(self, client, seed_employee):
        emp_id = seed_employee(first_name="AS", last_name="Worker", email="as@test.com")
        resp = client.post("/api/assets", json={
            "name": "Dell Monitor",
            "category": "monitor",
            "assigned_to": emp_id,
            "assigned_date": "2026-01-15",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["assigned_to"] == emp_id
        assert "assigned_to_name" in data

    def test_create_missing_name(self, client):
        resp = client.post("/api/assets", json={"category": "laptop"})
        assert resp.status_code == 400

    def test_create_missing_category(self, client):
        resp = client.post("/api/assets", json={"name": "Laptop"})
        assert resp.status_code == 400

    def test_create_invalid_assigned_to(self, client):
        resp = client.post("/api/assets", json={
            "name": "Laptop", "category": "laptop", "assigned_to": "nonexistent",
        })
        assert resp.status_code == 400


class TestListAssets:
    def test_list_empty(self, client):
        resp = client.get("/api/assets")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_after_create(self, client):
        client.post("/api/assets", json={"name": "Keyboard", "category": "keyboard"})
        resp = client.get("/api/assets")
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    def test_filter_by_status(self, client):
        client.post("/api/assets", json={
            "name": "Mouse", "category": "keyboard", "status": "available",
        })
        resp = client.get("/api/assets?status=available")
        assert resp.status_code == 200
        for a in resp.json():
            assert a["status"] == "available"


class TestUpdateAsset:
    def test_update_success(self, client):
        r = client.post("/api/assets", json={"name": "Old Asset", "category": "laptop"})
        aid = r.json()["id"]
        resp = client.put(f"/api/assets/{aid}", json={"name": "New Asset Name"})
        assert resp.status_code == 200
        assert resp.json()["name"] == "New Asset Name"

    def test_update_assign_to_employee(self, client, seed_employee):
        emp_id = seed_employee(first_name="ASU", last_name="Worker", email="asu@test.com")
        r = client.post("/api/assets", json={"name": "Laptop", "category": "laptop"})
        aid = r.json()["id"]
        resp = client.put(f"/api/assets/{aid}", json={
            "assigned_to": emp_id, "status": "assigned",
        })
        assert resp.status_code == 200
        assert resp.json()["assigned_to"] == emp_id

    def test_update_no_fields(self, client):
        r = client.post("/api/assets", json={"name": "Test", "category": "laptop"})
        aid = r.json()["id"]
        resp = client.put(f"/api/assets/{aid}", json={})
        assert resp.status_code == 400

    def test_update_nonexistent(self, client):
        resp = client.put("/api/assets/nonexistent", json={"name": "X"})
        assert resp.status_code == 404

    def test_update_invalid_assigned_to(self, client):
        r = client.post("/api/assets", json={"name": "Test", "category": "laptop"})
        aid = r.json()["id"]
        resp = client.put(f"/api/assets/{aid}", json={"assigned_to": "nonexistent"})
        assert resp.status_code == 400


class TestDeleteAsset:
    def test_delete_success(self, client):
        r = client.post("/api/assets", json={"name": "To Delete", "category": "laptop"})
        aid = r.json()["id"]
        resp = client.delete(f"/api/assets/{aid}")
        assert resp.status_code == 200
        assert resp.json()["ok"] is True
