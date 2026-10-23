import json, os, random, uuid
from datetime import date
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
try:  # bank soal per topik, terpisah dari bank baseline
    TOPIC = _load("topic_bank_v2.json")
except Exception:
    TOPIC = {}
QBY.update({q["id"]: q for qs in TOPIC.values() for q in qs})

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
    for col in ("goal_type TEXT", "study_minutes INTEGER", "exam TEXT", "study_days INTEGER", "plan_start TEXT"):
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


def _seen(student_id):
    cur = conn.cursor()
    cur.execute("SELECT DISTINCT soal_id FROM attempt_log WHERE student_id=? AND soal_id IS NOT NULL", (student_id,))
    return {r[0] for r in cur.fetchall()}


def _pick(plan, seen):
    chosen, used = [], set()
    for concept, levels in plan.items():
        for lv in levels:
            pool = [q for q in BANK.get(concept, []) if q["id"] not in used]
            pool = [q for q in pool if q["level"] == lv] or pool
            pool = [q for q in pool if q["id"] not in seen] or pool  # soal baru didahulukan
            if pool:
                q = random.choice(pool)
                used.add(q["id"])
                chosen.append(q)
    chosen.sort(key=lambda q: (ORDER.index(q["concept"]), LEVEL_ORDER[q["level"]]))
    return chosen


def _draw(pool, k, seen):
    want = {"easy": round(k * 0.2), "hard": round(k * 0.33)}
    want["medium"] = k - want["easy"] - want["hard"]
    left = list(pool)
    random.shuffle(left)
    left.sort(key=lambda q: q["id"] in seen)  # belum pernah dilihat lebih dulu
    out = []
    for lv, n in want.items():
        take = [q for q in left if q["level"] == lv][:n]
        out += take
        left = [q for q in left if q not in take]
    return out + left[:k - len(out)]


def _pick_topic(topics, seen, n=15):
    topics = sorted(topics, key=ORDER.index)
    per, extra = divmod(n, len(topics))
    out = []
    for i, t in enumerate(topics):
        part = _draw(TOPIC.get(t, []), per + (1 if i < extra else 0), seen)
        out += sorted(part, key=lambda q: LEVEL_ORDER[q["level"]])
    return out


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
    cur.execute("SELECT goal_type, study_minutes, exam, study_days, plan_start FROM goals WHERE student_id=?", (student_id,))
    r = cur.fetchone()
    if not r:
        return {}
    day = None
    if r[4]:
        try:
            day = max(1, (date.today() - date.fromisoformat(r[4])).days + 1)
        except Exception:
            day = 1
    return {"goal_type": r[0], "study_minutes": r[1], "exam": r[2], "study_days": r[3], "day": day}


def _known(student_id):
    cur = conn.cursor()
    cur.execute("SELECT concept, score FROM mastery_records WHERE student_id=?", (student_id,))
    return {c: _label(sc) for c, sc in cur.fetchall()}


def _path(targets, cmap, known):
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
                          "status": s["level"] if s else known.get(c, "untested"),
                          "correct": s["correct"] if s else None, "total": s["total"] if s else None,
                          "goal": c in targets})
    start = None
    for status in ("needs_work", "developing"):
        start = next((n["concept"] for n in nodes if n["status"] == status), None)
        if start:
            break
    return nodes, start, [n["display"] for n in nodes if n["status"] == "untested"]


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
    study_days: int = 14
    exam: str = ""


class TutorReq(BaseModel):
    kind: str = "question"  # question | summary
    message: str
    data: dict = {}
    history: list = []


@router.get("/concepts")
def concepts():
    return CONCEPTS


@router.get("/exams")
def exams():
    return EXAMS


@router.get("/topics/ready")
def topics_ready():  # topik yang sudah punya bank soal sendiri
    return [c for c, qs in TOPIC.items() if len(qs) >= 10]


@router.get("/goal/{student_id}")
def get_goal_info(student_id: str):
    return _goal(student_id)


@router.post("/goal")
def save_goal(req: GoalReq):
    cur = conn.cursor()
    cur.execute("INSERT OR IGNORE INTO students (student_id) VALUES (?)", (req.student_id,))
    target = req.topics[0] if req.topics else None
    desc, today = json.dumps(req.topics), date.today().isoformat()
    cur.execute("INSERT INTO goals (student_id, target_concept, description, goal_type, study_minutes, exam, "
                "study_days, plan_start) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(student_id) DO UPDATE SET "
                "target_concept=?, description=?, goal_type=?, study_minutes=?, exam=?, study_days=?, "
                "plan_start=COALESCE(plan_start, ?)",
                (req.student_id, target, desc, req.goal_type, req.study_minutes, req.exam, req.study_days, today,
                 target, desc, req.goal_type, req.study_minutes, req.exam, req.study_days, today))
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
    seen = _seen(req.student_id)
    if mode in ("topic", "exam") and all(TOPIC.get(t) for t in topics):
        picked = _pick_topic(topics, seen)  # bank topik terpisah, urut per topik lalu tingkat kesulitan
    else:
        picked = _pick(_plan(mode, topics), seen)
    items = []
    for q in picked:
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
    path, start, unchecked = _path(targets, cmap, _known(student_id))
    result = {"mode": sess["mode"], "topics": sess["topics"], "total": len(sess["items"]),
              "correct": sum(p["correct"] for p in per.values()), "unsure": unsure,
              "concepts": concepts_out, "path": path, "start_concept": start, "unchecked": unchecked,
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


TUTOR_SYS = ("You are MathMap's math tutor for a high-school student. Reply in English, warm and concise "
             "(under 140 words unless asked for more). Write ALL math in LaTeX inside $...$. Treat the CONTEXT as "
             "authoritative: the marked correct answer and the stated mistake behind the student's choice are ground "
             "truth, so never recompute a different answer. Explain the specific mistake the chosen option represents, "
             "then show the correct idea step by step. If asked for a hint, give a hint, not the full answer. "
             "Never invent facts about tests.")


def _ctx(kind, d):
    if kind == "question":
        L, opts = "ABCDE", d.get("options", [])
        ch = d.get("chosen")
        chosen = "I don't know" if ch is None else f"{L[ch]}. ${opts[ch]}$"
        return (f"QUESTION: {d.get('stem', '')} ${d.get('math', '')}$\nOPTIONS:\n"
                + "\n".join(f"{L[i]}. ${o}$" for i, o in enumerate(opts))
                + f"\nSTUDENT CHOSE: {chosen}\nCORRECT: {L[d.get('correct_index', 0)]}"
                + f"\nMISTAKE BEHIND THE CHOSEN OPTION: {d.get('reason') or 'n/a'}"
                + f"\nOFFICIAL SOLUTION: {d.get('solution', '')}")
    return "STUDENT RESULT SUMMARY (json): " + json.dumps(d)[:2500]


@router.post("/tutor")
def tutor(req: TutorReq):
    try:
        from app import clients  # impor lazy: server tetap menyala kalau nama konstanta berbeda
        model = getattr(clients, "MICROLESSON_MODEL", None) or clients.ORCHESTRATOR_MODEL
        msgs = [{"role": "system", "content": TUTOR_SYS + "\n\nMATH FORMAT: write inline math as $...$ and display math as $$...$$. Never use backslash-parenthesis or backslash-bracket delimiters.\n\nCONTEXT\n" + _ctx(req.kind, req.data)}]
        msgs += [{"role": m.get("role"), "content": str(m.get("content"))[:1500]}
                 for m in req.history[-6:] if m.get("role") in ("user", "assistant")]
        msgs.append({"role": "user", "content": req.message[:800]})
        r = clients.nebius_client.chat.completions.create(model=model, messages=msgs)
        return {"reply": r.choices[0].message.content or ""}
    except Exception as e:
        return {"reply": "Sorry, the tutor is unavailable right now.", "error": str(e)[:200]}
