from fastapi import FastAPI
from pydantic import BaseModel
from app.agent import run_agent_turn

app = FastAPI(title="MathMap AI")


class ChatRequest(BaseModel):
    student_id: str
    message: str
    history: list = []


@app.get("/")
def health():
    return {"status": "MathMap AI jalan"}


@app.post("/api/agent/chat")
def chat(req: ChatRequest):
    full_message = f"[student_id: {req.student_id}] {req.message}"
    reply, updated_history = run_agent_turn(full_message, req.history)
    return {"reply": reply, "history": updated_history}
