"""Tests for the surveys router: surveys, questions, responses, and results."""


def _create_survey(client, **overrides):
    payload = {"title": "Engagement Survey", "description": "Annual survey"}
    payload.update(overrides)
    return client.post("/api/surveys", json=payload)


def _create_question(client, survey_id, **overrides):
    payload = {"question_text": "How satisfied are you?", "question_type": "rating"}
    payload.update(overrides)
    return client.post(f"/api/surveys/{survey_id}/questions", json=payload)


# ── Surveys ────────────────────────────────────────────────────────


def test_create_survey(client):
    resp = _create_survey(client)
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "Engagement Survey"
    assert data["status"] == "draft"
    assert data["anonymous"] == 1


def test_create_survey_active(client):
    resp = _create_survey(client, status="active", anonymous=0)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "active"
    assert data["anonymous"] == 0


def test_list_surveys_empty(client):
    resp = client.get("/api/surveys")
    assert resp.status_code == 200
    assert resp.json() == []


def test_list_surveys(client):
    _create_survey(client, title="Survey A")
    _create_survey(client, title="Survey B")
    resp = client.get("/api/surveys")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 2
    titles = [s["title"] for s in data]
    assert "Survey A" in titles
    assert "Survey B" in titles


def test_list_surveys_includes_counts(client, seed_employee):
    sid = _create_survey(client, status="active", anonymous=False).json()["id"]
    qid = _create_question(client, sid).json()["id"]
    emp_id = seed_employee()
    client.post(f"/api/surveys/{sid}/respond", json={
        "employee_id": emp_id,
        "responses": [{"question_id": qid, "response_value": "5"}],
    })
    resp = client.get("/api/surveys")
    survey = [s for s in resp.json() if s["id"] == sid][0]
    assert survey["question_count"] == 1
    assert survey["response_count"] >= 1


def test_update_survey(client):
    sid = _create_survey(client).json()["id"]
    resp = client.put(f"/api/surveys/{sid}", json={"title": "Updated", "status": "active"})
    assert resp.status_code == 200
    assert resp.json()["title"] == "Updated"
    assert resp.json()["status"] == "active"


def test_update_survey_no_fields(client):
    sid = _create_survey(client).json()["id"]
    resp = client.put(f"/api/surveys/{sid}", json={})
    assert resp.status_code == 400


def test_update_survey_not_found(client):
    resp = client.put("/api/surveys/nonexistent", json={"title": "X"})
    assert resp.status_code == 404


# ── Questions ──────────────────────────────────────────────────────


def test_create_question(client):
    sid = _create_survey(client).json()["id"]
    resp = _create_question(client, sid)
    assert resp.status_code == 200
    data = resp.json()
    assert data["question_text"] == "How satisfied are you?"
    assert data["question_type"] == "rating"
    assert data["required"] == 1


def test_create_question_with_options(client):
    sid = _create_survey(client).json()["id"]
    resp = _create_question(client, sid,
        question_text="Favourite perk?",
        question_type="multiple_choice",
        options=["Gym", "Lunch", "WFH"],
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["options"] == ["Gym", "Lunch", "WFH"]


def test_list_questions(client):
    sid = _create_survey(client).json()["id"]
    _create_question(client, sid, question_text="Q1")
    _create_question(client, sid, question_text="Q2")
    resp = client.get(f"/api/surveys/{sid}/questions")
    assert resp.status_code == 200
    texts = [q["question_text"] for q in resp.json()]
    assert "Q1" in texts
    assert "Q2" in texts


def test_update_question(client):
    sid = _create_survey(client).json()["id"]
    qid = _create_question(client, sid).json()["id"]
    resp = client.put(f"/api/surveys/questions/{qid}", json={
        "question_text": "Updated question",
        "options": ["A", "B"],
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["question_text"] == "Updated question"
    assert data["options"] == ["A", "B"]


def test_update_question_no_fields(client):
    sid = _create_survey(client).json()["id"]
    qid = _create_question(client, sid).json()["id"]
    resp = client.put(f"/api/surveys/questions/{qid}", json={})
    assert resp.status_code == 400


def test_update_question_not_found(client):
    resp = client.put("/api/surveys/questions/nonexistent", json={"question_text": "X"})
    assert resp.status_code == 404


def test_delete_question(client):
    sid = _create_survey(client).json()["id"]
    qid = _create_question(client, sid).json()["id"]
    resp = client.delete(f"/api/surveys/questions/{qid}")
    assert resp.status_code == 200
    assert resp.json()["ok"] is True
    questions = client.get(f"/api/surveys/{sid}/questions").json()
    assert all(q["id"] != qid for q in questions)


# ── Responses ──────────────────────────────────────────────────────


def test_submit_response(client, seed_employee):
    sid = _create_survey(client, status="active").json()["id"]
    qid = _create_question(client, sid).json()["id"]
    emp_id = seed_employee()

    resp = client.post(f"/api/surveys/{sid}/respond", json={
        "employee_id": emp_id,
        "responses": [{"question_id": qid, "response_value": "4"}],
    })
    assert resp.status_code == 200
    assert resp.json()["ok"] is True


def test_submit_response_inactive_survey(client):
    sid = _create_survey(client, status="draft").json()["id"]
    qid = _create_question(client, sid).json()["id"]
    resp = client.post(f"/api/surveys/{sid}/respond", json={
        "responses": [{"question_id": qid, "response_value": "3"}],
    })
    assert resp.status_code == 400


def test_submit_response_survey_not_found(client):
    resp = client.post("/api/surveys/nonexistent/respond", json={"responses": []})
    assert resp.status_code == 404


# ── Results ────────────────────────────────────────────────────────


def test_get_results_empty(client):
    sid = _create_survey(client).json()["id"]
    resp = client.get(f"/api/surveys/{sid}/results")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_respondents"] == 0
    assert data["results"] == []


def test_get_results_rating(client, seed_employee):
    sid = _create_survey(client, status="active").json()["id"]
    qid = _create_question(client, sid, question_type="rating").json()["id"]

    for i, val in enumerate(["3", "4", "5"]):
        emp_id = seed_employee(
            first_name=f"Emp{i}", last_name="Test", email=f"emp{i}@test.com"
        )
        client.post(f"/api/surveys/{sid}/respond", json={
            "employee_id": emp_id,
            "responses": [{"question_id": qid, "response_value": val}],
        })

    resp = client.get(f"/api/surveys/{sid}/results")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_respondents"] == 3
    result = data["results"][0]
    assert result["response_count"] == 3
    assert result["average"] == 4.0  # (3+4+5)/3


def test_get_results_yes_no(client, seed_employee):
    sid = _create_survey(client, status="active").json()["id"]
    qid = _create_question(client, sid, question_type="yes_no",
                           question_text="Do you like it?").json()["id"]

    for i, val in enumerate(["yes", "yes", "no"]):
        emp_id = seed_employee(
            first_name=f"YN{i}", last_name="Test", email=f"yn{i}@test.com"
        )
        client.post(f"/api/surveys/{sid}/respond", json={
            "employee_id": emp_id,
            "responses": [{"question_id": qid, "response_value": val}],
        })

    resp = client.get(f"/api/surveys/{sid}/results")
    result = resp.json()["results"][0]
    assert result["yes_count"] == 2
    assert result["no_count"] == 1


def test_get_results_multiple_choice(client, seed_employee):
    sid = _create_survey(client, status="active").json()["id"]
    qid = _create_question(client, sid, question_type="multiple_choice",
                           question_text="Fav color?",
                           options=["Red", "Blue"]).json()["id"]

    for i, val in enumerate(["Red", "Red", "Blue"]):
        emp_id = seed_employee(
            first_name=f"MC{i}", last_name="Test", email=f"mc{i}@test.com"
        )
        client.post(f"/api/surveys/{sid}/respond", json={
            "employee_id": emp_id,
            "responses": [{"question_id": qid, "response_value": val}],
        })

    resp = client.get(f"/api/surveys/{sid}/results")
    result = resp.json()["results"][0]
    assert result["distribution"]["Red"] == 2
    assert result["distribution"]["Blue"] == 1


def test_get_results_text(client, seed_employee):
    sid = _create_survey(client, status="active").json()["id"]
    qid = _create_question(client, sid, question_type="text",
                           question_text="Feedback?").json()["id"]
    emp_id = seed_employee()
    client.post(f"/api/surveys/{sid}/respond", json={
        "employee_id": emp_id,
        "responses": [{"question_id": qid, "response_value": "Great job"}],
    })

    resp = client.get(f"/api/surveys/{sid}/results")
    result = resp.json()["results"][0]
    assert "Great job" in result["text_responses"]
