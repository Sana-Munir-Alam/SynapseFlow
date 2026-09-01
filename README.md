# SynapseFlow: The Intelligent Academic Operating System

**SynapseFlow** is a high-fidelity, intelligent academic platform designed to bridge the gap between note-taking, active recall, and collaborative study. By integrating Retrieval-Augmented Generation (RAG), CRDT-based collaborative whiteboards, and AI-powered scheduling, SynapseFlow provides a unified, real-time workspace for modern students.

<br />
<img width="1920" height="1280" alt="synapse-dashboard" src="https://github.com/user-attachments/assets/ab039d01-aee1-4d5c-8a18-98a23b5ab715" />
<br />

---

## Core Modules & Features

### 1. Secure Authentication & Identity
*   **Real-time Validation**: Every input is audited in real-time during registration; users receive immediate hints/feedback (e.g., password complexity, email formatting) via reactive UI states.
*   **Cryptographic Security**: Passwords are hashed using **bcrypt** before database persistence.
*   **Session Management**:
    *   Uses **JWT** for persistent session tracking.
    *   Implements **Refresh Token Rotation** (short-lived tokens) to ensure security; tokens are automatically discarded and rotated without requiring user re-login.
*   **Account Recovery**: Secure password reset flow via email; sends a unique token to the user’s provided email address for verified credential updates.

### 2. Knowledge Workspace (Notes & RAG)
<br />
<img width="1639" height="847" alt="rag" src="https://github.com/user-attachments/assets/2d728f61-7a2d-496c-93b0-ce886b92d817" />
<br />

*   **Multi-Format Ingestion**: Supports high-fidelity uploads of **PDF** and **DOCX** materials.
*   **Advanced RAG Pipeline**:
    *   **Extraction**: Text is extracted from PDFs via `pdf-parse`.
    *   **Chunking**: Chunks are generated using `RecursiveCharacterTextSplitter` from LangChain to preserve semantic context.
    *   **Vectorization**: Chunks are transformed into **3072-dimension vectors** via the `gemini-embedding-001` model.
    *   **Retrieval**: Uses **PGVector** and the **Cosine Distance** formula to fetch the $K$ nearest neighbors for grounding AI responses.
*   **Rich Previews**:
    *   **PDFs**: Rendered page-by-page using `react-pdf`.
    *   **DOCX**: Converted client-side to semantic HTML via `mammoth`.
*   **File Management**: Full CRUD operations with the ability to preview and download documents locally.

### 3. Active Recall System (Flashcards & Tests)
<br />
<img width="1629" height="840" alt="flashcard" src="https://github.com/user-attachments/assets/7ade0ea0-aea6-42da-81a7-c1a89f64960f" />
<br />

*   **AI-Generated Flashcards**: Automatically generates flashcards from uploaded notes using the Gemini API.
    *   **Study Interface**: Animated flip-card UI powered by **Framer Motion**.
    *   **Text-to-Speech**: Integrated support via the **Web Speech API**.
    *   **Rating System**: Users can rate cards as "Familiar" or "Unfamiliar" to track mastery.
*   **MCQ Test Engine**:
    *   Sequential quiz interface with real-time answer validation.
    *   AI-generated explanations provided after every question to clarify concepts.
    *   Final score summaries include score percentages and a per-question breakdown (user answer vs. correct answer).

### 4. Real-Time Collaboration (Chat & Whiteboard)
<br />
<img width="1919" height="966" alt="whiteboard" src="https://github.com/user-attachments/assets/f6a783ea-ced2-4ccd-90c9-65bfbdaa9a5f" />
<br />


*   **Collaborative Whiteboard**:
    *   Built on **tldraw v5** with `@tldraw/sync-core`.
    *   **Binary Sync**: Uses raw WebSockets (`ws` library) for optimized binary frame transmission.
    *   **CRDT Consistency**: Ensures eventual consistency across all distributed peers using Conflict-free Replicated Data Types.
    *   **Persistence**: Board snapshots are snapshot-persisted to Postgres on every change.
*   **Group Chat**:
    *   **Command Suite**: Invoke AI via `@ai` (summarize messages, ask general questions) or `@docs` (interrogate uploaded documents).
    *   **Membership Events**: Real-time broadcast when someone joins/leaves a group.
    *   **Message Governance**: Users can delete their own messages (for everyone or self); Group Admins can delete any message or the entire group.
    *   **Presence**: Real-time member count updates via WebSocket heartbeats.

### 5. AI Study Planner & Scheduler
<br />
<img width="1041" height="694" alt="scheduler" src="https://github.com/user-attachments/assets/184a17ef-fae7-4400-a4a5-0c5740fac5a2" />
<br />

*   **Academic Events**: CRUD operations for Assignments, Quizzes, Projects, and Sessions with priority levels (Low/Medium/High).
*   **AI-Generated Study Plan**:
    *   Generates a structured weekly plan via Gemini based on courses, prep levels, and occupied time slots.
    *   Results are parsed and merged into the plan schema; fully editable post-generation.
*   **Progress Tracking**: Sessions are logged as `complete | missed | deviation` to compute completion rates and streaks.
*   **Notifications**: Cron-based generation of reminders combined with frontend polling (30s interval) to keep alerts live.
*   **Google Calendar Sync**: Full **OAuth 2.0 flow** to import existing events and sync local academic deadlines.

---

## 🛠 Technical Architecture

### LLM Orchestration & Guardrails
*   **API**: Google Gemini API.
*   **History Awareness**: AI reponds to user queries using full message history for contextual continuity.
*   **Strict Guardrailing**: Prompt engineering strictly enforces an "Educational Only" policy; the assistant will refuse to answer non-academic or irrelevant queries.
*   **Streaming UI**: Responses are streamed to the client for a responsive, natural feel.
  
  <br />
  <img width="405" height="788" alt="chatbot" src="https://github.com/user-attachments/assets/44450327-aef9-420e-91b4-67d45fe25513" />
<br />

### Performance & Networking
*   **Rate Limiting**: Custom **Token Bucket** strategy (Capacity: 3, Refill: 1/10s). Background jobs prune idle sessions to maintain memory efficiency.
*   **Dual-Transport Interception**: The backend intercepts raw WebSocket upgrades on specific paths while allowing Socket.io traffic to pass through on others.
*   **Optimistic UI**: Uses **TanStack Query** for instant cache invalidation and UI feedback during CRUD operations.

---

## 🛠 Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React, Vite, TailwindCSS, TanStack Query, Framer Motion, tldraw, react-pdf, mammoth |
| **Backend** | Node.js, Express, Socket.io, ws, Drizzle ORM, node-cron |
| **Database** | PostgreSQL, PGVector |
| **AI/ML** | Gemini 1.5 Flash, Gemini Embeddings, LangChain |
| **Integrations** | Google Calendar API (OAuth 2.0), Web Speech API |

---

**SynapseFlow** | *Architecting the future of academic productivity.*
