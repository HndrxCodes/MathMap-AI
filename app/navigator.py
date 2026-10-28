import json, os, re
from fastapi import APIRouter
from pydantic import BaseModel
from app import baseline as B
from app.baseline import conn

router = APIRouter(prefix="/api")
LESSON_MIN, PRACTICE_MIN = 3, 6  # perkiraan menit: baca materi / latihan 5 soal


class NavReq(BaseModel):
    student_id: str
    message: str
    history: list = []


def _disp(c):
    return B.CONCEPTS.get(c, {}).get("display", c)


def _resolve(x):
    x = str(x or "").strip().lower()
    for c in B.ORDER:
        if x in (c.lower(), _disp(c).lower()):
            return c
    return None


def _act(A, a):
    if len(A) < 3 and not any(x["type"] == a["type"] and x.get("concept") == a.get("concept") for x in A):
        A.append(a)


def _prereqs(c, seen=None):
    seen = set() if seen is None else seen
    for p in B.PREREQ.get(c, []):
        if p not in seen:
            seen.add(p)
            _prereqs(p, seen)
    return seen


def t_progress(sid, A, a):
    cur = conn.cursor()
    cur.execute("SELECT concept, score FROM mastery_records WHERE student_id=?", (sid,))
    mast = dict(cur.fetchall())
    cur.execute("SELECT concept, COALESCE(SUM(is_correct),0), COUNT(*) FROM attempt_log "
                "WHERE student_id=? AND soal_id IS NOT NULL GROUP BY concept", (sid,))
    cnt = {c: (k, n) for c, k, n in cur.fetchall()}
    cur.execute("SELECT misconception_code, COUNT(*) FROM attempt_log WHERE student_id=? "
                "AND misconception_code IS NOT NULL GROUP BY misconception_code ORDER BY COUNT(*) DESC LIMIT 4", (sid,))
    mis = []
    for code, n in cur.fetchall():
        m = B.MISC.get(code, {})
        root = m.get("root_concept", "")
        mis.append({"mistake": m.get("label", code), "times": n, "root_topic": _disp(root)})
    topics = []
    for c in B.ORDER:
        if c in mast:
            k, n = cnt.get(c, (0, 0))
            topics.append({"name": _disp(c), "level": B._label(mast[c]), "answered": n, "correct": int(k)})
        else:
            topics.append({"name": _disp(c), "level": "not tested"})
    if not mast:
        _act(A, {"type": "scan", "label": "Find my root cause"})
    g = B._goal(sid)
    return {"has_data": bool(mast), "topics": topics, "recurring_mistakes": mis,
            "plan_minutes_per_day": g.get("study_minutes"), "plan_day": g.get("day")}


def t_readiness(sid, A, a):
    t = _resolve(a.get("target"))
    if not t:
        return {"error": "unknown topic", "valid": [_disp(c) for c in B.ORDER]}
    known, ps = B._known(sid), _prereqs(t)
    pre = [c for c in B.ORDER if c in ps]
    weak = [_disp(c) for c in pre if known.get(c) == "needs_work"]
    dev = [_disp(c) for c in pre if known.get(c) == "developing"]
    unk = [_disp(c) for c in pre if c not in known]
    risk = "HIGH" if weak else ("MEDIUM" if dev or unk else "LOW")
    return {"target": _disp(t), "target_level": known.get(t, "not tested"), "risk": risk,
            "weak_prerequisites": weak, "developing_prerequisites": dev, "unchecked_prerequisites": unk,
            "fix_first": (weak or dev or unk or [None])[0]}


def t_plan(sid, A, a):
    g = B._goal(sid)
    try:
        m = int(a.get("minutes") or 0)
    except Exception:
        m = 0
    src = "student message"
    if m <= 0:
        m, src = g.get("study_minutes") or 20, "study plan"
    m = max(5, min(int(m), 180))
    known = B._known(sid)
    if not known:
        _act(A, {"type": "scan", "label": "Find my root cause"})
        return {"error": "no test taken yet"}
    cur = conn.cursor()
    cur.execute("SELECT target_concept FROM goals WHERE student_id=?", (sid,))
    r = cur.fetchone()
    t = r[0] if r and r[0] in B.PREREQ else None
    nodes, _s, unchecked = B._path([t] if t else [], {}, known)
    weak = [n for n in nodes if n["status"] == "needs_work"] + [n for n in nodes if n["status"] == "developing"]
    steps, left = [], m
    for n in weak:
        if left >= LESSON_MIN + PRACTICE_MIN:
            do, cost = "read the lesson, then practice", LESSON_MIN + PRACTICE_MIN
        elif left >= PRACTICE_MIN:
            do, cost = "practice", PRACTICE_MIN
        elif left >= LESSON_MIN:
            do, cost = "read the lesson", LESSON_MIN
        else:
            break
        steps.append({"name": n["display"], "level": n["status"], "do": do, "minutes": cost})
        left -= cost
    return {"minutes_available": m, "minutes_source": src, "plan_day": g.get("day"),
            "goal_topic": _disp(t) if t else None, "steps": steps, "minutes_planned": m - left,
            "all_clear": not weak, "unchecked": unchecked,
            "note": "minutes are estimates: lesson 3, five-question practice 6"}


def t_history(sid, A, a):
    out = []
    for h in B.history(sid):
        if not h.get("done"):
            continue
        d = {"kind": h["kind"], "topics": [_disp(t) for t in h.get("topics", [])],
             "when": h.get("when"), "correct": h.get("correct"), "of": h.get("total")}
        if h["kind"] == "practice":
            d["before"] = (h.get("before") or {}).get("level")
            d["after"] = (h.get("after") or {}).get("level")
        out.append(d)
        if len(out) >= 6:
            break
    return {"sessions": out}


def t_lesson(sid, A, a):
    c = _resolve(a.get("concept"))
    if not c:
        return {"error": "unknown topic"}
    txt = B._lessons().get(c, "")
    _act(A, {"type": "lesson", "concept": c, "label": "Open lesson: " + _disp(c)})
    return {"topic": _disp(c), "lesson_ready": bool(txt), "preview": txt[:420]}


def t_practice(sid, A, a):
    c = _resolve(a.get("concept"))
    if not c:
        return {"error": "unknown topic"}
    if len(B.BANK.get(c, [])) + len(B.TOPIC.get(c, [])) < 5:
        return {"error": "not enough practice questions yet"}
    _act(A, {"type": "practice", "concept": c, "label": "Practice " + _disp(c)})
    return {"ok": True, "topic": _disp(c)}


def _fn(name, desc, props=None, req=None):
    return {"type": "function", "function": {"name": name, "description": desc, "parameters": {
        "type": "object", "properties": props or {}, "required": req or []}}}


TOOLS = [
    _fn("get_progress", "Mastery level per topic, recurring mistakes and the study-plan minutes. Call first for any planning question."),
    _fn("check_readiness", "Is the student ready for a target topic? Lists weak, developing and unchecked prerequisites.",
        {"target": {"type": "string", "description": "Topic name, e.g. Limits"}}, ["target"]),
    _fn("build_session_plan", "Time-boxed plan for today. Pass minutes ONLY if the student stated a time in their message; otherwise omit it to use the study plan.",
        {"minutes": {"type": "integer"}}),
    _fn("get_history", "Recent completed tests and practice sessions."),
    _fn("get_lesson", "Fetch the short lesson for a topic and show an Open lesson button.",
        {"concept": {"type": "string"}}, ["concept"]),
    _fn("propose_practice", "Show a Start practice button for a topic worth practicing now.",
        {"concept": {"type": "string"}}, ["concept"]),
]
IMPL = {"get_progress": t_progress, "check_readiness": t_readiness, "build_session_plan": t_plan,
        "get_history": t_history, "get_lesson": t_lesson, "propose_practice": t_practice}

SYS = """Format rules (always follow): write plain text. Never use # headings or horizontal rules. Use **bold** only for topic names and key numbers. Use numbered lines for steps and lines starting with "- " for lists. Never use single asterisks. Do not predict score changes or percentages. Only mention features, data and numbers that the tools returned; the app has no error log.

You are MathMap Navigator, the planning guide inside a math diagnosis app. You decide which tools to call, then turn their results into a short, concrete next step.
RULES
- Tools are the source of truth for levels, mistakes, prerequisites and history. Never invent or estimate them.
- For any planning question ("what should I do", "where do I start", "I have N minutes"), call get_progress first, then build_session_plan and/or check_readiness as needed.
- Daily study time: use the student's study plan by default (call build_session_plan without minutes). If the student's message states a different time, pass that time as minutes instead.
- To let the student act, call get_lesson and/or propose_practice for the topics you recommend (at most two topics). Never mention a button you did not create.
- Do not solve math problems or explain one specific question: tell the student to open that question in their review and tap "Ask the tutor about this".
- If has_data is false, tell the student to take the "Find my root cause" test first.
- Use topic display names: Integer Operations, Basic Algebra, Factoring, Functions, Quadratic Equations, Limits.
STYLE: English, warm, under 110 words, at most 3 short steps, math as $...$, no emojis, no headings."""


def _clean(t):
    return re.sub(r"<think>.*?</think>", "", t or "", flags=re.S).strip()


def _run(sid, msg, hist):
    from app import clients
    g = B._goal(sid)
    ctx = ""
    if g.get("study_minutes"):
        ctx = f"\nSTUDY PLAN: {g['study_minutes']} min/day" + (f", today is day {g['day']}" if g.get("day") else "")
    base = [{"role": "system", "content": SYS + B._who(sid) + ctx}]
    base += [{"role": m.get("role"), "content": str(m.get("content"))[:1200]}
             for m in hist[-6:] if m.get("role") in ("user", "assistant")]
    base.append({"role": "user", "content": msg[:600]})
    models = [os.environ.get("NAV_MODEL") or clients.ORCHESTRATOR_MODEL]
    fb = getattr(clients, "MICROLESSON_MODEL", None)
    if fb and fb not in models:
        models.append(fb)
    for model in models:
        A, trace, msgs = [], [], list(base)
        try:
            for _ in range(4):
                r = clients.nebius_client.chat.completions.create(model=model, messages=msgs, tools=TOOLS)
                m = r.choices[0].message
                calls = m.tool_calls or []
                if not calls:
                    text = _clean(m.content)
                    if text:
                        return text, trace, A, model
                    raise RuntimeError("empty reply")
                msgs.append({"role": "assistant", "content": m.content or "", "tool_calls": [
                    {"id": c.id, "type": "function",
                     "function": {"name": c.function.name, "arguments": c.function.arguments or "{}"}} for c in calls]})
                for c in calls:
                    try:
                        args = json.loads(c.function.arguments or "{}")
                    except Exception:
                        args = {}
                    fn = IMPL.get(c.function.name)
                    try:
                        res = fn(sid, A, args) if fn else {"error": "unknown tool"}
                    except Exception as e:
                        res = {"error": str(e)[:120]}
                    trace.append({"tool": c.function.name, "ok": "error" not in res})
                    msgs.append({"role": "tool", "tool_call_id": c.id, "content": json.dumps(res, ensure_ascii=False)})
            msgs.append({"role": "user", "content": "Write the final answer for the student now, without calling tools."})
            r = clients.nebius_client.chat.completions.create(model=model, messages=msgs)
            text = _clean(r.choices[0].message.content)
            if text:
                return text, trace, A, model
        except Exception as e:
            print("navigator: model failed", model, repr(e)[:160])
    return None


@router.post("/navigator/chat")
def navigator_chat(req: NavReq):
    out = _run(req.student_id[:64], req.message, req.history)
    if not out:
        return {"reply": "The navigator is unavailable right now. Please try again in a moment.",
                "trace": [], "actions": []}
    text, trace, A, model = out
    return {"reply": text, "trace": trace, "actions": A, "model": model}
# END navigator.py
