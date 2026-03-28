"""Tests for the seed router: seeding and clearing the database."""


def test_seed_database(client, seed_leave_types):
    """POST /api/seed should populate the database with data."""
    resp = client.post("/api/seed")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"

    counts = data["counts"]
    assert counts["departments"] > 0
    assert counts["positions"] > 0
    assert counts["employees"] > 0
    assert counts["leave_requests"] > 0
    assert counts["time_entries"] > 0
    assert counts["job_postings"] > 0
    assert counts["applicants"] > 0
    assert counts["review_cycles"] > 0
    assert counts["reviews"] > 0
    assert counts["goals"] > 0
    assert counts["compensation"] > 0
    assert counts["benefit_plans"] > 0
    assert counts["benefit_enrollments"] > 0
    assert counts["succession_plans"] > 0
    assert counts["onboarding_templates"] > 0
    assert counts["documents"] > 0
    assert counts["surveys"] > 0
    assert counts["workflow_definitions"] > 0
    assert counts["audit_log"] > 0


def test_seed_re_seed(client, seed_leave_types):
    """POST /api/seed twice should clear and re-seed (idempotent)."""
    resp1 = client.post("/api/seed")
    assert resp1.status_code == 200
    counts1 = resp1.json()["counts"]

    resp2 = client.post("/api/seed")
    assert resp2.status_code == 200
    counts2 = resp2.json()["counts"]

    # Both should have data (exact counts may vary due to random but should be > 0)
    assert counts2["employees"] > 0
    assert counts2["departments"] > 0


def test_clear_seed_data(client, seed_leave_types):
    """DELETE /api/seed should clear all seeded data."""
    client.post("/api/seed")
    resp = client.delete("/api/seed")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_tables_empty_after_clear(client, db, seed_leave_types):
    """After clearing, key tables should be empty."""
    client.post("/api/seed")
    client.delete("/api/seed")

    for table in ["employees", "departments", "positions", "leave_requests",
                   "time_entries", "job_postings", "applicants"]:
        count = db.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        assert count == 0, f"Table {table} should be empty after clear, has {count} rows"
