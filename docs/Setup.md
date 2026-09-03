# Setup

[← Back to README](../README.md)

## Requirements

- Node.js
- A PostgreSQL database with the `pgvector` extension available
- A Google Gemini API key
- A Resend API key (for transactional email)
- A Google OAuth client (for Calendar sync)
- An ElevenLabs API key (optional — only needed for read-aloud; the rest of the app runs fine without it)

## Project structure

```
Hackathon/
├── backend/     Express API, Socket.IO server, whiteboard WebSocket, cron jobs
└── frontend/    React + Vite app
```

## Backend

```bash
cd backend
npm install
cp .env.example .env   # fill in the values below
npm run db:push        # syncs the Drizzle schema to your database
npm run dev
```

### Backend environment variables

| Variable | Required | Notes |
|---|---|---|
| `APP_STAGE` | no | `dev` or `prod`, defaults to `dev` |
| `NODE_ENV` | no | `development` or `production`, defaults to `development` — controls cookie `secure`/`sameSite` behavior |
| `APP_URL` | no | Frontend URL, defaults to `http://localhost:5173` |
| `BACKEND_PORT` | no | Defaults to `8000` |
| `DATABASE_URL` | **yes** | `postgresql://user:password@host:5432/db` |
| `JWT_SECRET` | **yes** | Minimum 32 characters |
| `JWT_EXPIRY` | no | Defaults to `7d` |
| `ACCESS_TOKEN_EXPIRY` | no | Defaults to `15m` |
| `REFRESH_TOKEN_EXPIRY_DAYS` | no | Defaults to `30` |
| `BCRYPT_ROUNDS` | no | Defaults to `8` |
| `RESEND_API_KEY` | **yes** | For password reset and notification emails |
| `MAIL_SENDER` | **yes** | The "from" address for outgoing email |
| `GOOGLE_GENERATIVE_AI_API_KEY` | **yes** | Gemini API key — powers chat, RAG, flashcards/MCQs, study plans, and audio transcription |
| `GEMINI_MODEL` | no | Defaults to `gemini-2.5-flash` |
| `TEXT_EMBEDDING_MODEL` | no | Defaults to `gemini-embedding-001` |
| `ELEVENLABS_API_KEY` | no | Enables read-aloud when set; the endpoint returns a clean 503 instead of crashing the server when it isn't |
| `ELEVENLABS_VOICE_ID` | no | The voice used for read-aloud |
| `CORS_ORIGIN` | **yes** | Comma-separated list of allowed frontend origins |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | **yes** | Google Calendar OAuth |
| `GOOGLE_REDIRECT_URI` | no | Defaults to `http://localhost:8000/api/scheduler/google/callback` |

### Backend scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the API with hot reload (nodemon) |
| `npm test` | Run the test suite (vitest) |

## Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

### Frontend environment variables

| Variable | Notes |
|---|---|
| `VITE_BACKEND_URL` | REST API base URL, e.g. `http://localhost:8000/api` |
| `VITE_SOCKET_URL` | Socket.IO server URL, e.g. `http://localhost:8000` |
| `VITE_WS_URL` | Raw WebSocket URL for the whiteboard, e.g. `ws://localhost:8000` |

## Deploying

The backend is a normal long-running Node process (not a serverless function) — this matters because it holds a persistent Socket.IO server and a raw WebSocket upgrade handler, both of which need a process that stays alive between requests. On a platform with a free tier that spins the service down after a period of inactivity, the first request after idling will be slow while the instance wakes back up; this is expected and not a bug in the app itself.

**Database schema changes are pushed, not migrated with generated files** — this project uses `drizzle-kit push` rather than `generate` + `migrate`. Any time the schema changes, run `npm run db:push` against both your local database and your deployed database's connection string before deploying the backend, or the new code will fail on its first query against a column or table that doesn't exist yet in production.

---

[← Security](security.md) · [Back to README](../README.md)