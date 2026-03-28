class TestListEmployees:
    """Tests for GET /api/employees."""

    def test_list_empty(self, client):
        resp = client.get("/api/employees")
        assert resp.status_code == 200
        data = resp.json()
        assert data["employees"] == []
        assert data["total"] == 0
        assert data["page"] == 1
        assert data["per_page"] == 50

    def test_list_with_employees(self, client, seed_employee):
        seed_employee(first_name="Alice", last_name="Smith")
        seed_employee(first_name="Bob", last_name="Jones")
        resp = client.get("/api/employees")
        data = resp.json()
        assert data["total"] == 2
        assert len(data["employees"]) == 2

    def test_list_search_by_name(self, client, seed_employee):
        seed_employee(first_name="Alice", last_name="Smith")
        seed_employee(first_name="Bob", last_name="Jones")
        resp = client.get("/api/employees?search=Alice")
        data = resp.json()
        assert data["total"] == 1
        assert data["employees"][0]["first_name"] == "Alice"

    def test_list_search_by_email(self, client, seed_employee):
        seed_employee(first_name="Alice", last_name="Smith", email="alice@example.com")
        seed_employee(first_name="Bob", last_name="Jones")
        resp = client.get("/api/employees?search=alice@example")
        data = resp.json()
        assert data["total"] == 1
        assert data["employees"][0]["email"] == "alice@example.com"

    def test_list_search_no_results(self, client, seed_employee):
        seed_employee(first_name="Alice", last_name="Smith")
        resp = client.get("/api/employees?search=Nonexistent")
        data = resp.json()
        assert data["total"] == 0
        assert data["employees"] == []

    def test_list_pagination(self, client, seed_employee):
        for i in range(7):
            seed_employee(first_name=f"User{i}", last_name="Test", email=f"user{i}@test.com")
        resp = client.get("/api/employees?per_page=3&page=1")
        data = resp.json()
        assert data["total"] == 7
        assert len(data["employees"]) == 3
        assert data["page"] == 1
        assert data["per_page"] == 3

    def test_list_pagination_page_2(self, client, seed_employee):
        for i in range(7):
            seed_employee(first_name=f"User{i}", last_name="Test", email=f"user{i}@test.com")
        resp = client.get("/api/employees?per_page=3&page=3")
        data = resp.json()
        assert len(data["employees"]) == 1  # 7 total, page 3 of 3-per-page = 1 remaining

    def test_list_filter_by_department(self, client, seed_employee, seed_department):
        dept_id = seed_department(name="Sales")
        seed_employee(first_name="Alice", last_name="Smith", dept_id=dept_id)
        seed_employee(first_name="Bob", last_name="Jones")  # different dept
        resp = client.get(f"/api/employees?department={dept_id}")
        data = resp.json()
        assert data["total"] == 1
        assert data["employees"][0]["first_name"] == "Alice"

    def test_list_filter_by_status(self, client, db, seed_department, seed_position):
        from api.db import new_id, now_iso
        dept_id = seed_department()
        pos_id = seed_position(dept_id=dept_id)
        ts = now_iso()
        for status, name in [("active", "Active"), ("inactive", "Inactive")]:
            eid = new_id()
            db.execute("""INSERT INTO employees (id, first_name, last_name, email, department_id, position_id,
                          status, start_date, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)""",
                       (eid, name, "User", f"{name.lower()}@test.com", dept_id, pos_id, status, "2024-01-15", ts, ts))
        db.commit()

        resp = client.get("/api/employees?status=active")
        data = resp.json()
        assert data["total"] == 1
        assert data["employees"][0]["first_name"] == "Active"


class TestCreateEmployee:
    """Tests for POST /api/employees."""

    def test_create_employee(self, client, seed_department, seed_position):
        dept_id = seed_department()
        pos_id = seed_position(dept_id=dept_id)
        resp = client.post("/api/employees", json={
            "first_name": "Jane",
            "last_name": "Doe",
            "email": "jane.doe@test.com",
            "department_id": dept_id,
            "position_id": pos_id,
            "status": "active",
            "start_date": "2024-03-01"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["first_name"] == "Jane"
        assert data["last_name"] == "Doe"
        assert data["email"] == "jane.doe@test.com"
        assert data["id"] is not None
        assert data["status"] == "active"

    def test_create_employee_minimal_fields(self, client):
        resp = client.post("/api/employees", json={
            "first_name": "Min",
            "last_name": "User",
            "email": "min.user@test.com"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["first_name"] == "Min"
        assert data["status"] == "active"  # default status

    def test_create_employee_missing_first_name(self, client):
        resp = client.post("/api/employees", json={
            "last_name": "Doe",
            "email": "no.first@test.com"
        })
        assert resp.status_code == 400
        assert "first_name" in resp.json()["detail"].lower()

    def test_create_employee_missing_last_name(self, client):
        resp = client.post("/api/employees", json={
            "first_name": "No",
            "email": "no.last@test.com"
        })
        assert resp.status_code == 400
        assert "last_name" in resp.json()["detail"].lower()

    def test_create_employee_missing_email(self, client):
        resp = client.post("/api/employees", json={
            "first_name": "No",
            "last_name": "Email"
        })
        assert resp.status_code == 400
        assert "email" in resp.json()["detail"].lower()

    def test_create_employee_duplicate_email(self, client, seed_employee):
        seed_employee(first_name="Existing", last_name="User", email="dupe@test.com")
        resp = client.post("/api/employees", json={
            "first_name": "New",
            "last_name": "User",
            "email": "dupe@test.com"
        })
        assert resp.status_code == 409  # duplicate email
        assert "already exists" in resp.json()["detail"]


class TestGetEmployee:
    """Tests for GET /api/employees/{id}."""

    def test_get_employee(self, client, seed_employee):
        eid = seed_employee(first_name="Alice", last_name="Smith")
        resp = client.get(f"/api/employees/{eid}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == eid
        assert data["first_name"] == "Alice"
        assert data["last_name"] == "Smith"

    def test_get_employee_not_found(self, client):
        resp = client.get("/api/employees/nonexistent-id")
        assert resp.status_code == 404

    def test_get_employee_includes_joins(self, client, seed_department, seed_position):
        dept_id = seed_department(name="Marketing")
        pos_id = seed_position(title="Manager", dept_id=dept_id)
        resp = client.post("/api/employees", json={
            "first_name": "Join",
            "last_name": "Test",
            "email": "join.test@test.com",
            "department_id": dept_id,
            "position_id": pos_id
        })
        eid = resp.json()["id"]
        resp2 = client.get(f"/api/employees/{eid}")
        data = resp2.json()
        assert data["department_name"] == "Marketing"
        assert data["position_title"] == "Manager"


class TestUpdateEmployee:
    """Tests for PUT /api/employees/{id}."""

    def test_update_employee_name(self, client, seed_employee):
        eid = seed_employee(first_name="Old", last_name="Name")
        resp = client.put(f"/api/employees/{eid}", json={"first_name": "New"})
        assert resp.status_code == 200
        assert resp.json()["first_name"] == "New"

    def test_update_employee_multiple_fields(self, client, seed_employee):
        eid = seed_employee()
        resp = client.put(f"/api/employees/{eid}", json={
            "first_name": "Updated",
            "last_name": "Person",
            "phone": "555-1234"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["first_name"] == "Updated"
        assert data["last_name"] == "Person"
        assert data["phone"] == "555-1234"

    def test_update_employee_no_fields(self, client, seed_employee):
        eid = seed_employee()
        resp = client.put(f"/api/employees/{eid}", json={})
        assert resp.status_code == 400

    def test_update_employee_status(self, client, seed_employee):
        eid = seed_employee()
        resp = client.put(f"/api/employees/{eid}", json={"status": "inactive"})
        assert resp.status_code == 200
        assert resp.json()["status"] == "inactive"

    def test_update_preserves_other_fields(self, client, seed_employee):
        eid = seed_employee(first_name="Alice", last_name="Smith")
        client.put(f"/api/employees/{eid}", json={"phone": "555-0000"})
        resp = client.get(f"/api/employees/{eid}")
        data = resp.json()
        assert data["first_name"] == "Alice"  # unchanged
        assert data["last_name"] == "Smith"   # unchanged
        assert data["phone"] == "555-0000"    # updated
