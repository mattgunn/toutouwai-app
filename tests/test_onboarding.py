"""Tests for the onboarding router: templates, template tasks, checklists, and checklist tasks."""


# ── Templates ──────────────────────────────────────────────────────


def _create_template(client, **overrides):
    payload = {"name": "New Hire Onboarding", "description": "Standard onboarding"}
    payload.update(overrides)
    return client.post("/api/onboarding/templates", json=payload)


def test_create_template(client):
    resp = _create_template(client)
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "New Hire Onboarding"
    assert data["is_active"] == 1
    assert "id" in data


def test_create_template_with_department(client, seed_department):
    dept_id = seed_department("HR")
    resp = _create_template(client, department_id=dept_id)
    assert resp.status_code == 200
    data = resp.json()
    assert data["department_id"] == dept_id
    assert data["department_name"] == "HR"


def test_list_templates_empty(client):
    resp = client.get("/api/onboarding/templates")
    assert resp.status_code == 200
    assert resp.json() == []


def test_list_templates(client):
    _create_template(client, name="Template A")
    _create_template(client, name="Template B")
    resp = client.get("/api/onboarding/templates")
    assert resp.status_code == 200
    names = [t["name"] for t in resp.json()]
    assert "Template A" in names
    assert "Template B" in names


def test_update_template(client):
    tid = _create_template(client).json()["id"]
    resp = client.put(f"/api/onboarding/templates/{tid}", json={"name": "Updated"})
    assert resp.status_code == 200
    assert resp.json()["name"] == "Updated"


def test_update_template_no_fields(client):
    tid = _create_template(client).json()["id"]
    resp = client.put(f"/api/onboarding/templates/{tid}", json={})
    assert resp.status_code == 400


def test_update_template_not_found(client):
    resp = client.put("/api/onboarding/templates/nonexistent", json={"name": "X"})
    assert resp.status_code == 404


# ── Template Tasks ─────────────────────────────────────────────────


def _create_template_task(client, template_id, **overrides):
    payload = {"title": "Setup laptop", "description": "Order and configure laptop"}
    payload.update(overrides)
    return client.post(f"/api/onboarding/templates/{template_id}/tasks", json=payload)


def test_create_template_task(client):
    tid = _create_template(client).json()["id"]
    resp = _create_template_task(client, tid)
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "Setup laptop"
    assert data["template_id"] == tid
    assert data["assigned_to_role"] == "hr"


def test_create_template_task_custom_fields(client):
    tid = _create_template(client).json()["id"]
    resp = _create_template_task(
        client, tid,
        title="Security training",
        assigned_to_role="manager",
        due_days=5,
        sort_order=2,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["assigned_to_role"] == "manager"
    assert data["due_days"] == 5
    assert data["sort_order"] == 2


def test_list_template_tasks(client):
    tid = _create_template(client).json()["id"]
    _create_template_task(client, tid, title="Task A")
    _create_template_task(client, tid, title="Task B")
    resp = client.get(f"/api/onboarding/templates/{tid}/tasks")
    assert resp.status_code == 200
    titles = [t["title"] for t in resp.json()]
    assert "Task A" in titles
    assert "Task B" in titles


def test_update_template_task(client):
    tid = _create_template(client).json()["id"]
    task_id = _create_template_task(client, tid).json()["id"]
    resp = client.put(
        f"/api/onboarding/templates/tasks/{task_id}",
        json={"title": "Updated task", "due_days": 10},
    )
    assert resp.status_code == 200
    assert resp.json()["title"] == "Updated task"
    assert resp.json()["due_days"] == 10


def test_update_template_task_no_fields(client):
    tid = _create_template(client).json()["id"]
    task_id = _create_template_task(client, tid).json()["id"]
    resp = client.put(f"/api/onboarding/templates/tasks/{task_id}", json={})
    assert resp.status_code == 400


def test_update_template_task_not_found(client):
    resp = client.put("/api/onboarding/templates/tasks/nonexistent", json={"title": "X"})
    assert resp.status_code == 404


def test_delete_template_task(client):
    tid = _create_template(client).json()["id"]
    task_id = _create_template_task(client, tid).json()["id"]
    resp = client.delete(f"/api/onboarding/templates/tasks/{task_id}")
    assert resp.status_code == 200
    assert resp.json()["ok"] is True
    # Verify deleted
    tasks = client.get(f"/api/onboarding/templates/{tid}/tasks").json()
    assert all(t["id"] != task_id for t in tasks)


# ── Checklists ─────────────────────────────────────────────────────


def test_create_checklist_without_template(client, seed_employee):
    emp_id = seed_employee()
    resp = client.post("/api/onboarding/checklists", json={"employee_id": emp_id})
    assert resp.status_code == 200
    data = resp.json()
    assert data["employee_id"] == emp_id
    assert data["status"] == "in_progress"
    assert data["total_tasks"] == 0


def test_create_checklist_with_template(client, seed_employee):
    emp_id = seed_employee()
    tid = _create_template(client).json()["id"]
    _create_template_task(client, tid, title="Task 1", due_days=3)
    _create_template_task(client, tid, title="Task 2", due_days=7)

    resp = client.post("/api/onboarding/checklists", json={
        "employee_id": emp_id,
        "template_id": tid,
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["template_id"] == tid
    assert data["total_tasks"] == 2
    assert data["completed_tasks"] == 0
    task_titles = [t["title"] for t in data["tasks"]]
    assert "Task 1" in task_titles
    assert "Task 2" in task_titles


def test_list_checklists(client, seed_employee):
    emp_id = seed_employee()
    client.post("/api/onboarding/checklists", json={"employee_id": emp_id})
    resp = client.get("/api/onboarding/checklists")
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


def test_list_checklists_filter_by_employee(client, seed_employee):
    emp1 = seed_employee(first_name="Alice", last_name="One", email="alice@test.com")
    emp2 = seed_employee(first_name="Bob", last_name="Two", email="bob@test.com")
    client.post("/api/onboarding/checklists", json={"employee_id": emp1})
    client.post("/api/onboarding/checklists", json={"employee_id": emp2})

    resp = client.get(f"/api/onboarding/checklists?employee_id={emp1}")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["employee_id"] == emp1


# ── Checklist Tasks ────────────────────────────────────────────────


def test_update_checklist_task_status(client, seed_employee):
    emp_id = seed_employee()
    tid = _create_template(client).json()["id"]
    _create_template_task(client, tid, title="Do thing")
    checklist = client.post("/api/onboarding/checklists", json={
        "employee_id": emp_id,
        "template_id": tid,
    }).json()
    task_id = checklist["tasks"][0]["id"]

    resp = client.put(f"/api/onboarding/tasks/{task_id}", json={"status": "completed"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "completed"
    assert data["completed_at"] is not None
    assert data["completed_by"] is not None


def test_completing_all_tasks_completes_checklist(client, seed_employee, db):
    emp_id = seed_employee()
    tid = _create_template(client).json()["id"]
    _create_template_task(client, tid, title="Only task")
    checklist = client.post("/api/onboarding/checklists", json={
        "employee_id": emp_id,
        "template_id": tid,
    }).json()
    task_id = checklist["tasks"][0]["id"]

    client.put(f"/api/onboarding/tasks/{task_id}", json={"status": "completed"})

    # Verify checklist status is now completed
    row = db.execute(
        "SELECT status FROM onboarding_checklists WHERE id = ?",
        (checklist["id"],),
    ).fetchone()
    assert row["status"] == "completed"


def test_reverting_task_reverts_checklist(client, seed_employee, db):
    emp_id = seed_employee()
    tid = _create_template(client).json()["id"]
    _create_template_task(client, tid, title="Only task")
    checklist = client.post("/api/onboarding/checklists", json={
        "employee_id": emp_id,
        "template_id": tid,
    }).json()
    task_id = checklist["tasks"][0]["id"]

    # Complete then revert
    client.put(f"/api/onboarding/tasks/{task_id}", json={"status": "completed"})
    client.put(f"/api/onboarding/tasks/{task_id}", json={"status": "pending"})

    row = db.execute(
        "SELECT status FROM onboarding_checklists WHERE id = ?",
        (checklist["id"],),
    ).fetchone()
    assert row["status"] == "in_progress"


def test_update_checklist_task_no_fields(client, seed_employee):
    emp_id = seed_employee()
    tid = _create_template(client).json()["id"]
    _create_template_task(client, tid, title="Task")
    checklist = client.post("/api/onboarding/checklists", json={
        "employee_id": emp_id,
        "template_id": tid,
    }).json()
    task_id = checklist["tasks"][0]["id"]

    resp = client.put(f"/api/onboarding/tasks/{task_id}", json={})
    assert resp.status_code == 400


def test_update_checklist_task_not_found(client):
    resp = client.put("/api/onboarding/tasks/nonexistent", json={"status": "completed"})
    assert resp.status_code == 404
