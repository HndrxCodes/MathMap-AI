from fastapi import FastAPI
from pydantic import BaseModel
from app.agent import run_agent_turn

app = FastAPI(title="MathMap AI")

import time
from collections import defaultdict, deque
from fastapi import Request
from fastapi.responses import JSONResponse

_RL_PATHS = ("/api/tutor", "/api/agent/chat")  # endpoint yang memanggil LLM
_RL_PER_IP, _RL_TOTAL = 40, 800  # permintaan per jam
_hits, _all = defaultdict(deque), deque()


@app.middleware("http")
async def _limit(request: Request, call_next):
    if request.url.path.startswith(_RL_PATHS):
        now = time.time()
        ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip() or (request.client.host if request.client else "?")
        q = _hits[ip]
        while q and now - q[0] > 3600:
            q.popleft()
        while _all and now - _all[0] > 3600:
            _all.popleft()
        if len(q) >= _RL_PER_IP or len(_all) >= _RL_TOTAL:
            return JSONResponse({"reply": "The tutor has reached its hourly limit. Please try again a little later.",
                                 "lesson": "", "error": "rate_limited"})
        q.append(now)
        _all.append(now)
    return await call_next(request)



class ChatRequest(BaseModel):
    student_id: str
    message: str
    history: list = []


@app.get("/health")
def health():
    return {"status": "MathMap AI jalan"}


@app.post("/api/agent/chat")
def chat(req: ChatRequest):
    full_message = f"[student_id: {req.student_id}] {req.message}"
    reply, updated_history = run_agent_turn(full_message, req.history, req.student_id)
    return {"reply": reply, "history": updated_history}

from app.tools import get_mastery_map, get_goal

@app.get("/api/mastery/{student_id}")
def mastery(student_id: str):
    return {
        "student_id": student_id,
        "mastery": get_mastery_map(student_id),
        "goal": get_goal(student_id)
    }

from fastapi.staticfiles import StaticFiles

from app.baseline import router as baseline_router
app.include_router(baseline_router)
app.mount("/", StaticFiles(directory="static", html=True), name="static")
