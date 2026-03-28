class TestListDepartments:
    """Tests for GET /api/departments."""

    def test_list_empty(self, client):
        resp = client.get("/api/departments")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_with_departments(self, client, seed_department):
        seed_department(name="Engineering")
        seed_department(name="Marketing")
        resp = client.get("/api/departments")
        data = resp.json()
        assert len(data) == 2
        names = [d["name"] for d in data]
        assert "Engineering" in names
        assert "Marketing" in names

    def test_list_includes_employee_count(self, client, seed_department, seed_employee):
        dept_id = seed_department(name="Engineering")
        seed_employee(first_name="Alice", last_name="Smith", dept_id=dept_id)
        seed_employee(first_name="Bob", last_name="Jones", dept_id=dept_id)
        resp = client.get("/api/departments")
        data = resp.json()
        eng = [d for d in data if d["name"] == "Engineering"][0]
        assert eng["employee_count"] == 2

    def test_list_sorted_by_name(self, client, seed_department):
        seed_department(name="Zebra")
        seed_department(name="Alpha")
        resp = client.get("/api/departments")
        data = resp.json()
        assert data[0]["name"] == "Alpha"
        assert data[1]["name"] == "Zebra"


class TestCreateDepartment:
    """Tests for POST /api/departments."""

    def test_create_department(self, client):
        resp = client.post("/api/departments", json={"name": "HR", "description": "Human Resources"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "HR"
        assert data["description"] == "Human Resources"
        assert data["id"] is not None

    def test_create_department_minimal(self, client):
        resp = client.post("/api/departments", json={"name": "Finance"})
        assert resp.status_code == 200
        assert resp.json()["name"] == "Finance"

    def test_create_department_appears_in_list(self, client):
        client.post("/api/departments", json={"name": "NewDept"})
        resp = client.get("/api/departments")
        names = [d["name"] for d in resp.json()]
        assert "NewDept" in names


class TestUpdateDepartment:
    """Tests for PUT /api/departments/{id}."""

    def test_update_department_name(self, client, seed_department):
        dept_id = seed_department(name="OldName")
        resp = client.put(f"/api/departments/{dept_id}", json={"name": "NewName"})
        assert resp.status_code == 200
        assert resp.json()["name"] == "NewName"

    def test_update_department_description(self, client, seed_department):
        dept_id = seed_department()
        resp = client.put(f"/api/departments/{dept_id}", json={"description": "Updated desc"})
        assert resp.status_code == 200
        assert resp.json()["description"] == "Updated desc"

    def test_update_nonexistent_department(self, client):
        resp = client.put("/api/departments/nonexistent-id", json={"name": "X"})
        assert resp.status_code == 404

    def test_update_preserves_other_fields(self, client, seed_department):
        dept_id = seed_department(name="KeepMe", description="Original")
        client.put(f"/api/departments/{dept_id}", json={"description": "Changed"})
        resp = client.get("/api/departments")
        dept = [d for d in resp.json() if d["id"] == dept_id][0]
        assert dept["name"] == "KeepMe"
        assert dept["description"] == "Changed"


class TestDeleteDepartment:
    """Tests for DELETE /api/departments/{id}."""

    def test_delete_department(self, client, seed_department):
        dept_id = seed_department(name="ToDelete")
        resp = client.delete(f"/api/departments/{dept_id}")
        assert resp.status_code == 200
        assert resp.json()["ok"] is True
        # Verify it's gone
        list_resp = client.get("/api/departments")
        ids = [d["id"] for d in list_resp.json()]
        assert dept_id not in ids

    def test_delete_nonexistent_department(self, client):
        resp = client.delete("/api/departments/nonexistent-id")
        assert resp.status_code == 200  # delete is idempotent in this implementation
        assert resp.json()["ok"] is True
