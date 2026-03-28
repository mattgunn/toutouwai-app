"""Tests for the documents router: CRUD and expiring documents."""
from datetime import datetime, timedelta


def _create_document(client, **overrides):
    payload = {
        "name": "Employment Contract",
        "category": "contract",
        "description": "Standard employment contract",
    }
    payload.update(overrides)
    return client.post("/api/documents", json=payload)


def test_create_document(client):
    resp = _create_document(client)
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Employment Contract"
    assert data["category"] == "contract"
    assert "id" in data


def test_create_document_with_employee(client, seed_employee):
    emp_id = seed_employee()
    resp = _create_document(client, employee_id=emp_id)
    assert resp.status_code == 200
    data = resp.json()
    assert data["employee_id"] == emp_id
    assert "Doe" in data["employee_name"]


def test_create_document_has_uploaded_by(client, admin_user):
    resp = _create_document(client)
    data = resp.json()
    assert data["uploaded_by"] == admin_user["id"]
    assert data["uploaded_by_name"] == admin_user["name"]


def test_list_documents_empty(client):
    resp = client.get("/api/documents")
    assert resp.status_code == 200
    assert resp.json() == []


def test_list_documents(client):
    _create_document(client, name="Doc A")
    _create_document(client, name="Doc B")
    resp = client.get("/api/documents")
    assert resp.status_code == 200
    names = [d["name"] for d in resp.json()]
    assert "Doc A" in names
    assert "Doc B" in names


def test_list_documents_filter_by_employee(client, seed_employee):
    emp_id = seed_employee()
    _create_document(client, name="Emp doc", employee_id=emp_id)
    _create_document(client, name="General doc")
    resp = client.get(f"/api/documents?employee_id={emp_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["employee_id"] == emp_id


def test_list_documents_filter_by_category(client):
    _create_document(client, name="Contract", category="contract")
    _create_document(client, name="Policy", category="policy")
    resp = client.get("/api/documents?category=policy")
    assert resp.status_code == 200
    data = resp.json()
    assert all(d["category"] == "policy" for d in data)


def test_update_document(client):
    doc_id = _create_document(client).json()["id"]
    resp = client.put(f"/api/documents/{doc_id}", json={
        "name": "Updated Contract",
        "category": "policy",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Updated Contract"
    assert data["category"] == "policy"


def test_update_document_no_fields(client):
    doc_id = _create_document(client).json()["id"]
    resp = client.put(f"/api/documents/{doc_id}", json={})
    assert resp.status_code == 400


def test_update_document_not_found(client):
    resp = client.put("/api/documents/nonexistent", json={"name": "X"})
    assert resp.status_code == 404


def test_delete_document(client):
    doc_id = _create_document(client).json()["id"]
    resp = client.delete(f"/api/documents/{doc_id}")
    assert resp.status_code == 200
    assert resp.json()["ok"] is True
    # Verify deleted
    docs = client.get("/api/documents").json()
    assert all(d["id"] != doc_id for d in docs)


def test_expiring_documents(client):
    soon = (datetime.now() + timedelta(days=10)).strftime("%Y-%m-%d")
    far = (datetime.now() + timedelta(days=365)).strftime("%Y-%m-%d")
    _create_document(client, name="Expiring soon", expiry_date=soon)
    _create_document(client, name="Far future", expiry_date=far)
    _create_document(client, name="No expiry")

    resp = client.get("/api/documents/expiring?days=30")
    assert resp.status_code == 200
    data = resp.json()
    names = [d["name"] for d in data]
    assert "Expiring soon" in names
    assert "Far future" not in names
    assert "No expiry" not in names


def test_expiring_documents_custom_days(client):
    soon = (datetime.now() + timedelta(days=5)).strftime("%Y-%m-%d")
    _create_document(client, name="Very soon", expiry_date=soon)

    resp = client.get("/api/documents/expiring?days=3")
    assert resp.status_code == 200
    # 5 days out should not appear in 3-day window
    names = [d["name"] for d in resp.json()]
    assert "Very soon" not in names

    resp2 = client.get("/api/documents/expiring?days=10")
    assert resp2.status_code == 200
    names2 = [d["name"] for d in resp2.json()]
    assert "Very soon" in names2
