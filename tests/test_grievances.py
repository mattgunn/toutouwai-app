"""Tests for the grievances endpoints."""


class TestCreateGrievance:
    def test_create_success(self, client, seed_employee):
        emp_id = seed_employee(first_name="GR", last_name="Worker", email="gr@test.com")
        resp = client.post("/api/grievances", json={
            "employee_id": emp_id,
            "subject": "Workplace safety concern",
            "description": "Broken fire exit door on floor 3",
            "category": "safety",
            "priority": "high",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["subject"] == "Workplace safety concern"
        assert data["priority"] == "high"
        assert data["status"] == "submitted"
        assert "employee_name" in data

    def test_create_missing_employee_id(self, client):
        resp = client.post("/api/grievances", json={
            "subject": "Test", "description": "Test",
        })
        assert resp.status_code == 400

    def test_create_missing_subject(self, client, seed_employee):
        emp_id = seed_employee(first_name="GR2", last_name="Worker", email="gr2@test.com")
        resp = client.post("/api/grievances", json={
            "employee_id": emp_id, "description": "Test",
        })
        assert resp.status_code == 400

    def test_create_missing_description(self, client, seed_employee):
        emp_id = seed_employee(first_name="GR3", last_name="Worker", email="gr3@test.com")
        resp = client.post("/api/grievances", json={
            "employee_id": emp_id, "subject": "Test",
        })
        assert resp.status_code == 400

    def test_create_invalid_employee_id(self, client):
        resp = client.post("/api/grievances", json={
            "employee_id": "nonexistent", "subject": "Test", "description": "Test",
        })
        assert resp.status_code == 400


class TestListGrievances:
    def test_list_empty(self, client):
        resp = client.get("/api/grievances")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_after_create(self, client, seed_employee):
        emp_id = seed_employee(first_name="GRL", last_name="Worker", email="grl@test.com")
        client.post("/api/grievances", json={
            "employee_id": emp_id, "subject": "Issue", "description": "Details",
        })
        resp = client.get("/api/grievances")
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    def test_filter_by_employee_id(self, client, seed_employee):
        emp1 = seed_employee(first_name="GRF1", last_name="Worker", email="grf1@test.com")
        emp2 = seed_employee(first_name="GRF2", last_name="Worker", email="grf2@test.com")
        client.post("/api/grievances", json={
            "employee_id": emp1, "subject": "A", "description": "A",
        })
        client.post("/api/grievances", json={
            "employee_id": emp2, "subject": "B", "description": "B",
        })
        resp = client.get(f"/api/grievances?employee_id={emp1}")
        assert resp.status_code == 200
        for g in resp.json():
            assert g["employee_id"] == emp1


class TestUpdateGrievance:
    def test_update_success(self, client, seed_employee):
        emp_id = seed_employee(first_name="GRU", last_name="Worker", email="gru@test.com")
        r = client.post("/api/grievances", json={
            "employee_id": emp_id, "subject": "Issue", "description": "Details",
        })
        gid = r.json()["id"]
        resp = client.put(f"/api/grievances/{gid}", json={
            "status": "resolved", "resolution": "Fixed the door",
        })
        assert resp.status_code == 200
        assert resp.json()["status"] == "resolved"

    def test_update_no_fields(self, client, seed_employee):
        emp_id = seed_employee(first_name="GRU2", last_name="Worker", email="gru2@test.com")
        r = client.post("/api/grievances", json={
            "employee_id": emp_id, "subject": "X", "description": "Y",
        })
        gid = r.json()["id"]
        resp = client.put(f"/api/grievances/{gid}", json={})
        assert resp.status_code == 400

    def test_update_nonexistent(self, client):
        resp = client.put("/api/grievances/nonexistent", json={"status": "resolved"})
        assert resp.status_code == 404


class TestDeleteGrievance:
    def test_delete_success(self, client, seed_employee):
        emp_id = seed_employee(first_name="GRD", last_name="Worker", email="grd@test.com")
        r = client.post("/api/grievances", json={
            "employee_id": emp_id, "subject": "Del", "description": "Del",
        })
        gid = r.json()["id"]
        resp = client.delete(f"/api/grievances/{gid}")
        assert resp.status_code == 200
        assert resp.json()["ok"] is True
