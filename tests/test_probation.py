"""Tests for the probation endpoints."""


class TestCreateProbation:
    def test_create_success(self, client, seed_employee):
        emp_id = seed_employee(first_name="PB", last_name="Worker", email="pb@test.com")
        resp = client.post("/api/probation", json={
            "employee_id": emp_id,
            "start_date": "2026-01-01",
            "end_date": "2026-04-01",
            "review_date": "2026-03-15",
            "notes": "Standard 90-day probation",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["employee_id"] == emp_id
        assert data["start_date"] == "2026-01-01"
        assert data["end_date"] == "2026-04-01"
        assert data["status"] == "active"
        assert "employee_name" in data

    def test_create_missing_employee_id(self, client):
        resp = client.post("/api/probation", json={
            "start_date": "2026-01-01", "end_date": "2026-04-01",
        })
        assert resp.status_code == 400

    def test_create_missing_start_date(self, client, seed_employee):
        emp_id = seed_employee(first_name="PB2", last_name="Worker", email="pb2@test.com")
        resp = client.post("/api/probation", json={
            "employee_id": emp_id, "end_date": "2026-04-01",
        })
        assert resp.status_code == 400

    def test_create_missing_end_date(self, client, seed_employee):
        emp_id = seed_employee(first_name="PB3", last_name="Worker", email="pb3@test.com")
        resp = client.post("/api/probation", json={
            "employee_id": emp_id, "start_date": "2026-01-01",
        })
        assert resp.status_code == 400

    def test_create_invalid_employee_id(self, client):
        resp = client.post("/api/probation", json={
            "employee_id": "nonexistent",
            "start_date": "2026-01-01", "end_date": "2026-04-01",
        })
        assert resp.status_code == 400


class TestListProbation:
    def test_list_empty(self, client):
        resp = client.get("/api/probation")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_after_create(self, client, seed_employee):
        emp_id = seed_employee(first_name="PBL", last_name="Worker", email="pbl@test.com")
        client.post("/api/probation", json={
            "employee_id": emp_id, "start_date": "2026-01-01", "end_date": "2026-04-01",
        })
        resp = client.get("/api/probation")
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    def test_filter_by_employee_id(self, client, seed_employee):
        emp1 = seed_employee(first_name="PBF1", last_name="Worker", email="pbf1@test.com")
        emp2 = seed_employee(first_name="PBF2", last_name="Worker", email="pbf2@test.com")
        client.post("/api/probation", json={
            "employee_id": emp1, "start_date": "2026-01-01", "end_date": "2026-04-01",
        })
        client.post("/api/probation", json={
            "employee_id": emp2, "start_date": "2026-01-01", "end_date": "2026-04-01",
        })
        resp = client.get(f"/api/probation?employee_id={emp1}")
        assert resp.status_code == 200
        for p in resp.json():
            assert p["employee_id"] == emp1


class TestUpdateProbation:
    def test_update_success(self, client, seed_employee):
        emp_id = seed_employee(first_name="PBU", last_name="Worker", email="pbu@test.com")
        r = client.post("/api/probation", json={
            "employee_id": emp_id, "start_date": "2026-01-01", "end_date": "2026-04-01",
        })
        pid = r.json()["id"]
        resp = client.put(f"/api/probation/{pid}", json={"status": "passed"})
        assert resp.status_code == 200
        assert resp.json()["status"] == "passed"

    def test_update_no_fields(self, client, seed_employee):
        emp_id = seed_employee(first_name="PBU2", last_name="Worker", email="pbu2@test.com")
        r = client.post("/api/probation", json={
            "employee_id": emp_id, "start_date": "2026-01-01", "end_date": "2026-04-01",
        })
        pid = r.json()["id"]
        resp = client.put(f"/api/probation/{pid}", json={})
        assert resp.status_code == 400

    def test_update_nonexistent(self, client):
        resp = client.put("/api/probation/nonexistent", json={"status": "passed"})
        assert resp.status_code == 404


class TestDeleteProbation:
    def test_delete_success(self, client, seed_employee):
        emp_id = seed_employee(first_name="PBD", last_name="Worker", email="pbd@test.com")
        r = client.post("/api/probation", json={
            "employee_id": emp_id, "start_date": "2026-01-01", "end_date": "2026-04-01",
        })
        pid = r.json()["id"]
        resp = client.delete(f"/api/probation/{pid}")
        assert resp.status_code == 200
        assert resp.json()["ok"] is True
