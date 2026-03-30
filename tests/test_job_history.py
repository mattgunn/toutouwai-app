"""Tests for the job history endpoints."""


class TestCreateJobHistory:
    def test_create_success(self, client, seed_employee):
        emp_id = seed_employee(first_name="JH", last_name="Worker", email="jh@test.com")
        resp = client.post("/api/job-history", json={
            "employee_id": emp_id,
            "effective_date": "2026-01-01",
            "location": "Auckland",
            "employment_type": "full_time",
            "reason": "New hire",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["employee_id"] == emp_id
        assert data["effective_date"] == "2026-01-01"
        assert "employee_name" in data

    def test_create_with_fks(self, client, seed_employee, seed_department, seed_position):
        dept_id = seed_department(name="JH Dept")
        pos_id = seed_position(title="JH Position", dept_id=dept_id)
        emp_id = seed_employee(first_name="JH2", last_name="Worker", email="jh2@test.com")
        resp = client.post("/api/job-history", json={
            "employee_id": emp_id,
            "effective_date": "2026-02-01",
            "position_id": pos_id,
            "department_id": dept_id,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["position_id"] == pos_id
        assert data["department_id"] == dept_id

    def test_create_missing_employee_id(self, client):
        resp = client.post("/api/job-history", json={"effective_date": "2026-01-01"})
        assert resp.status_code == 400

    def test_create_missing_effective_date(self, client, seed_employee):
        emp_id = seed_employee(first_name="JH3", last_name="Worker", email="jh3@test.com")
        resp = client.post("/api/job-history", json={"employee_id": emp_id})
        assert resp.status_code == 400

    def test_create_invalid_employee_id(self, client):
        resp = client.post("/api/job-history", json={
            "employee_id": "nonexistent", "effective_date": "2026-01-01",
        })
        assert resp.status_code == 400

    def test_create_invalid_position_id(self, client, seed_employee):
        emp_id = seed_employee(first_name="JH4", last_name="Worker", email="jh4@test.com")
        resp = client.post("/api/job-history", json={
            "employee_id": emp_id, "effective_date": "2026-01-01",
            "position_id": "nonexistent",
        })
        assert resp.status_code == 400

    def test_create_invalid_department_id(self, client, seed_employee):
        emp_id = seed_employee(first_name="JH5", last_name="Worker", email="jh5@test.com")
        resp = client.post("/api/job-history", json={
            "employee_id": emp_id, "effective_date": "2026-01-01",
            "department_id": "nonexistent",
        })
        assert resp.status_code == 400


class TestListJobHistory:
    def test_list_empty(self, client):
        resp = client.get("/api/job-history")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_after_create(self, client, seed_employee):
        emp_id = seed_employee(first_name="JHL", last_name="Worker", email="jhl@test.com")
        client.post("/api/job-history", json={
            "employee_id": emp_id, "effective_date": "2026-01-01",
        })
        resp = client.get("/api/job-history")
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    def test_filter_by_employee_id(self, client, seed_employee):
        emp1 = seed_employee(first_name="JHF1", last_name="Worker", email="jhf1@test.com")
        emp2 = seed_employee(first_name="JHF2", last_name="Worker", email="jhf2@test.com")
        client.post("/api/job-history", json={
            "employee_id": emp1, "effective_date": "2026-01-01",
        })
        client.post("/api/job-history", json={
            "employee_id": emp2, "effective_date": "2026-02-01",
        })
        resp = client.get(f"/api/job-history?employee_id={emp1}")
        assert resp.status_code == 200
        for jh in resp.json():
            assert jh["employee_id"] == emp1


class TestUpdateJobHistory:
    def test_update_success(self, client, seed_employee):
        emp_id = seed_employee(first_name="JHU", last_name="Worker", email="jhu@test.com")
        r = client.post("/api/job-history", json={
            "employee_id": emp_id, "effective_date": "2026-01-01", "reason": "Old",
        })
        jid = r.json()["id"]
        resp = client.put(f"/api/job-history/{jid}", json={"reason": "Promotion"})
        assert resp.status_code == 200
        assert resp.json()["reason"] == "Promotion"

    def test_update_no_fields(self, client, seed_employee):
        emp_id = seed_employee(first_name="JHU2", last_name="Worker", email="jhu2@test.com")
        r = client.post("/api/job-history", json={
            "employee_id": emp_id, "effective_date": "2026-01-01",
        })
        jid = r.json()["id"]
        resp = client.put(f"/api/job-history/{jid}", json={})
        assert resp.status_code == 400

    def test_update_nonexistent(self, client):
        resp = client.put("/api/job-history/nonexistent", json={"reason": "X"})
        assert resp.status_code == 404

    def test_update_invalid_position_id(self, client, seed_employee):
        emp_id = seed_employee(first_name="JHU3", last_name="Worker", email="jhu3@test.com")
        r = client.post("/api/job-history", json={
            "employee_id": emp_id, "effective_date": "2026-01-01",
        })
        jid = r.json()["id"]
        resp = client.put(f"/api/job-history/{jid}", json={"position_id": "nonexistent"})
        assert resp.status_code == 400


class TestDeleteJobHistory:
    def test_delete_success(self, client, seed_employee):
        emp_id = seed_employee(first_name="JHD", last_name="Worker", email="jhd@test.com")
        r = client.post("/api/job-history", json={
            "employee_id": emp_id, "effective_date": "2026-01-01",
        })
        jid = r.json()["id"]
        resp = client.delete(f"/api/job-history/{jid}")
        assert resp.status_code == 200
        assert resp.json()["ok"] is True
