# MathMap AI

AI-powered math misconception diagnosis agent — Nebius x NVIDIA Hackathon (Personal AI track)

## About

MathMap AI is a math learning agent that diagnoses the root cause of a student's difficulties through a prerequisite knowledge graph, instead of just marking answers right or wrong. The system:

- Analyzes student answers to detect specific misconception categories
- Tracks student concept mastery persistently
- Predicts the risk of failure in advanced topics based on weak prerequisites
- Generates personalized micro-lessons and learning roadmaps

## Architecture

**Principle:** the deterministic core is the source of truth. The question bank, the scoring and the prerequisite graph decide what is right, what is mastered and where a mistake comes from. LLMs only provide language (lessons, explanations).

**Flow:** diagnostic test, then per-concept mastery (rule of succession, so 2-3 questions never overstate the evidence), then every wrong option maps to a misconception code and its root concept on the prerequisite graph, then a learning path, a short lesson, Practice that targets the student's own mistakes, re-measurement and History.

All models run on **Nebius Token Factory**:

| Model | Role |
|---|---|
| `deepseek-ai/DeepSeek-V4-Pro` | Micro-lessons, the AI tutor, and question generation |
| `nvidia/nemotron-3-super-120b-a12b` (NVIDIA) | Blind verification of every generated question in the v2 banks (it solves each question without seeing the key and must agree); fallback model for the tutor; orchestrator of the experimental tool-calling agent (`/api/agent/chat`) |
| `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B` (NVIDIA) | Misconception classifier tool of the experimental agent |

The tool-calling agent endpoint is kept as an experimental API. The web UI currently uses direct deterministic endpoints with the LLM as a language layer.

**Known limits:** progress is tied to a private ID stored in the browser (no password). Only Limits has a dedicated topic bank so far. Lesson text is LLM-generated and reviewed by hand.

## Project Structure

    app/
    ├── __init__.py
    ├── main.py          FastAPI entry point
    ├── agent.py         SYSTEM_PROMPT + orchestrator loop (run_agent_turn)
    ├── clients.py       Nebius Token Factory connection + model definitions
    ├── database.py      SQLite setup (students, mastery_records, attempt_log, goals)
    └── tools.py         Data (concept graph, question bank) + all tool functions
    requirements.txt

## Get started

```bash
git clone https://github.com/HndrxCodes/MathMap-AI
cd MathMap-AI
pip install -r requirements.txt
export NEBIUS_API_KEY=your_key_here      # Windows: set NEBIUS_API_KEY=your_key_here
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Open http://localhost:8000. Python 3.11 is recommended. The question banks and lessons ship in the repo, and the SQLite database (`mathmap.db`) is created automatically on first run.

On Replit: add `NEBIUS_API_KEY` in Secrets and run `python3.11 -m uvicorn app.main:app --host 0.0.0.0 --port 8000`.

## Main Endpoint

**POST /api/agent/chat**

Request:

    {
      "student_id": "student_001",
      "message": "I want to learn Factoring",
      "history": []
    }

Response:

    {
      "reply": "...",
      "history": [...]
    }

The `history` from the response must be sent back in the next request to continue the conversation — the client is responsible for storing conversation history.

## License

MIT License — see the LICENSE file.
