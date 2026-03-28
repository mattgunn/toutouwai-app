"""Tests for the performance management endpoints."""
import pytest


class TestReviewCycles:
    def test_list_cycles_empty(self, client):
        resp = client.get("/api/performance/cycles")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_create_cycle(self, client):
        resp = client.post("/api/performance/cycles", json={
            "name": "Q1 2026 Review",
            "start_date": "2026-01-01",
            "end_date": "2026-03-31",
            "status": "active",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Q1 2026 Review"
        assert data["status"] == "active"

    def test_create_cycle_default_status(self, client):
        resp = client.post("/api/performance/cycles", json={
            "name": "Draft Cycle",
            "start_date": "2026-04-01",
            "end_date": "2026-06-30",
        })
        assert resp.status_code == 200
        assert resp.json()["status"] == "draft"

    def test_list_cycles_after_create(self, client):
        client.post("/api/performance/cycles", json={
            "name": "Cycle A", "start_date": "2026-01-01", "end_date": "2026-03-31",
        })
        resp = client.get("/api/performance/cycles")
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    def test_cycle_includes_review_count(self, client):
        resp = client.post("/api/performance/cycles", json={
            "name": "Count Cycle", "start_date": "2026-01-01", "end_date": "2026-03-31",
        })
        cycle = resp.json()
        cycles = client.get("/api/performance/cycles").json()
        found = [c for c in cycles if c["id"] == cycle["id"]]
        assert found[0]["review_count"] == 0


class TestReviews:
    def _create_cycle(self, client):
        resp = client.post("/api/performance/cycles", json={
            "name": "Test Cycle", "start_date": "2026-01-01", "end_date": "2026-06-30",
        })
        return resp.json()["id"]

    def test_list_reviews_empty(self, client):
        resp = client.get("/api/performance/reviews")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_create_review(self, client, seed_employee):
        cycle_id = self._create_cycle(client)
        emp_id = seed_employee(first_name="PerfA", last_name="Worker", email="perfa@test.com")
        reviewer_id = seed_employee(first_name="PerfB", last_name="Reviewer", email="perfb@test.com")

        resp = client.post("/api/performance/reviews", json={
            "employee_id": emp_id,
            "reviewer_id": reviewer_id,
            "cycle_id": cycle_id,
            "rating": 4,
            "feedback": "Good work",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["employee_id"] == emp_id
        assert data["cycle_id"] == cycle_id
        assert data["rating"] == 4
        assert data["status"] == "draft"
        assert "employee_name" in data
        assert "cycle_name" in data

    def test_list_reviews_after_create(self, client, seed_employee):
        cycle_id = self._create_cycle(client)
        emp_id = seed_employee(first_name="PerfC", last_name="Worker", email="perfc@test.com")
        reviewer_id = seed_employee(first_name="PerfD", last_name="Reviewer", email="perfd@test.com")
        client.post("/api/performance/reviews", json={
            "employee_id": emp_id, "reviewer_id": reviewer_id, "cycle_id": cycle_id,
        })
        resp = client.get("/api/performance/reviews")
        assert len(resp.json()) >= 1

    def test_filter_reviews_by_cycle(self, client, seed_employee):
        c1 = self._create_cycle(client)
        emp = seed_employee(first_name="PerfE", last_name="Worker", email="perfe@test.com")
        rev = seed_employee(first_name="PerfF", last_name="Reviewer", email="perff@test.com")
        client.post("/api/performance/reviews", json={
            "employee_id": emp, "reviewer_id": rev, "cycle_id": c1,
        })
        resp = client.get(f"/api/performance/reviews?cycle_id={c1}")
        assert resp.status_code == 200
        for r in resp.json():
            assert r["cycle_id"] == c1

    def test_filter_reviews_by_employee(self, client, seed_employee):
        c1 = self._create_cycle(client)
        emp = seed_employee(first_name="PerfG", last_name="Worker", email="perfg@test.com")
        rev = seed_employee(first_name="PerfH", last_name="Reviewer", email="perfh@test.com")
        client.post("/api/performance/reviews", json={
            "employee_id": emp, "reviewer_id": rev, "cycle_id": c1,
        })
        resp = client.get(f"/api/performance/reviews?employee_id={emp}")
        for r in resp.json():
            assert r["employee_id"] == emp

    def test_update_review(self, client, seed_employee):
        cycle_id = self._create_cycle(client)
        emp_id = seed_employee(first_name="PerfI", last_name="Worker", email="perfi@test.com")
        reviewer_id = seed_employee(first_name="PerfJ", last_name="Reviewer", email="perfj@test.com")
        create_resp = client.post("/api/performance/reviews", json={
            "employee_id": emp_id, "reviewer_id": reviewer_id, "cycle_id": cycle_id,
        })
        rid = create_resp.json()["id"]

        resp = client.put(f"/api/performance/reviews/{rid}", json={
            "rating": 5,
            "feedback": "Excellent",
            "status": "submitted",
        })
        assert resp.status_code == 200
        assert resp.json()["rating"] == 5
        assert resp.json()["status"] == "submitted"

    def test_update_nonexistent_review_returns_404(self, client):
        resp = client.put("/api/performance/reviews/nonexistent-id", json={"rating": 3})
        assert resp.status_code == 404


class TestGoals:
    def test_list_goals_empty(self, client):
        resp = client.get("/api/performance/goals")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_create_goal(self, client, seed_employee):
        emp_id = seed_employee(first_name="GoalA", last_name="Worker", email="goala@test.com")
        resp = client.post("/api/performance/goals", json={
            "employee_id": emp_id,
            "title": "Learn Rust",
            "description": "Complete the Rust book",
            "due_date": "2026-06-30",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "Learn Rust"
        assert data["status"] == "not_started"
        assert data["progress"] == 0
        assert "employee_name" in data

    def test_list_goals_after_create(self, client, seed_employee):
        emp_id = seed_employee(first_name="GoalB", last_name="Worker", email="goalb@test.com")
        client.post("/api/performance/goals", json={
            "employee_id": emp_id, "title": "Goal A",
        })
        resp = client.get("/api/performance/goals")
        assert len(resp.json()) >= 1

    def test_filter_goals_by_employee(self, client, seed_employee):
        emp = seed_employee(first_name="GoalC", last_name="Worker", email="goalc@test.com")
        client.post("/api/performance/goals", json={
            "employee_id": emp, "title": "Emp Goal",
        })
        resp = client.get(f"/api/performance/goals?employee_id={emp}")
        for g in resp.json():
            assert g["employee_id"] == emp

    def test_filter_goals_by_status(self, client, seed_employee):
        emp = seed_employee(first_name="GoalD", last_name="Worker", email="goald@test.com")
        client.post("/api/performance/goals", json={
            "employee_id": emp, "title": "Status Goal", "status": "in_progress",
        })
        resp = client.get("/api/performance/goals?status=in_progress")
        for g in resp.json():
            assert g["status"] == "in_progress"

    def test_update_goal(self, client, seed_employee):
        emp_id = seed_employee(first_name="GoalE", last_name="Worker", email="goale@test.com")
        create_resp = client.post("/api/performance/goals", json={
            "employee_id": emp_id, "title": "Update Me",
        })
        gid = create_resp.json()["id"]

        resp = client.put(f"/api/performance/goals/{gid}", json={
            "title": "Updated Goal",
            "progress": 50,
            "status": "in_progress",
        })
        assert resp.status_code == 200
        assert resp.json()["title"] == "Updated Goal"
        assert resp.json()["progress"] == 50

    def test_update_nonexistent_goal_returns_404(self, client):
        resp = client.put("/api/performance/goals/nonexistent-id", json={"title": "X"})
        assert resp.status_code == 404

    def test_delete_goal(self, client, seed_employee):
        emp_id = seed_employee(first_name="GoalF", last_name="Worker", email="goalf@test.com")
        create_resp = client.post("/api/performance/goals", json={
            "employee_id": emp_id, "title": "Delete Me",
        })
        gid = create_resp.json()["id"]

        resp = client.delete(f"/api/performance/goals/{gid}")
        assert resp.status_code == 200
        assert resp.json()["ok"] is True

        goals = client.get(f"/api/performance/goals?employee_id={emp_id}").json()
        ids = [g["id"] for g in goals]
        assert gid not in ids

    def test_delete_nonexistent_goal_still_ok(self, client):
        resp = client.delete("/api/performance/goals/nonexistent-id")
        assert resp.status_code == 200
