# MathMap AI

AI-powered math misconception diagnosis agent — Nebius x NVIDIA Hackathon (Personal AI track)

## About

MathMap AI is a math learning agent that diagnoses the root cause of a student's difficulties through a prerequisite knowledge graph, instead of just marking answers right or wrong. The system:

- Analyzes student answers to detect specific misconception categories
- Tracks student concept mastery persistently
- Predicts the risk of failure in advanced topics based on weak prerequisites
- Generates personalized micro-lessons and learning roadmaps

## Architecture

A single-agent orchestrator with tool-calling, running three NVIDIA/open-source models via Nebius Token Factory:

| Model | Role |
|---|---|
| nvidia/nemotron-3-super-120b-a12b | Main orchestrator — decides tool calls, composes replies to the student |
| nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B | Classifies student misconceptions (high-frequency, lightweight) |
| deepseek-ai/DeepSeek-V4-Pro | Generates in-depth learning content (micro-lessons) |

## Project Structure

    app/
    ├── __init__.py
    ├── main.py          FastAPI entry point
    ├── agent.py         SYSTEM_PROMPT + orchestrator loop (run_agent_turn)
    ├── clients.py       Nebius Token Factory connection + model definitions
    ├── database.py      SQLite setup (students, mastery_records, attempt_log, goals)
    └── tools.py         Data (concept graph, question bank) + all tool functions
    requirements.txt

## Getting Started

1. Clone this repo
2. Install dependencies:

   pip install -r requirements.txt

3. Create a `.env` file in the root (see `.env.example`), with:

   NEBIUS_API_KEY=your_nebius_api_key_here

4. Run the server:

   uvicorn app.main:app --host 0.0.0.0 --port 8000

5. Open `http://localhost:8000/docs` for the interactive API docs

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
