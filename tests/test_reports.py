"""Tests for the reports router: all report endpoints return 200 with expected structure."""


def test_headcount_report_empty(client):
    resp = client.get("/api/reports/headcount")
    assert resp.status_code == 200
    data = resp.json()
    assert "by_department" in data
    assert "by_position" in data
    assert "totals" in data


def test_headcount_report_with_data(client, seed_employee):
    seed_employee()
    resp = client.get("/api/reports/headcount")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["totals"]) > 0
    assert any(t["count"] > 0 for t in data["totals"])


def test_turnover_report(client):
    resp = client.get("/api/reports/turnover")
    assert resp.status_code == 200
    data = resp.json()
    assert "by_period" in data
    assert "total_active" in data
    assert "total_terminated" in data
    assert "turnover_rate" in data


def test_turnover_report_period_param(client):
    for period in ["month", "quarter", "year"]:
        resp = client.get(f"/api/reports/turnover?period={period}")
        assert resp.status_code == 200


def test_leave_utilization_report(client, seed_leave_types):
    resp = client.get("/api/reports/leave-utilization")
    assert resp.status_code == 200
    data = resp.json()
    assert "by_type" in data
    assert "by_department" in data


def test_time_summary_report(client):
    resp = client.get("/api/reports/time-summary")
    assert resp.status_code == 200
    data = resp.json()
    assert "by_employee" in data
    assert "by_project" in data
    assert "total_hours" in data
    assert "total_entries" in data


def test_time_summary_report_with_dates(client):
    resp = client.get("/api/reports/time-summary?from_date=2025-01-01&to_date=2025-12-31")
    assert resp.status_code == 200


def test_compensation_report(client):
    resp = client.get("/api/reports/compensation")
    assert resp.status_code == 200
    data = resp.json()
    assert "by_department" in data
    assert "by_position" in data


def test_compensation_report_with_data(client, seed_employee):
    seed_employee()
    resp = client.get("/api/reports/compensation")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["by_department"]) > 0


def test_recruitment_report(client):
    resp = client.get("/api/reports/recruitment")
    assert resp.status_code == 200
    data = resp.json()
    assert "postings_by_status" in data
    assert "applicants_by_stage" in data
    assert "total_postings" in data
    assert "total_applicants" in data
    assert "total_hired" in data
    assert "conversion_rate" in data


def test_diversity_report(client):
    resp = client.get("/api/reports/diversity")
    assert resp.status_code == 200
    data = resp.json()
    assert "by_department" in data
    assert "by_tenure" in data


def test_diversity_report_with_data(client, seed_employee):
    seed_employee()
    resp = client.get("/api/reports/diversity")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["by_department"]) > 0
