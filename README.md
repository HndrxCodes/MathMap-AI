# MathMap AI

**Find the root cause behind a student's math mistakes, not just whether an answer is right or wrong.**

Built for the **Nebius x NVIDIA Global AI Hackathon** (track: Best Apps and Agents). Everything runs on **Nebius Token Factory**, with **NVIDIA Nemotron** powering the planning agent and verifying every generated question.

- **Live Demo:** https://mathmap-ai.onrender.com
- **Video Demo:**
https://youtu.be/s2OKHyAU2FI?si=X29NlwPf-ZWgyt2U
- **License:** MIT

---

## The idea

A wrong answer tells a student very little. MathMap traces it back to a *specific misconception* and then to the *prerequisite skill* it comes from. A mistake in Limits can turn out to be a Factoring problem, which can turn out to be an Integer Operations problem.

**Principle: the deterministic core is the source of truth.** The question bank, scoring and prerequisite graph decide what is correct, what is mastered and where a mistake comes from. LLMs only provide language: lessons, explanations and planning text. A model never decides right or wrong.

**Non-goals:** MathMap is not a general chatbot and not a free-form homework solver.

---

## How it works

1. **Diagnose.** A 10-question scan (*Find my root cause*) covers four foundations, or a 15-question focused test covers one topic (Limits). Each question has five options. Every wrong option is the result of one specific mistake and carries a misconception code and a short reason. The server shuffles option order per session and never sends the answer key or misconception codes to the browser during a test.
2. **Score.** Mastery per concept is `(correct + 1) / (total + 2)` (rule of succession), so two or three questions never overstate the evidence. `strong` is 0.70 or higher, `developing` is 0.45 or higher, and below that is `needs work`. "I don't know" counts as incorrect and carries no misconception.
3. **Map.** Mistakes are linked to root concepts on the prerequisite graph, and the result shows a learning path with a *Start here* marker. The path is Integer Operations → Basic Algebra → Factoring → (Quadratic Equations) and Basic Algebra → Functions; Limits need Factoring and Functions.
4. **Learn.** Tap any topic on the path for a short lesson. Open any wrong answer and tap *Ask the tutor about this* for an explanation of the student's specific mistake.
5. **Practice and re-measure.** *Practice* serves five unseen questions weighted toward the student's own misconceptions, then shows the mastery change (for example *Needs work → Developing*). *History* keeps every test and practice session.
6. **Plan.** *Navigator* (below) turns the student's data and daily study plan into a concrete next step.

Other features: a study plan (minutes per day, number of days, a "Day N" flame), a lightweight profile (nickname only, no password), exam-prep modes for SAT, CSCA and school tests (no official exam questions are used; the app states what it covers and what it doesn't), and LaTeX rendering with KaTeX.

---

### Two ways to practice

- **Master a topic** goes deep on **one** topic. The test traces your mistakes back through the topic's prerequisites, and the result shows a path to that topic. Use it when you know what you need to learn.
- **Prepare for a test** mixes **several** topics, split evenly across the ones you keep selected. For **SAT** and **CSCA**, the topics MathMap covers are preselected and you can remove any of them. For a **school exam**, you choose the topics yourself. While you practice, an exam timer runs, and the result adds an **Exam pace** card that compares your seconds per question with the real test's format. Questions are original MathMap questions, not official exam items, and the topic mapping is our own approximation, not an official syllabus.

---

## Navigator: the planning agent

Navigator is a single tool-calling agent, orchestrated by **NVIDIA Nemotron 3 Super** on Nebius Token Factory. It answers questions like *"I only have 10 minutes today, where do I start?"* or *"Am I ready for Limits?"*

The model decides which tools to call, up to four rounds per message:

| Tool | What it does |
|---|---|
| `get_progress` | Mastery per topic, recurring mistakes, study-plan minutes |
| `check_readiness` | Weak, developing and unchecked prerequisites for a target topic |
| `build_session_plan` | A time-boxed plan for today |
| `get_history` | Recent completed tests and practice sessions |
| `get_lesson` | Fetches a lesson and shows an *Open lesson* button |
| `propose_practice` | Shows a *Start practice* button |

- **Time comes from the student's plan.** Navigator reads the study-plan minutes (the flame in the header). If the student states a time in the message, that overrides the plan.
- **The tools are read-only.** Facts come from the deterministic core, and the agent can only *propose* actions as buttons that the student taps. The agent changes no data.
- **Transparent by design.** The UI shows which tools were actually called and which model answered ("NVIDIA Nemotron · Nebius Token Factory").
- **Persistent memory.** Navigator chats are stored server-side (up to three per student) next to mastery, history and profile.
- **Guardrails.** Navigator does not solve problems or explain a specific question. It points the student to the lesson or the per-question tutor.

If the primary model fails, Navigator falls back to the secondary model and logs it.

---

## How we use Nebius Token Factory and NVIDIA Nemotron

All LLM calls go to Nebius Token Factory (OpenAI-compatible API).

| Model | Role |
|---|---|
| `nvidia/nemotron-3-super-120b-a12b` (**NVIDIA**) | **Navigator** agent (tool calling). **Blind verification** of every generated question (it solves the question without seeing the key and must agree, with exactly one correct option). Fallback model for the tutor. Orchestrator of the earlier experimental agent. |
| `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B` (**NVIDIA**) | Misconception classifier tool of the earlier experimental agent |
| `deepseek-ai/DeepSeek-V4-Pro` | Lessons, the per-question tutor, and question generation |

We chose DeepSeek for the per-question tutor after comparing it with Nemotron on the same questions; its diagnosis of the student's mistake was more accurate. Nemotron stays where tool-calling and verification matter most.

**Question pipeline.** DeepSeek generates questions as JSON, and structural validation then checks the number of distractors, duplicate options, valid misconception codes and balanced LaTeX. Nemotron blind-verifies each question, and failures are dropped and regenerated. In manual review, every question flagged by the verifier turned out to be genuinely broken.

---

## Track fit

We submit under **Best Apps and Agents**: a practical app students can use daily, with a Nemotron-powered agent on Nebius Token Factory.

To be clear about what MathMap is *not*: it is not an always-on, locally run personal assistant, and we did **not** use NVIDIA NemoClaw, OpenShell, Hermes Agent or Nebius Serverless. Those tools fit a local agent that runs continuously. MathMap is a web app with per-browser profiles, so we chose not to bolt them on. What it does share with a personal-AI design:

- **Persistent memory:** mastery, attempt history, profile and Navigator chats in SQLite.
- **Reusable skills and tools:** the six Navigator tools above.
- **User control:** the agent proposes, the student decides.

---

## Try it

1. Open the live demo. There is no login. You can skip the nickname prompt.
2. Choose **Find my root cause**. It takes about 10 questions.
3. Read the result: the donut, the learning path, and the mistakes with their root concepts.
4. Tap *Start here* for a lesson, then **Practice** for five targeted questions.
5. Tap the **Navigator** button (bottom right) and ask: *"I only have 10 minutes today."*

For a quick check of the Limits topic, pick **Master a topic → Limits**.

---

## Live demo and hosting notes

The demo is hosted on a free tier (Render). Please expect the following:

- **The first load can take 30–50 seconds.** Free instances sleep after about 15 minutes without traffic. If the page looks slow or empty, wait a minute and reload.
- **Progress may reset when the server restarts.** The free tier has no persistent disk, so the SQLite database (progress, history, Navigator chats) is recreated on restart or redeploy. Question banks and lessons are files in this repository and are unaffected.
- **Privacy.** There are no accounts and no emails. A random ID is stored in your browser, plus an optional nickname. *Reset my data* in the profile menu deletes everything tied to that ID.
- **Fair use.** The tutor and Navigator endpoints are rate-limited (40 requests per IP per hour, 800 per hour in total).

---

## Run it locally

```bash
git clone https://github.com/HndrxCodes/MathMap-AI
cd MathMap-AI
pip install -r requirements.txt
export NEBIUS_API_KEY=your_key_here      # Windows: set NEBIUS_API_KEY=your_key_here
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Open http://localhost:8000. Python 3.11 is recommended. The question banks and lessons ship in the repo, and the SQLite database (`mathmap.db`) is created automatically on first run. The API key stays on the server and is never sent to the browser.

On Replit: add `NEBIUS_API_KEY` in Secrets and run `python3.11 -m uvicorn app.main:app --host 0.0.0.0 --port 8000`. A health check is available at `/health`.

---

## Project structure

```
app/
  main.py           FastAPI app, rate limiter, routers, static files
  baseline.py       Tests, results, practice, history, profile, lessons, tutor
  navigator.py      Navigator agent: six tools and the tool-calling loop
  navchats.py       Server-side storage for Navigator chats (max 3 per student)
  clients.py        Nebius client and model constants
  database.py       SQLite schema
  question_bank_v2.json   Baseline bank (about 12 questions per concept, 6 concepts)
  topic_bank_v2.json      Dedicated topic bank (Limits and Basic Algebra: 15 questions)
  misconceptions_v2.json  Misconception codes, labels and root concepts
  concepts_v2.json        Display names and plain-language descriptions
  lessons_v1.json         Pre-generated lessons
  agent.py, tools.py      Earlier experimental agent (not used by the current UI)
static/             Vanilla JS front end (index.html, app.css, app.js ... app5.js)
generate_bank_v2.py, generate_topic_bank.py, review_v2.py   Question tooling
```

**Regenerating questions** (needs `NEBIUS_API_KEY`): `python generate_topic_bank.py Limit` generates a topic bank with blind verification, and `python review_v2.py topic limit` helps review it before it is committed.

---

## Known limitations

- **Limits** and **Basic Algebra** have dedicated topic banks. Practice for the other concepts draws on the baseline bank (about 12 questions per concept), so questions repeat if you take the same test several times.
- A small number of misconception explanations (22 answer options) were cleaned up after generation and now show a generic description of the mistake type instead of the exact worked slip. All other explanations are specific to the question.
- A new test overwrites the stored mastery score for the concepts it covers, while Practice accumulates across all attempts. Older results keep showing the snapshot from when that test was taken.
- Lessons are LLM-generated. The Limits lesson was reviewed by hand; the others have not been reviewed yet.
- Navigator is English-only, read-only and limited to six tools.
- Progress is tied to the browser (no accounts). Clearing browser data starts a fresh profile.
- The repository also contains an earlier experimental tool-calling agent (`/api/agent/chat`, Indonesian prompt) and a SymPy-based free-text answer checker. The current UI does not use them.

Built entirely from an Android phone.

## License

MIT. See [LICENSE](LICENSE).

<!-- END README -->
