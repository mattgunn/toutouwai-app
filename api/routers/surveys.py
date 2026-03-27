import json
from fastapi import APIRouter, Depends, HTTPException
from ..db import new_id, now_iso
from ..deps import get_db, get_current_user

router = APIRouter()


@router.get("/surveys")
def list_surveys(conn=Depends(get_db), _user=Depends(get_current_user)):
    rows = conn.execute("""
        SELECT s.*, u.name as created_by_name,
               (SELECT COUNT(DISTINCT sr.employee_id) FROM survey_responses sr WHERE sr.survey_id = s.id) as response_count,
               (SELECT COUNT(*) FROM survey_questions sq WHERE sq.survey_id = s.id) as question_count
        FROM surveys s
        LEFT JOIN users u ON s.created_by = u.id
        ORDER BY s.created_at DESC
    """).fetchall()
    return [dict(r) for r in rows]


@router.post("/surveys")
def create_survey(body: dict, conn=Depends(get_db), user=Depends(get_current_user)):
    ts = now_iso()
    sid = new_id()
    conn.execute("""
        INSERT INTO surveys (id, title, description, status, anonymous, start_date, end_date, created_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (sid, body["title"], body.get("description"), body.get("status", "draft"),
          body.get("anonymous", 1), body.get("start_date"), body.get("end_date"),
          user["id"], ts, ts))
    conn.commit()
    row = conn.execute("SELECT * FROM surveys WHERE id = ?", (sid,)).fetchone()
    return dict(row)


@router.put("/surveys/{survey_id}")
def update_survey(survey_id: str, body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    fields = ["title", "description", "status", "anonymous", "start_date", "end_date"]
    updates, values = [], []
    for f in fields:
        if f in body:
            updates.append(f"{f} = ?")
            values.append(body[f])
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    updates.append("updated_at = ?")
    values.append(now_iso())
    values.append(survey_id)
    conn.execute(f"UPDATE surveys SET {', '.join(updates)} WHERE id = ?", values)
    conn.commit()
    row = conn.execute("SELECT * FROM surveys WHERE id = ?", (survey_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Survey not found")
    return dict(row)


# --- Questions ---

@router.get("/surveys/{survey_id}/questions")
def list_questions(survey_id: str, conn=Depends(get_db), _user=Depends(get_current_user)):
    rows = conn.execute("""
        SELECT * FROM survey_questions
        WHERE survey_id = ?
        ORDER BY sort_order, created_at
    """, (survey_id,)).fetchall()
    result = []
    for r in rows:
        d = dict(r)
        if d.get("options"):
            try:
                d["options"] = json.loads(d["options"])
            except (json.JSONDecodeError, TypeError):
                pass
        result.append(d)
    return result


@router.post("/surveys/{survey_id}/questions")
def create_question(survey_id: str, body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    ts = now_iso()
    qid = new_id()
    options = json.dumps(body["options"]) if body.get("options") else None
    conn.execute("""
        INSERT INTO survey_questions (id, survey_id, question_text, question_type, options, sort_order, required, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (qid, survey_id, body["question_text"], body.get("question_type", "rating"),
          options, body.get("sort_order", 0), body.get("required", 1), ts, ts))
    conn.commit()
    row = conn.execute("SELECT * FROM survey_questions WHERE id = ?", (qid,)).fetchone()
    d = dict(row)
    if d.get("options"):
        try:
            d["options"] = json.loads(d["options"])
        except (json.JSONDecodeError, TypeError):
            pass
    return d


@router.put("/surveys/questions/{question_id}")
def update_question(question_id: str, body: dict, conn=Depends(get_db), _user=Depends(get_current_user)):
    fields = ["question_text", "question_type", "sort_order", "required"]
    updates, values = [], []
    for f in fields:
        if f in body:
            updates.append(f"{f} = ?")
            values.append(body[f])
    if "options" in body:
        updates.append("options = ?")
        values.append(json.dumps(body["options"]) if body["options"] else None)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    updates.append("updated_at = ?")
    values.append(now_iso())
    values.append(question_id)
    conn.execute(f"UPDATE survey_questions SET {', '.join(updates)} WHERE id = ?", values)
    conn.commit()
    row = conn.execute("SELECT * FROM survey_questions WHERE id = ?", (question_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Question not found")
    d = dict(row)
    if d.get("options"):
        try:
            d["options"] = json.loads(d["options"])
        except (json.JSONDecodeError, TypeError):
            pass
    return d


@router.delete("/surveys/questions/{question_id}")
def delete_question(question_id: str, conn=Depends(get_db), _user=Depends(get_current_user)):
    conn.execute("DELETE FROM survey_questions WHERE id = ?", (question_id,))
    conn.commit()
    return {"ok": True}


# --- Responses ---

@router.post("/surveys/{survey_id}/respond")
def submit_responses(survey_id: str, body: dict, conn=Depends(get_db), user=Depends(get_current_user)):
    survey = conn.execute("SELECT * FROM surveys WHERE id = ?", (survey_id,)).fetchone()
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")
    if survey["status"] != "active":
        raise HTTPException(status_code=400, detail="Survey is not active")

    ts = now_iso()
    employee_id = body.get("employee_id") if not survey["anonymous"] else None

    for resp in body.get("responses", []):
        conn.execute("""
            INSERT INTO survey_responses (id, survey_id, question_id, employee_id, response_value, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (new_id(), survey_id, resp["question_id"], employee_id, resp.get("response_value"), ts))

    conn.commit()
    return {"ok": True}


@router.get("/surveys/{survey_id}/results")
def get_results(survey_id: str, conn=Depends(get_db), _user=Depends(get_current_user)):
    questions = conn.execute("""
        SELECT * FROM survey_questions WHERE survey_id = ? ORDER BY sort_order, created_at
    """, (survey_id,)).fetchall()

    results = []
    for q in questions:
        q_dict = dict(q)
        if q_dict.get("options"):
            try:
                q_dict["options"] = json.loads(q_dict["options"])
            except (json.JSONDecodeError, TypeError):
                pass

        responses = conn.execute("""
            SELECT response_value FROM survey_responses WHERE question_id = ?
        """, (q["id"],)).fetchall()

        values = [r["response_value"] for r in responses if r["response_value"]]

        result = {
            "question": q_dict,
            "response_count": len(values),
        }

        if q["question_type"] == "rating":
            numeric = [float(v) for v in values if v and v.replace(".", "").isdigit()]
            result["average"] = round(sum(numeric) / len(numeric), 2) if numeric else 0
            result["distribution"] = {}
            for v in numeric:
                key = str(int(v))
                result["distribution"][key] = result["distribution"].get(key, 0) + 1
        elif q["question_type"] == "yes_no":
            result["yes_count"] = sum(1 for v in values if v.lower() in ("yes", "true", "1"))
            result["no_count"] = sum(1 for v in values if v.lower() in ("no", "false", "0"))
        elif q["question_type"] == "multiple_choice":
            result["distribution"] = {}
            for v in values:
                result["distribution"][v] = result["distribution"].get(v, 0) + 1
        else:
            result["text_responses"] = values

        results.append(result)

    total_respondents = conn.execute("""
        SELECT COUNT(DISTINCT COALESCE(employee_id, id)) FROM survey_responses WHERE survey_id = ?
    """, (survey_id,)).fetchone()[0]

    return {
        "results": results,
        "total_respondents": total_respondents,
    }
