import json, os, random, uuid
from collections import Counter
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.database import conn

router = APIRouter(prefix="/api")
_DIR = os.path.dirname(__file__)


def _load(name):
    with open(os.path.join(_DIR, name), encoding="utf-8") as f:
        return json.load(f)


BANK = _load("question_bank_v2.json")
MISC = _load("misconceptions_v2.json")
CONCEPTS = _load("concepts_v2.json")
QBY = {q["id"]: q for qs in BANK.values() for q in qs}

# 10 soal baseline: konsep -> daftar level
PLAN = {
    "Operasi Bilangan Bulat": ["easy", "medium"],
    "Aljabar Dasar": ["medium", "medium", "hard"],
    "Faktorisasi": ["medium", "medium", "hard"],
    "Fungsi": ["medium", "hard"],
}
LEVEL_ORDER = {"easy": 0, "medium": 1, "hard": 2}


def _init():
    cur = conn.cursor()
    cur.execute("""CREATE TABLE IF NOT EXISTS baseline_sessions (
        session_id TEXT PRIMARY KEY, student_id TEXT, plan TEXT, result TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, submitted_at TIMESTAMP)""")
    conn.commit()


_init()


def _pick():
    chosen, used = [], set()
    for concept, levels in PLAN.items():
        for lv in levels:
            pool = [q for q in BANK.get(concept, []) if q["level"] == lv and q["id"] not in used]
            if not pool:
                pool = [q for q in BANK.get(concept, []) if q["id"] not in used]
            if pool:
                q = random.choice(pool)
                used.add(q["id"])
                chosen.append(q)
    chosen.sort(key=lambda q: (LEVEL_ORDER[q["level"]], random.random()))
    return chosen


def _public(plan):
    out = []
    for item in plan:
        q = QBY[item["id"]]
        out.append({"id": q["id"], "stem": q["stem"], "math": q["math"],
                    "options": [q["options"][i]["text"] for i in item["order"]]})
    return out


class StartReq(BaseModel):
    student_id: str


class SubmitReq(BaseModel):
    session_id: str
    answers: dict  # {question_id: indeks opsi 0-4, atau null = "I don't know"}


@router.get("/concepts")
def concepts():
    return CONCEPTS


@router.post("/baseline/start")
def baseline_start(req: StartReq):
    cur = conn.cursor()
    cur.execute("SELECT session_id, plan FROM baseline_sessions WHERE student_id=? AND submitted_at IS NULL "
                "ORDER BY created_at DESC LIMIT 1", (req.student_id,))
    row = cur.fetchone()
    if row:  # lanjutkan sesi yang belum disubmit (tahan reload)
        return {"session_id": row[0], "questions": _public(json.loads(row[1]))}
    plan = []
    for q in _pick():
        order = list(range(len(q["options"])))
        random.shuffle(order)
        plan.append({"id": q["id"], "order": order})
    sid = uuid.uuid4().hex
    cur.execute("INSERT INTO baseline_sessions (session_id, student_id, plan) VALUES (?,?,?)",
                (sid, req.student_id, json.dumps(plan)))
    conn.commit()
    return {"session_id": sid, "questions": _public(plan)}


def _label(score):
    return "strong" if score >= 0.7 else ("developing" if score >= 0.45 else "needs_work")


@router.post("/baseline/submit")
def baseline_submit(req: SubmitReq):
    cur = conn.cursor()
    cur.execute("SELECT student_id, plan, result FROM baseline_sessions WHERE session_id=?", (req.session_id,))
    row = cur.fetchone()
    if not row:
        raise HTTPException(404, "Session not found")
    student_id, plan, stored = row[0], json.loads(row[1]), row[2]
    if stored:
        return json.loads(stored)

    per, mis, review, unsure, rows = {}, Counter(), [], 0, []
    for item in plan:
        q = QBY[item["id"]]
        order, ans = item["order"], req.answers.get(item["id"])
        ok, code, reason, chosen = False, None, None, None
        if isinstance(ans, int) and 0 <= ans < len(order):
            chosen = ans
            opt = q["options"][order[ans]]
            ok, code, reason = opt["correct"], opt["misconception"], opt.get("reason")
        else:
            unsure += 1
        p = per.setdefault(q["concept"], {"correct": 0, "total": 0})
        p["total"] += 1
        p["correct"] += int(ok)
        if code:
            mis[code] += 1
        rows.append((q["concept"], int(ok), code, q["id"]))
        review.append({
            "id": q["id"], "stem": q["stem"], "math": q["math"],
            "options": [q["options"][i]["text"] for i in order],
            "chosen": chosen,
            "correct_index": next(k for k, i in enumerate(order) if q["options"][i]["correct"]),
            "is_correct": ok, "reason": reason, "solution": q.get("solution", "")})

    cur.execute("INSERT OR IGNORE INTO students (student_id) VALUES (?)", (student_id,))
    concepts_out = []
    for c, p in per.items():
        score = round((p["correct"] + 1) / (p["total"] + 2), 3)  # rule of succession
        concepts_out.append({"concept": c, "display": CONCEPTS.get(c, {}).get("display", c),
                             "correct": p["correct"], "total": p["total"],
                             "score": score, "level": _label(score)})
        cur.execute("INSERT INTO mastery_records (student_id, concept, score) VALUES (?,?,?) "
                    "ON CONFLICT(student_id, concept) DO UPDATE SET score=?, updated_at=CURRENT_TIMESTAMP",
                    (student_id, c, score, score))
    score_of = {x["concept"]: x["score"] for x in concepts_out}
    for concept, ok, code, qid in rows:
        cur.execute("INSERT INTO attempt_log (student_id, concept, is_correct, misconception_code, "
                    "score_before, score_after, is_baseline_test, soal_id) VALUES (?,?,?,?,?,?,1,?)",
                    (student_id, concept, ok, code, 0.5, score_of[concept], qid))
    cur.execute("UPDATE students SET baseline_completed=1 WHERE student_id=?", (student_id,))

    mis_out = []
    for code, n in mis.most_common():
        m = MISC.get(code, {})
        root = m.get("root_concept", "")
        mis_out.append({"code": code, "label": m.get("label", code), "description": m.get("description", ""),
                        "root_concept": root, "root_display": CONCEPTS.get(root, {}).get("display", root),
                        "count": n})
    result = {"total": len(plan), "correct": sum(p["correct"] for p in per.values()), "unsure": unsure,
              "concepts": concepts_out, "misconceptions": mis_out, "review": review}
    cur.execute("UPDATE baseline_sessions SET result=?, submitted_at=CURRENT_TIMESTAMP WHERE session_id=?",
                (json.dumps(result), req.session_id))
    conn.commit()
    return result


@router.get("/baseline/result/{student_id}")
def baseline_result(student_id: str):
    cur = conn.cursor()
    cur.execute("SELECT result FROM baseline_sessions WHERE student_id=? AND result IS NOT NULL "
                "ORDER BY submitted_at DESC LIMIT 1", (student_id,))
    row = cur.fetchone()
    return json.loads(row[0]) if row else {"result": None}
