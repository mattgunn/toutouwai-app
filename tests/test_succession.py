"""Tests for the succession planning endpoints."""
import pytest


def _seed_employee_and_position(db, seed_department):
    from api.db import new_id, now_iso
    dept_id = seed_department()
    ts = now_iso()
    pos_id = new_id()
    db.execute(
        "INSERT INTO positions (id, title, department_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
        (pos_id, "Manager", dept_id, ts, ts),
    )
    emp_id = new_id()
    db.execute(
        "INSERT INTO employees (id, first_name, last_name, email, department_id, position_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)",
        (emp_id, "Succ", "Worker", f"succ-{emp_id[:8]}@test.com", dept_id, pos_id, ts, ts),
    )
    db.commit()
    return emp_id, pos_id, dept_id


class TestSuccessionPlans:
    def test_list_plans_empty(self, client):
        resp = client.get("/api/succession")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_create_plan(self, client, db, seed_department):
        emp_id, pos_id, _ = _seed_employee_and_position(db, seed_department)

        resp = client.post("/api/succession", json={
            "position_id": pos_id,
            "incumbent_id": emp_id,
            "risk_of_loss": "high",
            "impact_of_loss": "critical",
            "notes": "Key role",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["position_id"] == pos_id
        assert data["incumbent_id"] == emp_id
        assert data["risk_of_loss"] == "high"
        assert "position_title" in data
        assert "incumbent_name" in data

    def test_create_plan_defaults(self, client, db, seed_department):
        _, pos_id, _ = _seed_employee_and_position(db, seed_department)

        resp = client.post("/api/succession", json={
            "position_id": pos_id,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["risk_of_loss"] == "low"
        assert data["impact_of_loss"] == "low"

    def test_list_plans_after_create(self, client, db, seed_department):
        _, pos_id, _ = _seed_employee_and_position(db, seed_department)
        client.post("/api/succession", json={"position_id": pos_id})

        resp = client.get("/api/succession")
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    def test_plan_includes_candidate_count(self, client, db, seed_department):
        _, pos_id, _ = _seed_employee_and_position(db, seed_department)
        create_resp = client.post("/api/succession", json={"position_id": pos_id})
        plan_id = create_resp.json()["id"]

        plans = client.get("/api/succession").json()
        plan = [p for p in plans if p["id"] == plan_id][0]
        assert plan["candidate_count"] == 0

    def test_update_plan(self, client, db, seed_department):
        _, pos_id, _ = _seed_employee_and_position(db, seed_department)
        create_resp = client.post("/api/succession", json={"position_id": pos_id})
        plan_id = create_resp.json()["id"]

        resp = client.put(f"/api/succession/{plan_id}", json={
            "risk_of_loss": "medium",
            "notes": "Updated notes",
        })
        assert resp.status_code == 200
        assert resp.json()["risk_of_loss"] == "medium"
        assert resp.json()["notes"] == "Updated notes"

    def test_update_plan_no_fields_returns_400(self, client, db, seed_department):
        _, pos_id, _ = _seed_employee_and_position(db, seed_department)
        create_resp = client.post("/api/succession", json={"position_id": pos_id})
        plan_id = create_resp.json()["id"]

        resp = client.put(f"/api/succession/{plan_id}", json={})
        assert resp.status_code == 400

    def test_update_nonexistent_plan_returns_404(self, client):
        resp = client.put("/api/succession/nonexistent-id", json={"risk_of_loss": "high"})
        assert resp.status_code == 404


class TestSuccessionCandidates:
    def _create_plan(self, client, db, seed_department):
        emp_id, pos_id, dept_id = _seed_employee_and_position(db, seed_department)
        resp = client.post("/api/succession", json={"position_id": pos_id, "incumbent_id": emp_id})
        return resp.json()["id"], emp_id, pos_id, dept_id

    def test_list_candidates_empty(self, client, db, seed_department):
        plan_id, _, _, _ = self._create_plan(client, db, seed_department)
        resp = client.get(f"/api/succession/{plan_id}/candidates")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_add_candidate(self, client, db, seed_department):
        plan_id, _, _, dept_id = self._create_plan(client, db, seed_department)
        from api.db import new_id, now_iso
        ts = now_iso()
        cand_id = new_id()
        pos_id2 = new_id()
        db.execute(
            "INSERT INTO positions (id, title, department_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            (pos_id2, "Junior", dept_id, ts, ts),
        )
        db.execute(
            "INSERT INTO employees (id, first_name, last_name, email, department_id, position_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)",
            (cand_id, "Cand", "One", f"cand-{cand_id[:8]}@test.com", dept_id, pos_id2, ts, ts),
        )
        db.commit()

        resp = client.post(f"/api/succession/{plan_id}/candidates", json={
            "employee_id": cand_id,
            "readiness": "ready_now",
            "notes": "Top candidate",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["employee_id"] == cand_id
        assert data["readiness"] == "ready_now"
        assert "employee_name" in data

    def test_add_candidate_defaults(self, client, db, seed_department):
        plan_id, emp_id, _, _ = self._create_plan(client, db, seed_department)
        resp = client.post(f"/api/succession/{plan_id}/candidates", json={
            "employee_id": emp_id,
        })
        assert resp.status_code == 200
        assert resp.json()["readiness"] == "not_ready"

    def test_list_candidates_after_add(self, client, db, seed_department):
        plan_id, emp_id, _, _ = self._create_plan(client, db, seed_department)
        client.post(f"/api/succession/{plan_id}/candidates", json={"employee_id": emp_id})
        resp = client.get(f"/api/succession/{plan_id}/candidates")
        assert len(resp.json()) >= 1

    def test_update_candidate(self, client, db, seed_department):
        plan_id, emp_id, _, _ = self._create_plan(client, db, seed_department)
        create_resp = client.post(f"/api/succession/{plan_id}/candidates", json={
            "employee_id": emp_id,
        })
        cand_id = create_resp.json()["id"]

        resp = client.put(f"/api/succession/candidates/{cand_id}", json={
            "readiness": "ready_1_year",
            "notes": "Needs development",
        })
        assert resp.status_code == 200
        assert resp.json()["readiness"] == "ready_1_year"
        assert resp.json()["notes"] == "Needs development"

    def test_update_candidate_no_fields_returns_400(self, client, db, seed_department):
        plan_id, emp_id, _, _ = self._create_plan(client, db, seed_department)
        create_resp = client.post(f"/api/succession/{plan_id}/candidates", json={
            "employee_id": emp_id,
        })
        cand_id = create_resp.json()["id"]

        resp = client.put(f"/api/succession/candidates/{cand_id}", json={})
        assert resp.status_code == 400

    def test_update_nonexistent_candidate_returns_404(self, client):
        resp = client.put("/api/succession/candidates/nonexistent-id", json={"readiness": "ready_now"})
        assert resp.status_code == 404

    def test_remove_candidate(self, client, db, seed_department):
        plan_id, emp_id, _, _ = self._create_plan(client, db, seed_department)
        create_resp = client.post(f"/api/succession/{plan_id}/candidates", json={
            "employee_id": emp_id,
        })
        cand_id = create_resp.json()["id"]

        resp = client.delete(f"/api/succession/candidates/{cand_id}")
        assert resp.status_code == 200
        assert resp.json()["ok"] is True

        candidates = client.get(f"/api/succession/{plan_id}/candidates").json()
        ids = [c["id"] for c in candidates]
        assert cand_id not in ids

    def test_remove_nonexistent_candidate_still_ok(self, client):
        resp = client.delete("/api/succession/candidates/nonexistent-id")
        assert resp.status_code == 200
