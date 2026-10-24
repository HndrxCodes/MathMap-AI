import json, uuid
from fastapi import APIRouter
from pydantic import BaseModel
from app import navigator as N
from app.baseline import conn

router = APIRouter(prefix="/api")
MAX_CHATS, MAX_MSGS = 3, 60

_c = conn.cursor()
_c.execute("CREATE TABLE IF NOT EXISTS nav_chats (chat_id TEXT PRIMARY KEY, student_id TEXT, title TEXT, "
           "messages TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)")
conn.commit()


class Ref(BaseModel):
    student_id: str
    chat_id: str = ""


class SendReq(BaseModel):
    student_id: str
    chat_id: str
    message: str


def _row(sid, cid):
    cur = conn.cursor()
    cur.execute("SELECT messages, title FROM nav_chats WHERE chat_id=? AND student_id=?", (cid, sid[:64]))
    return cur.fetchone()


@router.get("/nav/chats/{student_id}")
def chats(student_id: str):
    cur = conn.cursor()
    cur.execute("SELECT chat_id, title, updated_at FROM nav_chats WHERE student_id=? "
                "ORDER BY created_at ASC, rowid ASC", (student_id[:64],))
    return [{"id": a, "title": b or "New chat", "updated": N.B._ts(c)} for a, b, c in cur.fetchall()]


@router.get("/nav/chat/{chat_id}")
def chat(chat_id: str, student_id: str = ""):
    row = _row(student_id, chat_id)
    return {"messages": json.loads(row[0] or "[]") if row else []}


@router.post("/nav/new")
def new_chat(req: Ref):
    sid = req.student_id[:64]
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM nav_chats WHERE student_id=?", (sid,))
    if cur.fetchone()[0] >= MAX_CHATS:
        return {"error": "limit"}
    cid = uuid.uuid4().hex
    cur.execute("INSERT INTO nav_chats (chat_id, student_id, title, messages) VALUES (?,?,?,?)",
                (cid, sid, "New chat", "[]"))
    conn.commit()
    return {"chat_id": cid}


@router.post("/nav/clear")
def clear_chat(req: Ref):
    cur = conn.cursor()
    cur.execute("UPDATE nav_chats SET messages='[]', title='New chat', updated_at=CURRENT_TIMESTAMP "
                "WHERE chat_id=? AND student_id=?", (req.chat_id, req.student_id[:64]))
    conn.commit()
    return {"ok": True}


@router.post("/nav/delete")
def delete_chat(req: Ref):
    cur = conn.cursor()
    cur.execute("DELETE FROM nav_chats WHERE chat_id=? AND student_id=?", (req.chat_id, req.student_id[:64]))
    conn.commit()
    return {"ok": True}


@router.post("/nav/purge")
def purge(req: Ref):
    cur = conn.cursor()
    cur.execute("DELETE FROM nav_chats WHERE student_id=?", (req.student_id[:64],))
    conn.commit()
    return {"ok": True}


@router.post("/navigator/send")
def send(req: SendReq):
    sid = req.student_id[:64]
    row = _row(sid, req.chat_id)
    if not row:
        return {"reply": "This chat no longer exists. Please start a new one.", "trace": [], "actions": [],
                "error": "no_chat"}
    msgs = json.loads(row[0] or "[]")
    hist = [{"role": "user" if m.get("role") == "me" else "assistant", "content": m.get("text", "")}
            for m in msgs if m.get("role") in ("me", "bot")]
    out = N._run(sid, req.message, hist)
    if not out:
        return {"reply": "The navigator is unavailable right now. Please try again in a moment.",
                "trace": [], "actions": []}
    text, trace, A, model = out
    msgs += [{"role": "me", "text": req.message[:600]},
             {"role": "bot", "text": text, "trace": trace, "actions": A, "model": model}]
    msgs = msgs[-MAX_MSGS:]
    title = row[1] if row[1] and row[1] != "New chat" else req.message.strip()[:28]
    cur = conn.cursor()
    cur.execute("UPDATE nav_chats SET messages=?, title=?, updated_at=CURRENT_TIMESTAMP "
                "WHERE chat_id=? AND student_id=?", (json.dumps(msgs, ensure_ascii=False), title, req.chat_id, sid))
    conn.commit()
    return {"reply": text, "trace": trace, "actions": A, "model": model, "title": title}
# END navchats.py
