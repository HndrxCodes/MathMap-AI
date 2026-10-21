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

ORDER = ["Operasi Bilangan Bulat", "Aljabar Dasar", "Faktorisasi", "Fungsi", "Persamaan Kuadrat", "Limit"]
PREREQ = {
    "Operasi Bilangan Bulat": [],
    "Aljabar Dasar": ["Operasi Bilangan Bulat"],
    "Faktorisasi": ["Aljabar Dasar"],
    "Fungsi": ["Aljabar Dasar"],
    "Persamaan Kuadrat": ["Faktorisasi", "Aljabar Dasar"],
    "Limit": ["Faktorisasi", "Fungsi"],
}
GAPS_PLAN = {  # pemindaian luas: 10 soal
    "Operasi Bilangan Bulat": ["easy", "medium"],
    "Aljabar Dasar": ["medium", "medium", "hard"],
    "Faktorisasi": ["medium", "medium", "hard"],
    "Fungsi": ["medium", "hard"],
}
LEVEL_ORDER = {"easy": 0, "medium": 1, "hard": 2}

# Fakta ujian dari sumber resmi; "covers" hanya keterampilan dasar yang ada di bank soal MathMap.
EXAMS = {
    "sat": {"name": "SAT Math", "facts": "Digital SAT · 44 questions · 70 minutes",
            "covers": ["Algebra", "Advanced Math (quadratics, functions)"],
            "gaps": ["Problem-solving & data analysis", "Geometry & trigonometry"],
            "topics": ["Aljabar Dasar", "Faktorisasi", "Persamaan Kuadrat", "Fungsi"]},
    "csca": {"name": "CSCA Math", "facts": "China Scholastic Competency Assessment · 48 multiple-choice · 60 minutes",
             "covers": ["Algebra & factoring (basis for inequalities)", "Quadratic equations", "Functions (evaluation, composition)"],
             "gaps": ["Sets", "Geometry", "Probability & statistics"],
             "topics": ["Aljabar Dasar", "Faktorisasi", "Persamaan Kuadrat", "Fungsi"]},
    "school": {"name": "School exam or other test", "facts": "You choose the topics your test includes",
               "covers": [], "gaps": [], "topics": []},
}


def _init():
    cur = conn.cursor()
    cur.execute("""CREATE TABLE IF NOT EXISTS baseline_sessions (
        session_id TEXT PRIMARY KEY, student_id TEXT, plan TEXT, result TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, submitted_at TIMESTAMP)""")
    for col in ("goal_type TEXT", "study_minutes INTEGER", "exam TEXT"):
        try:
            cur.execute("ALTER TABLE goals ADD COLUMN " + col)
        except Exception:
            pass  # kolom sudah ada
    conn.commit()


_init()


def _plan(mode, topics):
    if mode == "topic" and topics:
        t, pre = topics[0], PREREQ.get(topics[0], [])
        if not pre:
            return {t: ["easy", "easy", "medium", "medium", "medium", "medium", "medium", "hard", "hard", "hard"]}
        share = ["easy", "medium", "medium", "hard"] if len(pre) == 1 else ["medium", "medium"]
        plan = {t: ["easy", "medium", "medium", "medium", "hard", "hard"]}
        for p in pre:
            plan[p] = share
        return plan
    if mode == "exam" and topics:
        cyc, plan = ["medium", "medium", "hard", "easy"], {}
        for i in range(10):
            plan.setdefault(topics[i % len(topics)], []).append(cyc[(i // len(topics)) % 4])
        return plan
    return GAPS_PLAN


def _pick(plan):
    chosen, used = [], set()
    for concept, levels in plan.items():
        for lv in levels:
            pool = [q for q in BANK.get(concept, []) if q["level"] == lv and q["id"] not in used] or \
                   [q for q in BANK.get(concept, []) if q["id"] not in used]
            if pool:
                q = random.choice(pool)
                used.add(q["id"])
                chosen.append(q)
    chosen.sort(key=lambda q: (LEVEL_ORDER[q["level"]], random.random()))
    return chosen


def _public(items):
    return [{"id": QBY[i["id"]]["id"], "stem": QBY[i["id"]]["stem"], "math": QBY[i["id"]]["math"],
             "options": [QBY[i["id"]]["options"][k]["text"] for k in i["order"]]} for i in items]


def _unpack(raw):
    p = json.loads(raw)
    return p if isinstance(p, dict) else {"mode": "gaps", "topics": [], "items": p}


def _label(score):
    return "strong" if score >= 0.7 else ("developing" if score >= 0.45 else "needs_work")


def _goal(student_id):
    cur = conn.cursor()
    cur.execute("SELECT goal_type, study_minutes, exam FROM goals WHERE student_id=?", (student_id,))
    r = cur.fetchone()
    return {"goal_type": r[0], "study_minutes": r[1], "exam": r[2]} if r else {}


def _path(targets, cmap):
    need, stack = set(targets) if targets else set(ORDER), list(targets)
    while stack:
        for p in PREREQ.get(stack.pop(), []):
            if p not in need:
                need.add(p)
                stack.append(p)
    nodes = []
    for c in ORDER:
        if c in need:
            s = cmap.get(c)
            nodes.append({"concept": c, "display": CONCEPTS.get(c, {}).get("display", c),
                          "status": s["level"] if s else "untested",
                          "correct": s["correct"] if s else None, "total": s["total"] if s else None,
                          "goal": c in targets})
    start = None
    for status in ("needs_work", "developing", "untested"):
        start = next((n["concept"] for n in nodes if n["status"] == status), None)
        if start:
            break
    return nodes, start


class StartReq(BaseModel):
    student_id: str
    mode: str = "gaps"  # gaps | topic | exam
    topics: list = []


class SubmitReq(BaseModel):
    session_id: str
    answers: dict  # {question_id: indeks opsi 0-4, atau null = "I don't know"}


class GoalReq(BaseModel):
    student_id: str
    goal_type: str  # test_prep | mastery | find_gaps
    topics: list = []
    study_minutes: int = 20
    exam: str = ""


@router.get("/concepts")
def concepts():
    return CONCEPTS


@router.get("/exams")
def exams():
    return EXAMS


@router.post("/goal")
def save_goal(req: GoalReq):
    cur = conn.cursor()
    cur.execute("INSERT OR IGNORE INTO students (student_id) VALUES (?)", (req.student_id,))
    target = req.topics[0] if req.topics else None
    desc = json.dumps(req.topics)
    cur.execute("INSERT INTO goals (student_id, target_concept, description, goal_type, study_minutes, exam) "
                "VALUES (?,?,?,?,?,?) ON CONFLICT(student_id) DO UPDATE SET target_concept=?, description=?, "
                "goal_type=?, study_minutes=?, exam=?",
                (req.student_id, target, desc, req.goal_type, req.study_minutes, req.exam,
                 target, desc, req.goal_type, req.study_minutes, req.exam))
    conn.commit()
    return {"ok": True}


@router.post("/baseline/start")
def baseline_start(req: StartReq):
    topics = [t for t in req.topics if t in PREREQ]
    mode = req.mode if (req.mode == "gaps" or (req.mode in ("topic", "exam") and topics)) else "gaps"
    cur = conn.cursor()
    cur.execute("SELECT session_id, plan FROM baseline_sessions WHERE student_id=? AND submitted_at IS NULL "
                "ORDER BY created_at DESC, rowid DESC LIMIT 1", (req.student_id,))
    row = cur.fetchone()
    if row:  # lanjutkan sesi yang sama (tahan reload)
        p = _unpack(row[1])
        if p["mode"] == mode and p["topics"] == topics:
            return {"session_id": row[0], "questions": _public(p["items"])}
    items = []
    for q in _pick(_plan(mode, topics)):
        order = list(range(len(q["options"])))
        random.shuffle(order)
        items.append({"id": q["id"], "order": order})
    sid = uuid.uuid4().hex
    cur.execute("INSERT INTO baseline_sessions (session_id, student_id, plan) VALUES (?,?,?)",
                (sid, req.student_id, json.dumps({"mode": mode, "topics": topics, "items": items})))
    conn.commit()
    return {"session_id": sid, "questions": _public(items)}


@router.post("/baseline/submit")
def baseline_submit(req: SubmitReq):
    cur = conn.cursor()
    cur.execute("SELECT student_id, plan, result FROM baseline_sessions WHERE session_id=?", (req.session_id,))
    row = cur.fetchone()
    if not row:
        raise HTTPException(404, "Session not found")
    student_id, sess, stored = row[0], _unpack(row[1]), row[2]
    if stored:
        res = json.loads(stored)
        res["goal"] = _goal(student_id)
        return res

    per, mis, review, unsure, rows = {}, Counter(), [], 0, []
    for item in sess["items"]:
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
    concepts_out, cmap = [], {}
    for c, p in per.items():
        score = round((p["correct"] + 1) / (p["total"] + 2), 3)  # rule of succession
        x = {"concept": c, "display": CONCEPTS.get(c, {}).get("display", c),
             "correct": p["correct"], "total": p["total"], "score": score, "level": _label(score)}
        concepts_out.append(x)
        cmap[c] = x
        cur.execute("INSERT INTO mastery_records (student_id, concept, score) VALUES (?,?,?) "
                    "ON CONFLICT(student_id, concept) DO UPDATE SET score=?, updated_at=CURRENT_TIMESTAMP",
                    (student_id, c, score, score))
    for concept, ok, code, qid in rows:
        cur.execute("INSERT INTO attempt_log (student_id, concept, is_correct, misconception_code, "
                    "score_before, score_after, is_baseline_test, soal_id) VALUES (?,?,?,?,?,?,1,?)",
                    (student_id, concept, ok, code, 0.5, cmap[concept]["score"], qid))
    cur.execute("UPDATE students SET baseline_completed=1 WHERE student_id=?", (student_id,))

    mis_out = []
    for code, n in mis.most_common():
        m = MISC.get(code, {})
        root = m.get("root_concept", "")
        mis_out.append({"code": code, "label": m.get("label", code), "description": m.get("description", ""),
                        "root_concept": root, "root_display": CONCEPTS.get(root, {}).get("display", root),
                        "count": n})
    targets = sess["topics"] if sess["mode"] in ("topic", "exam") else []
    path, start = _path(targets, cmap)
    result = {"mode": sess["mode"], "topics": sess["topics"], "total": len(sess["items"]),
              "correct": sum(p["correct"] for p in per.values()), "unsure": unsure,
              "concepts": concepts_out, "path": path, "start_concept": start,
              "misconceptions": mis_out, "review": review}
    cur.execute("UPDATE baseline_sessions SET result=?, submitted_at=CURRENT_TIMESTAMP WHERE session_id=?",
                (json.dumps(result), req.session_id))
    conn.commit()
    result["goal"] = _goal(student_id)
    return result


@router.get("/baseline/result/{student_id}")
def baseline_result(student_id: str):
    cur = conn.cursor()
    cur.execute("SELECT result FROM baseline_sessions WHERE student_id=? AND result IS NOT NULL "
                "ORDER BY submitted_at DESC, rowid DESC LIMIT 1", (student_id,))
    row = cur.fetchone()
    if not row:
        return {"result": None}
    res = json.loads(row[0])
    res["goal"] = _goal(student_id)
    return res
