"""Tests for the dependents endpoints."""


class TestCreateDependent:
    def test_create_success(self, client, seed_employee):
        emp_id = seed_employee(first_name="Dep", last_name="Worker", email="dep@test.com")
        resp = client.post("/api/dependents", json={
            "employee_id": emp_id,
            "first_name": "Alice",
            "last_name": "Doe",
            "relationship": "child",
            "date_of_birth": "2015-06-15",
            "gender": "female",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["first_name"] == "Alice"
        assert data["relationship"] == "child"
        assert data["is_active"] == 1
        assert "employee_name" in data

    def test_create_missing_employee_id(self, client):
        resp = client.post("/api/dependents", json={
            "first_name": "A", "last_name": "B", "relationship": "child",
        })
        assert resp.status_code == 400

    def test_create_missing_first_name(self, client, seed_employee):
        emp_id = seed_employee(first_name="Dep2", last_name="Worker", email="dep2@test.com")
        resp = client.post("/api/dependents", json={
            "employee_id": emp_id, "last_name": "B", "relationship": "child",
        })
        assert resp.status_code == 400

    def test_create_missing_relationship(self, client, seed_employee):
        emp_id = seed_employee(first_name="Dep3", last_name="Worker", email="dep3@test.com")
        resp = client.post("/api/dependents", json={
            "employee_id": emp_id, "first_name": "A", "last_name": "B",
        })
        assert resp.status_code == 400

    def test_create_invalid_employee_id(self, client):
        resp = client.post("/api/dependents", json={
            "employee_id": "nonexistent",
            "first_name": "A", "last_name": "B", "relationship": "child",
        })
        assert resp.status_code == 400


class TestListDependents:
    def test_list_empty(self, client):
        resp = client.get("/api/dependents")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_after_create(self, client, seed_employee):
        emp_id = seed_employee(first_name="DepL", last_name="Worker", email="depl@test.com")
        client.post("/api/dependents", json={
            "employee_id": emp_id,
            "first_name": "Child", "last_name": "One", "relationship": "child",
        })
        resp = client.get("/api/dependents")
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    def test_filter_by_employee_id(self, client, seed_employee):
        emp1 = seed_employee(first_name="DF1", last_name="Worker", email="df1@test.com")
        emp2 = seed_employee(first_name="DF2", last_name="Worker", email="df2@test.com")
        client.post("/api/dependents", json={
            "employee_id": emp1, "first_name": "A", "last_name": "A", "relationship": "child",
        })
        client.post("/api/dependents", json={
            "employee_id": emp2, "first_name": "B", "last_name": "B", "relationship": "spouse",
        })
        resp = client.get(f"/api/dependents?employee_id={emp1}")
        assert resp.status_code == 200
        for d in resp.json():
            assert d["employee_id"] == emp1


class TestUpdateDependent:
    def test_update_success(self, client, seed_employee):
        emp_id = seed_employee(first_name="DepU", last_name="Worker", email="depu@test.com")
        r = client.post("/api/dependents", json={
            "employee_id": emp_id,
            "first_name": "Old", "last_name": "Name", "relationship": "child",
        })
        did = r.json()["id"]
        resp = client.put(f"/api/dependents/{did}", json={"first_name": "New"})
        assert resp.status_code == 200
        assert resp.json()["first_name"] == "New"

    def test_update_no_fields(self, client, seed_employee):
        emp_id = seed_employee(first_name="DepU2", last_name="Worker", email="depu2@test.com")
        r = client.post("/api/dependents", json={
            "employee_id": emp_id,
            "first_name": "X", "last_name": "Y", "relationship": "child",
        })
        did = r.json()["id"]
        resp = client.put(f"/api/dependents/{did}", json={})
        assert resp.status_code == 400

    def test_update_nonexistent(self, client):
        resp = client.put("/api/dependents/nonexistent", json={"first_name": "X"})
        assert resp.status_code == 404


class TestDeleteDependent:
    def test_delete_success(self, client, seed_employee):
        emp_id = seed_employee(first_name="DepD", last_name="Worker", email="depd@test.com")
        r = client.post("/api/dependents", json={
            "employee_id": emp_id,
            "first_name": "Del", "last_name": "Me", "relationship": "child",
        })
        did = r.json()["id"]
        resp = client.delete(f"/api/dependents/{did}")
        assert resp.status_code == 200
        assert resp.json()["ok"] is True
