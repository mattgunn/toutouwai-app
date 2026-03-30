"""Tests for the cost centers endpoints."""


class TestCreateCostCenter:
    def test_create_success(self, client):
        resp = client.post("/api/cost-centers", json={
            "code": "CC-100",
            "name": "Engineering",
            "description": "Engineering cost center",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["code"] == "CC-100"
        assert data["name"] == "Engineering"
        assert data["is_active"] == 1

    def test_create_with_department(self, client, seed_department):
        dept_id = seed_department(name="CC Dept")
        resp = client.post("/api/cost-centers", json={
            "code": "CC-200",
            "name": "Marketing",
            "department_id": dept_id,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["department_id"] == dept_id
        assert "department_name" in data

    def test_create_with_manager(self, client, seed_employee):
        emp_id = seed_employee(first_name="CCM", last_name="Mgr", email="ccm@test.com")
        resp = client.post("/api/cost-centers", json={
            "code": "CC-300",
            "name": "Sales",
            "manager_id": emp_id,
        })
        assert resp.status_code == 200
        assert resp.json()["manager_id"] == emp_id

    def test_create_missing_code(self, client):
        resp = client.post("/api/cost-centers", json={"name": "Test"})
        assert resp.status_code == 400

    def test_create_missing_name(self, client):
        resp = client.post("/api/cost-centers", json={"code": "CC-999"})
        assert resp.status_code == 400

    def test_create_invalid_department_id(self, client):
        resp = client.post("/api/cost-centers", json={
            "code": "CC-400", "name": "Test", "department_id": "nonexistent",
        })
        assert resp.status_code == 400

    def test_create_invalid_manager_id(self, client):
        resp = client.post("/api/cost-centers", json={
            "code": "CC-500", "name": "Test", "manager_id": "nonexistent",
        })
        assert resp.status_code == 400


class TestListCostCenters:
    def test_list_empty(self, client):
        resp = client.get("/api/cost-centers")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_after_create(self, client):
        client.post("/api/cost-centers", json={"code": "CC-601", "name": "Ops"})
        resp = client.get("/api/cost-centers")
        assert resp.status_code == 200
        assert len(resp.json()) >= 1


class TestUpdateCostCenter:
    def test_update_success(self, client):
        r = client.post("/api/cost-centers", json={"code": "CC-701", "name": "Old"})
        cid = r.json()["id"]
        resp = client.put(f"/api/cost-centers/{cid}", json={"name": "New Name"})
        assert resp.status_code == 200
        assert resp.json()["name"] == "New Name"

    def test_update_no_fields(self, client):
        r = client.post("/api/cost-centers", json={"code": "CC-702", "name": "Test"})
        cid = r.json()["id"]
        resp = client.put(f"/api/cost-centers/{cid}", json={})
        assert resp.status_code == 400

    def test_update_nonexistent(self, client):
        resp = client.put("/api/cost-centers/nonexistent", json={"name": "X"})
        assert resp.status_code == 404


class TestDeleteCostCenter:
    def test_delete_success(self, client):
        r = client.post("/api/cost-centers", json={"code": "CC-801", "name": "Del"})
        cid = r.json()["id"]
        resp = client.delete(f"/api/cost-centers/{cid}")
        assert resp.status_code == 200
        assert resp.json()["ok"] is True
