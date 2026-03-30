"""Tests for the compensation components endpoints."""


class TestCreateCompensationComponent:
    def test_create_success(self, client, seed_employee):
        emp_id = seed_employee(first_name="CC", last_name="Worker", email="cc@test.com")
        resp = client.post("/api/compensation/components", json={
            "employee_id": emp_id,
            "component_type": "bonus",
            "amount": 5000,
            "currency": "NZD",
            "frequency": "annual",
            "effective_date": "2026-01-01",
            "description": "Annual performance bonus",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["component_type"] == "bonus"
        assert data["amount"] == 5000
        assert data["status"] == "active"
        assert "employee_name" in data

    def test_create_with_defaults(self, client, seed_employee):
        emp_id = seed_employee(first_name="CC2", last_name="Worker", email="cc2@test.com")
        resp = client.post("/api/compensation/components", json={
            "employee_id": emp_id,
            "component_type": "allowance",
            "amount": 1000,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["currency"] == "NZD"
        assert data["frequency"] == "annual"
        assert data["status"] == "active"

    def test_create_missing_employee_id(self, client):
        resp = client.post("/api/compensation/components", json={
            "component_type": "bonus", "amount": 100,
        })
        assert resp.status_code == 400

    def test_create_missing_component_type(self, client, seed_employee):
        emp_id = seed_employee(first_name="CC3", last_name="Worker", email="cc3@test.com")
        resp = client.post("/api/compensation/components", json={
            "employee_id": emp_id, "amount": 100,
        })
        assert resp.status_code == 400

    def test_create_missing_amount(self, client, seed_employee):
        emp_id = seed_employee(first_name="CC4", last_name="Worker", email="cc4@test.com")
        resp = client.post("/api/compensation/components", json={
            "employee_id": emp_id, "component_type": "bonus",
        })
        assert resp.status_code == 400

    def test_create_invalid_employee_id(self, client):
        resp = client.post("/api/compensation/components", json={
            "employee_id": "nonexistent", "component_type": "bonus", "amount": 100,
        })
        assert resp.status_code == 400


class TestListCompensationComponents:
    def test_list_empty(self, client):
        resp = client.get("/api/compensation/components")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_after_create(self, client, seed_employee):
        emp_id = seed_employee(first_name="CCL", last_name="Worker", email="ccl@test.com")
        client.post("/api/compensation/components", json={
            "employee_id": emp_id, "component_type": "bonus", "amount": 500,
        })
        resp = client.get("/api/compensation/components")
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    def test_filter_by_employee_id(self, client, seed_employee):
        emp1 = seed_employee(first_name="CCF1", last_name="Worker", email="ccf1@test.com")
        emp2 = seed_employee(first_name="CCF2", last_name="Worker", email="ccf2@test.com")
        client.post("/api/compensation/components", json={
            "employee_id": emp1, "component_type": "bonus", "amount": 100,
        })
        client.post("/api/compensation/components", json={
            "employee_id": emp2, "component_type": "bonus", "amount": 200,
        })
        resp = client.get(f"/api/compensation/components?employee_id={emp1}")
        assert resp.status_code == 200
        for c in resp.json():
            assert c["employee_id"] == emp1


class TestUpdateCompensationComponent:
    def test_update_success(self, client, seed_employee):
        emp_id = seed_employee(first_name="CCU", last_name="Worker", email="ccu@test.com")
        r = client.post("/api/compensation/components", json={
            "employee_id": emp_id, "component_type": "bonus", "amount": 500,
        })
        cid = r.json()["id"]
        resp = client.put(f"/api/compensation/components/{cid}", json={"amount": 750})
        assert resp.status_code == 200
        assert resp.json()["amount"] == 750

    def test_update_no_fields(self, client, seed_employee):
        emp_id = seed_employee(first_name="CCU2", last_name="Worker", email="ccu2@test.com")
        r = client.post("/api/compensation/components", json={
            "employee_id": emp_id, "component_type": "bonus", "amount": 500,
        })
        cid = r.json()["id"]
        resp = client.put(f"/api/compensation/components/{cid}", json={})
        assert resp.status_code == 400

    def test_update_nonexistent(self, client):
        resp = client.put("/api/compensation/components/nonexistent", json={"amount": 100})
        assert resp.status_code == 404


class TestDeleteCompensationComponent:
    def test_delete_success(self, client, seed_employee):
        emp_id = seed_employee(first_name="CCD", last_name="Worker", email="ccd@test.com")
        r = client.post("/api/compensation/components", json={
            "employee_id": emp_id, "component_type": "bonus", "amount": 500,
        })
        cid = r.json()["id"]
        resp = client.delete(f"/api/compensation/components/{cid}")
        assert resp.status_code == 200
        assert resp.json()["ok"] is True
