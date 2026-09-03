# Security & production readiness

[← Back to README](../README.md)

This project went through a structured production-readiness audit before the features in [`docs/features.md`](features.md) were layered on top. This page documents what the audit found and what was actually done about each finding including the cases where the right call was to leave something as-is, and why.

## Fixed

**Rate limiting on login and register.** Both endpoints are now rate-limited per IP (`express-rate-limit`), so credential stuffing or brute-force attempts against auth are throttled rather than unlimited.

**Cookie security configuration.** `sameSite` and `secure` cookie attributes are now driven by `NODE_ENV` rather than hardcoded, and verified directly against the deployed environment rather than assumed correct from local testing.

**JWT no longer accepted via URL query parameter on the whiteboard connection.** The whiteboard's WebSocket upgrade previously read its auth token from the connection URL. URLs get logged by proxies, browser history, and server access logs by default (a token that leaks through any of those is now impossible, because the whiteboard reads the same httpOnly cookie the rest of the app already uses for auth.)

**Test coverage.** The backend previously had zero automated tests. Tests now cover password hashing, JWT signing/verification, file signature validation, and request body validation. The areas where a silent regression would be a security regression, not just a UI bug.

**Global error handler and React error boundary.** An unhandled exception on the backend used to mean an unformatted stack trace (or a hung connection) reaching the client. A global Express error handler now catches anything that reaches it and returns a clean response; a React error boundary on the frontend does the equivalent for a component that throws during render, so one broken component doesn't blank the whole page.

**File upload type trust.** Uploads previously trusted the client-supplied mimetype and filename extension to decide whether a file was really a PDF or DOCX. Uploads are now verified against the actual file bytes (a magic-number check) before being accepted, so a file can't claim to be something it isn't by relabeling its extension or `Content-Type` header. The same category of check was later applied to voice-message audio uploads when the voice input feature was added.

**`Content-Disposition` header sanitization.** Filenames used in download/preview responses are sanitized before being placed into the `Content-Disposition` header, closing a header-injection path that an unsanitized filename would otherwise open.

**Documentation matching actual behavior.** An earlier version of this project's documentation described refresh-token rotation as implemented when it wasn't yet in code. Rotation was implemented to match, rather than the documentation being quietly walked back.

## Accepted as-is, with reasoning

**In-memory rate limiter and whiteboard room state don't survive a restart or share across multiple server instances.** This is true, and was flagged directly rather than glossed over. The reasoning for accepting it: `express-rate-limit`'s default store, the AI-endpoint rate limiter, and the whiteboard's in-memory room state are all the same category of thing — per-process state that resets on restart and isn't shared across instances. On a single-instance deployment, "not shared across instances" isn't a real gap, because there's no second instance to share it with. This would need revisiting (most likely with a Redis-backed store) if the deployment ever moves to a multi-instance setup — not before.

## Tradeoffs made deliberately elsewhere in the build

These aren't audit findings, but they're the same kind of "state the tradeoff instead of hiding it" reasoning applied to features added afterward:

- **RAG response caching** invalidates on a time-based expiry plus a change in which files are retrieved for a question, rather than tracking every file's exact modification state. A RAG question can span a student's entire file library across every course, so there's no single course-level "last updated" value to anchor real dirty-tracking on the way flashcard caching does.
- **Audio format verification** checks uploaded voice messages against the handful of container formats real browsers actually produce (WebM, Ogg, WAV, MP4), rather than every audio format that exists. This is acceptable because the audio never touches disk and is never parsed locally. It's forwarded directly to Gemini for transcription, so the worst case for an unrecognized format is a wasted API call from an already-authenticated, already-rate-limited user.
- **Low-bandwidth mode** reduces what the frontend itself chooses to load eagerly (document previews, notification polling) but does not modify the collaborative whiteboard's internal sync protocol. Throttling that would mean changing third-party real-time sync internals with no reliable way to verify the change is safe. Not a tradeoff worth making against a core collaboration feature.

---

[← Architecture](Architecture.md) · [Setup →](Setup.md)