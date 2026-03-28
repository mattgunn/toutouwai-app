"""Tests for the recruitment endpoints."""
import pytest


class TestJobPostings:
    def test_list_postings_empty(self, client):
        resp = client.get("/api/recruitment/postings")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_create_posting(self, client, seed_department):
        dept_id = seed_department()
        resp = client.post("/api/recruitment/postings", json={
            "title": "Software Engineer",
            "department_id": dept_id,
            "description": "Build great software",
            "requirements": "3+ years experience",
            "status": "published",
            "location": "Remote",
            "employment_type": "full_time",
            "salary_min": 80000,
            "salary_max": 120000,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "Software Engineer"
        assert data["department_name"] is not None
        assert data["applicant_count"] == 0

    def test_create_posting_minimal(self, client):
        resp = client.post("/api/recruitment/postings", json={
            "title": "Junior Dev",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "Junior Dev"
        assert data["status"] == "draft"

    def test_list_postings_after_create(self, client):
        client.post("/api/recruitment/postings", json={"title": "Role A"})
        client.post("/api/recruitment/postings", json={"title": "Role B"})
        resp = client.get("/api/recruitment/postings")
        assert resp.status_code == 200
        assert len(resp.json()) >= 2

    def test_filter_postings_by_status(self, client):
        client.post("/api/recruitment/postings", json={"title": "Published Role", "status": "published"})
        client.post("/api/recruitment/postings", json={"title": "Draft Role", "status": "draft"})
        resp = client.get("/api/recruitment/postings?status=published")
        assert resp.status_code == 200
        for p in resp.json():
            assert p["status"] == "published"

    def test_get_posting_by_id(self, client):
        create_resp = client.post("/api/recruitment/postings", json={"title": "Find Me"})
        pid = create_resp.json()["id"]
        resp = client.get(f"/api/recruitment/postings/{pid}")
        assert resp.status_code == 200
        assert resp.json()["title"] == "Find Me"

    def test_get_nonexistent_posting_returns_404(self, client):
        resp = client.get("/api/recruitment/postings/nonexistent-id")
        assert resp.status_code == 404

    def test_update_posting(self, client):
        create_resp = client.post("/api/recruitment/postings", json={"title": "Original"})
        pid = create_resp.json()["id"]
        resp = client.put(f"/api/recruitment/postings/{pid}", json={
            "title": "Updated Title",
            "status": "published",
        })
        assert resp.status_code == 200
        assert resp.json()["title"] == "Updated Title"
        assert resp.json()["status"] == "published"


class TestApplicants:
    def _create_posting(self, client):
        resp = client.post("/api/recruitment/postings", json={"title": "Test Role"})
        return resp.json()["id"]

    def test_list_applicants_empty(self, client):
        resp = client.get("/api/recruitment/applicants")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_create_applicant(self, client):
        posting_id = self._create_posting(client)
        resp = client.post("/api/recruitment/applicants", json={
            "first_name": "Jane",
            "last_name": "Doe",
            "email": "jane@example.com",
            "phone": "555-1234",
            "job_posting_id": posting_id,
            "rating": 4,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["first_name"] == "Jane"
        assert data["last_name"] == "Doe"
        assert data["stage"] == "applied"
        assert data["status"] == "applied"
        assert data["job_title"] == "Test Role"

    def test_list_applicants_after_create(self, client):
        posting_id = self._create_posting(client)
        client.post("/api/recruitment/applicants", json={
            "first_name": "A", "last_name": "B", "email": "a@b.com", "job_posting_id": posting_id,
        })
        resp = client.get("/api/recruitment/applicants")
        assert resp.status_code == 200
        assert len(resp.json()) >= 1

    def test_filter_applicants_by_posting(self, client):
        p1 = self._create_posting(client)
        p2 = self._create_posting(client)
        client.post("/api/recruitment/applicants", json={
            "first_name": "X", "last_name": "Y", "email": "x@y.com", "job_posting_id": p1,
        })
        client.post("/api/recruitment/applicants", json={
            "first_name": "Z", "last_name": "W", "email": "z@w.com", "job_posting_id": p2,
        })
        resp = client.get(f"/api/recruitment/applicants?job_posting_id={p1}")
        assert resp.status_code == 200
        for a in resp.json():
            assert a["job_posting_id"] == p1

    def test_filter_applicants_by_stage(self, client):
        posting_id = self._create_posting(client)
        client.post("/api/recruitment/applicants", json={
            "first_name": "S", "last_name": "T", "email": "s@t.com", "job_posting_id": posting_id,
        })
        resp = client.get("/api/recruitment/applicants?stage=applied")
        assert resp.status_code == 200
        for a in resp.json():
            assert a["stage"] == "applied"

    def test_get_applicant_by_id(self, client):
        posting_id = self._create_posting(client)
        create_resp = client.post("/api/recruitment/applicants", json={
            "first_name": "Find", "last_name": "Me", "email": "find@me.com", "job_posting_id": posting_id,
        })
        aid = create_resp.json()["id"]
        resp = client.get(f"/api/recruitment/applicants/{aid}")
        assert resp.status_code == 200
        assert resp.json()["email"] == "find@me.com"

    def test_get_nonexistent_applicant_returns_404(self, client):
        resp = client.get("/api/recruitment/applicants/nonexistent-id")
        assert resp.status_code == 404

    def test_update_applicant_stage(self, client):
        posting_id = self._create_posting(client)
        create_resp = client.post("/api/recruitment/applicants", json={
            "first_name": "Stage", "last_name": "Test", "email": "stage@test.com", "job_posting_id": posting_id,
        })
        aid = create_resp.json()["id"]

        resp = client.put(f"/api/recruitment/applicants/{aid}/stage", json={"stage": "interview"})
        assert resp.status_code == 200
        assert resp.json()["stage"] == "interview"

    def test_update_applicant_fields(self, client):
        posting_id = self._create_posting(client)
        create_resp = client.post("/api/recruitment/applicants", json={
            "first_name": "Up", "last_name": "Date", "email": "up@date.com", "job_posting_id": posting_id,
        })
        aid = create_resp.json()["id"]

        resp = client.put(f"/api/recruitment/applicants/{aid}", json={
            "rating": 5,
            "notes": "Great candidate",
        })
        assert resp.status_code == 200
        assert resp.json()["rating"] == 5
        assert resp.json()["notes"] == "Great candidate"

    def test_posting_applicant_count(self, client):
        posting_id = self._create_posting(client)
        client.post("/api/recruitment/applicants", json={
            "first_name": "C1", "last_name": "T", "email": "c1@t.com", "job_posting_id": posting_id,
        })
        client.post("/api/recruitment/applicants", json={
            "first_name": "C2", "last_name": "T", "email": "c2@t.com", "job_posting_id": posting_id,
        })
        resp = client.get(f"/api/recruitment/postings/{posting_id}")
        assert resp.json()["applicant_count"] == 2
