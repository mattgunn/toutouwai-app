"""Tests for the disciplinary actions endpoints."""


class TestCreateDisciplinary:
    def test_create_success(self, client, seed_employee):
        emp_id = seed_employee(first_name="DA", last_name="Worker", email="da@test.com")
        resp = client.post("/api/disciplinary", json={
            "employee_id": emp_id,
            "action_type": "verbal_warning",
            "description": "Repeated tardiness",
            "incident_date": "2026-03-01",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["action_type"] == "verbal_warning"
        assert data["description"] == "Repeated tardiness"
        assert data["status"] == "open"
        assert "employee_name" in data

    def test_create_missing_employee_id(self, client):
        resp = client.post("/api/disciplinary", json={
            "action_type": "verbal_warning", "description": "Test",
        })
        assert resp.status_code == 400

    def test_create_missing_action_type(self, client, seed_employee):
        emp_id = seed_employee(first_name="DA2", last_name="Worker", email="da2@test.com")
        resp = client.post("/api/disciplinary", json={
            "employee_id": emp_id, "description": "Test",
        })
        assert resp.status_code == 400

    def test_create_missing_description(self, client, seed_employee):
        emp_id = seed_employee(first_name="DA3", last_name="Worker", email="da3@test.com")
        resp = client.post("/api/disciplinary", json={
            "employee_id": emp_id, "action_type": "verbal_warning",
        })
        assert resp.status_code == 400

    def test_create_invalid_employee_id(self, client):
        resp = client.post("/api/disciplinary", json={
            "employee_id": "nonexistent",
            "action_type": "verbal_warning", "description": "Test",
        })
        assert resp.status_code == 400


class TestListDisciplinary:
    def test_list_empty(self, client):
        resp = client.get("/api/disciplinary")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_after_create(self, client, seed_employee):
        emp_id = seed_employee(first_name="DAL", last_name="Worker", email="dal@test.com")
        client.post("/api/disciplinary", json={
            "employee_id": emp_id, "action_type": "written_warning",
            "description": "Policy violation",
        })
        resp = client.get("/api/disciplinary")
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    def test_filter_by_employee_id(self, client, seed_employee):
        emp1 = seed_employee(first_name="DAF1", last_name="Worker", email="daf1@test.com")
        emp2 = seed_employee(first_name="DAF2", last_name="Worker", email="daf2@test.com")
        client.post("/api/disciplinary", json={
            "employee_id": emp1, "action_type": "verbal_warning", "description": "A",
        })
        client.post("/api/disciplinary", json={
            "employee_id": emp2, "action_type": "verbal_warning", "description": "B",
        })
        resp = client.get(f"/api/disciplinary?employee_id={emp1}")
        assert resp.status_code == 200
        for d in resp.json():
            assert d["employee_id"] == emp1


class TestUpdateDisciplinary:
    def test_update_success(self, client, seed_employee):
        emp_id = seed_employee(first_name="DAU", last_name="Worker", email="dau@test.com")
        r = client.post("/api/disciplinary", json={
            "employee_id": emp_id, "action_type": "verbal_warning", "description": "Initial",
        })
        did = r.json()["id"]
        resp = client.put(f"/api/disciplinary/{did}", json={
            "status": "resolved", "resolution": "Employee acknowledged",
        })
        assert resp.status_code == 200
        assert resp.json()["status"] == "resolved"
        assert resp.json()["resolution"] == "Employee acknowledged"

    def test_update_no_fields(self, client, seed_employee):
        emp_id = seed_employee(first_name="DAU2", last_name="Worker", email="dau2@test.com")
        r = client.post("/api/disciplinary", json={
            "employee_id": emp_id, "action_type": "verbal_warning", "description": "Test",
        })
        did = r.json()["id"]
        resp = client.put(f"/api/disciplinary/{did}", json={})
        assert resp.status_code == 400

    def test_update_nonexistent(self, client):
        resp = client.put("/api/disciplinary/nonexistent", json={"status": "resolved"})
        assert resp.status_code == 404


class TestDeleteDisciplinary:
    def test_delete_success(self, client, seed_employee):
        emp_id = seed_employee(first_name="DAD", last_name="Worker", email="dad@test.com")
        r = client.post("/api/disciplinary", json={
            "employee_id": emp_id, "action_type": "verbal_warning", "description": "Delete me",
        })
        did = r.json()["id"]
        resp = client.delete(f"/api/disciplinary/{did}")
        assert resp.status_code == 200
        assert resp.json()["ok"] is True
