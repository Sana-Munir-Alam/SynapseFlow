# SynapseFlow

**One study platform instead of six tabs.**

SynapseFlow is a study platform built for university students who currently split their coursework across a notes app, a flashcard app, a group chat app, a calendar, and a separate AI chatbot. It puts course files, AI-generated flashcards and MCQs, a group chat with an AI agent inside it, a collaborative whiteboard, an AI-assisted study scheduler, Google Calendar sync, and progress tracking into one authenticated workspace — with first-class support for students who are more comfortable in Urdu than English, and for students on a slow or unreliable connection.

Built for the AI Hackathon Pakistan 2026.

<p align="center">
  <img src="docs/assets/dashboard.png" width="800" alt="SynapseFlow dashboard" />
</p>

---

## Documentation

This README is intentionally short. The detailed write-ups live here:

| Document | What's in it |
|---|---|
| [`docs/features.md`](docs/features.md) | Every feature, walked through with real screenshots from the running app |
| [`docs/architecture.md`](docs/architecture.md) | System architecture, data flow diagrams, the tech stack, and why each piece was chosen |
| [`docs/security.md`](docs/security.md) | The production security audit this project went through, what was fixed, and the tradeoffs made and why |
| [`docs/setup.md`](docs/setup.md) | Environment variables, running the project locally, scripts, and deployment notes |

---

## What it does, in one pass

- **Notes & course files** — upload PDF/DOCX lecture material per course, preview it in-browser, and generate AI flashcards and MCQs from it.
- **AI chatbot** — a personal study assistant that can answer general questions or ground its answers in your own uploaded documents (RAG), with a citation back to the specific file and page. Accepts typed or spoken input, and can read its own answers aloud.
- **Group chat** — real-time chat per course group, with an `@ai` and `@docs` command to bring the same assistant into a group conversation.
- **Collaborative whiteboard** — a live, multi-user whiteboard per group, built on tldraw.
- **Scheduler** — track assignments/quizzes/exams, generate an AI weekly study plan from your courses and deadlines, log actual study sessions against the plan, and sync with Google Calendar.
- **Progress tracking** — study completion, MCQ accuracy, flashcard mastery, streaks, and badges, computed from real session data.
- **Urdu support** — the AI reads, writes, and speaks Urdu directly (no translation layer), rendered in the Noto Nastaliq Urdu font.
- **Low-bandwidth mode** — a setting that removes background polling and gates data-heavy features (document previews, the live whiteboard) behind an explicit "this uses more data" confirmation.
- **Notifications** — real-time, socket-delivered alerts for upcoming deadlines and for falling behind your study plan, each with a matching email.

See [`docs/features.md`](docs/features.md) for what each of these actually looks like, with screenshots of the real app.

## Tech stack, briefly

**Frontend:** React 19, TypeScript, Vite, Tailwind CSS, TanStack Query, tldraw, react-pdf, Socket.IO client<br>
**Backend:** Node.js, Express 5, TypeScript, Socket.IO, raw `ws` (whiteboard sync), PostgreSQL with `pgvector`, Drizzle ORM<br>
**AI:** Google Gemini (chat, RAG grounding, flashcard/MCQ generation, study plan generation, audio transcription), ElevenLabs (text-to-speech)<br>
**Auth & infra:** JWT with rotating refresh tokens, bcrypt, Resend (transactional email), Google Calendar OAuth 2.0

Full reasoning for these choices is in [`docs/architecture.md`](docs/architecture.md) — this list is intentionally just the names.

## Running it locally

```bash
git clone <this-repo>
cd Hackathon
```

Full environment variable list, setup steps, and scripts are in [`docs/setup.md`](docs/setup.md).