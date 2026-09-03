# Architecture

[← Back to README](../README.md)

- [System overview](#system-overview)
- [Tech stack, and why](#tech-stack-and-why)
- [The RAG pipeline](#the-rag-pipeline)
- [RAG response caching](#rag-response-caching)
- [Real-time layer](#real-time-layer)
- [Text-to-speech](#text-to-speech)
- [Notifications data flow](#notifications-data-flow)
- [Authentication](#authentication)

## System overview

```
┌───────────────────────┐         ┌───────────────────────────┐
│       Frontend        │         │          Backend          │
│  React 19 + Vite      │  HTTPS  │  Express 5 (REST API)     │
│  TanStack Query       │◄───────►│  JWT auth via httpOnly    │
│  Tailwind CSS         │         │  cookie                   │
└───────────┬───────────┘         └───────────────┬───────────┘
            │                                     │
            │ Socket.IO (chat, notifications,     │
            │ presence, progress updates)         │
            ├─────────────────────────────────────┤
            │                                     │
            │ raw WebSocket (whiteboard only)     │
            ├─────────────────────────────────────┤
            ▼                                     ▼
   ┌─────────────────┐                  ┌──────────────────────┐
   │Socket.IO server │                  │   PostgreSQL         │
   │(per-user rooms) │                  │   + pgvector         │
   └─────────────────┘                  │   (Drizzle ORM)      │
                                        └─────────┬────────────┘
                                                  │
                        ┌─────────────────────────┼─────────────────────┐
                        ▼                         ▼                     ▼
            ┌─────────────────────┐     ┌────────────────────┐  ┌────────────────┐
            │  Google Gemini      │     │  ElevenLabs        │  │  Resend        │
            │  chat, RAG,         │     │  text to speech    │  │  transactional │
            │  embeddings,        │     │                    │  │  email         │
            │  flashcards/MCQs,   │     └────────────────────┘  └────────────────┘
            │  study plans,       │
            │ audio transcription │     ┌────────────────────┐
            └─────────────────────┘     │  Google Calendar   │
                                        │  OAuth 2.0         │
                                        └────────────────────┘
```

Three separate real-time channels exist for a reason, not by accident:

1. **Socket.IO** carries group chat messages, presence, live notifications, and progress-refresh events. Every authenticated connection joins a `user:<id>` room on connect, which is what lets the backend push a notification or a progress update to exactly one user without a room-management scheme built specifically for that.
2. **A raw WebSocket** (`ws`) carries only the whiteboard's binary sync protocol (`@tldraw/sync-core`), upgraded on a separate URL path (`/whiteboard/*`) so it doesn't collide with Socket.IO's own upgrade handling on the same HTTP server.
3. **Plain HTTPS/REST** carries everything else — CRUD operations, file upload, auth.

## Tech stack, and why

| Layer | Choice | Why |
|---|---|---|
| Frontend framework | React 19 + Vite + TypeScript | Fast dev server, and TypeScript across both frontend and backend means the API's request/response shapes are checked at compile time instead of only discovered at runtime. |
| Server state | TanStack Query | The app has a lot of server-derived state (courses, flashcards, notifications, progress) that needs caching, background refetch, and optimistic updates. Rolling that by hand would mean reimplementing a chunk of what Query already does correctly. |
| Styling | Tailwind CSS | Fast iteration during a hackathon timeline, no separate CSS files to keep in sync with component changes. |
| Backend framework | Express 5 + TypeScript | The team's existing familiarity, and a large enough middleware ecosystem (`helmet`, `express-rate-limit`, `cors`, `multer`) to cover the security requirements without writing that infrastructure from scratch. |
| Database | PostgreSQL + `pgvector` | One database for both normal relational data (users, courses, events) and vector similarity search (document embeddings for RAG), instead of running a separate vector database alongside Postgres. |
| ORM | Drizzle ORM | Schema is defined in TypeScript and the query builder is typed end to end — a column rename is a compile error in every DAL function that touches it, not a runtime surprise. |
| AI | Google Gemini | One provider for chat, RAG-grounded answers, flashcard/MCQ generation, study plan generation, and audio transcription. Gemini's multimodal input (it accepts audio directly) is what let voice input skip a separate speech-to-text service entirely — the same API call that would generate a text reply can take audio as the input instead. |
| Text-to-speech | ElevenLabs | See [Text-to-speech](#text-to-speech) below — this was a deliberate change partway through the project, not the original choice. |
| Real-time | Socket.IO + raw `ws` | Socket.IO for everything that benefits from rooms, reconnection handling, and a JS client library (chat, notifications, presence). Raw `ws` only for the whiteboard, because `@tldraw/sync-core` speaks its own binary protocol over a plain WebSocket and doesn't go through Socket.IO's framing. |
| Whiteboard | tldraw + `@tldraw/sync-core` | A CRDT-backed collaborative canvas is a substantial distributed-systems problem on its own (conflict resolution, cursor presence, reconnection); tldraw's sync package solves it rather than building a bespoke operational-transform layer for a hackathon timeline. |
| Auth | JWT (access + rotating refresh token) in httpOnly cookies, bcrypt | Tokens in httpOnly cookies aren't reachable from JavaScript, which closes off a common XSS-to-token-theft path that `localStorage`-based JWT storage doesn't. |
| Email | Resend + `@react-email/components` | Email templates as actual React components, rendered server-side, instead of hand-written HTML strings. |
| Calendar | Google Calendar OAuth 2.0, direct REST calls | The integration only needs `/token` (refresh) and `/calendar/v3/events` (list), so a full SDK dependency wasn't pulled in for two endpoints. |

## The RAG pipeline

This is what powers "chat with your docs" in both the standalone AI chatbot and the group chat's `@docs` command.

1. **Upload** — a PDF or DOCX is uploaded, its actual bytes are checked against the declared file type (not just the browser's mimetype claim), and the file is saved.
2. **Extraction** — text is pulled out page by page for PDFs (`pdf-parse`), so every extracted piece of text keeps a real page number attached. DOCX files (`mammoth`) don't have a page concept, so their chunks carry no page number rather than a fabricated one.
3. **Chunking** — each page's text is split with LangChain's `RecursiveCharacterTextSplitter`, preserving the page number per chunk.
4. **Embedding** — every chunk is embedded with `gemini-embedding-001` into a 3072-dimension vector and stored in `pgvector` alongside the chunk text and page number.
5. **Retrieval** — a question is embedded the same way, and the closest chunks are found by cosine distance directly in Postgres.
6. **Grounded answer** — the retrieved chunks (with their real file name and page number) are placed into the system prompt, with an explicit instruction never to cite a page number that wasn't actually given in the context. This exists because an earlier version of the prompt asked the model to "cite a page number" without ever giving it one — it complied by guessing. Giving it real page numbers and forbidding invented ones removed that failure mode at the source.

## RAG response caching

An identical "chat with your docs" question doesn't need to re-run steps 5 and 6 above every time it's asked. Answers are cached keyed on the normalized question text **and** the exact set of file IDs retrieved for it, with a time-based expiry as a backstop.

The file IDs in the key matter more than they might look: if a student uploads a new file that becomes relevant to a previously-asked question, the set of retrieved file IDs changes, the cache key changes with it, and the question is answered fresh automatically — without needing to track which specific files changed. A cache keyed on question text alone would have kept serving the old answer until the time-based expiry caught up, which is exactly the scenario ("upload something new, ask again, does it actually use it") most likely to get tested directly.

Regular conversational chat is not cached. Its answers depend on the preceding turns in the conversation, so caching by question text alone would return an answer to what's effectively a different question each time.

## Real-time layer

Notifications are a good example of why the socket layer exists rather than everything being a REST poll. The backend already puts every connected user into a `user:<id>` Socket.IO room for chat presence — the same room is reused to push a notification the instant it's created, with zero extra infrastructure. The frontend keeps a REST fetch as a fallback on page load and on reconnect, so a notification created while a client was offline still arrives once it reconnects.

## Text-to-speech

Read-aloud originally used the browser's built-in `speechSynthesis` API — free, and requires no backend involvement. The problem it ran into was Urdu: whether a real Urdu voice is available at all depends entirely on what's installed on the machine running the browser, and most laptops don't ship one. In practice this meant Urdu responses were either mispronounced badly or silent, on a feature that exists specifically to support Urdu-speaking students.

Read-aloud now sends the message text to ElevenLabs' text-to-speech API instead, with the backend detecting whether the text is predominantly Urdu or English script and passing the matching language code. Pronunciation is now controlled server-side rather than depending on whichever voices happen to be installed on the listener's device.

The tradeoff: `speechSynthesis` is a single browser-wide queue, so "only one message plays at a time" came for free. A real `Audio` element per message doesn't have that built in, so a small shared player utility was added that every message component plays through, stopping whatever's currently playing before starting the next one — the same behavior as before, just made explicit instead of inherited from the browser API.

The ElevenLabs API key is optional at the configuration level rather than required at startup, so a missing key disables only the read-aloud endpoint rather than preventing the backend from starting at all.

## Notifications data flow

```
Cron job (daily, node-cron)
      │
      ├── finds events due tomorrow (assignment/quiz/mid/final/project only)
      │        └── insert notification → emit over Socket.IO → send email
      │
      └── finds study sessions logged as missed or less-than-planned
               └── insert notification → emit over Socket.IO → send email
```

General and study-tagged calendar entries deliberately generate neither a notification nor an email — they aren't graded deadlines, and treating every calendar entry as equally urgent would make the important ones easier to miss in the noise.

## Authentication

Passwords are hashed with bcrypt before storage. On login, a short-lived access token and a longer-lived refresh token are both issued as httpOnly cookies. The refresh token rotates on use — each refresh consumes the current token and issues a new one, rather than reusing the same refresh token indefinitely — so a leaked refresh token has a limited window of use rather than being valid until the user manually logs out everywhere.

---

[← Features](Features.md) · [Security →](Security.md)