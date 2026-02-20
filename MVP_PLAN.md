# AI Meeting Notes App - MVP Plan

## 1) MVP Goal
Build a notes app that records in-person meetings, transcribes audio, diarizes by speaker, and generates useful notes (summary + action items).

Success criteria:
- User can record and upload a meeting from mobile.
- Transcript appears with speaker-separated segments.
- User can rename speaker labels (e.g., `Speaker 1` -> `Alex`).
- App generates summary and action items.
- Transcript is searchable.

## 2) Scope

In scope (v1):
- Mobile recording (single meeting at a time).
- Upload audio to backend.
- Async processing pipeline: transcription + diarization.
- Transcript viewer with timestamps and speaker segments.
- Speaker rename/edit.
- AI summary and action-item extraction.
- Basic auth + user-owned meetings.

Out of scope (post-MVP):
- Live transcription during recording.
- Calendar integrations.
- Enterprise SSO / admin controls.
- Perfect speaker identity resolution across meetings.

## 3) System Architecture

Components:
- Mobile app (React Native)
  - Record meeting audio
  - Upload file
  - Show processing status + results
- API service (Node.js + TypeScript)
  - Auth, meetings, transcript retrieval, notes endpoints
- Worker service (Node.js/Python)
  - Handles ASR/diarization jobs
- Database (PostgreSQL)
  - Users, meetings, transcript segments, notes, action items
- Object storage (S3-compatible)
  - Raw audio files

Processing flow:
1. Mobile uploads audio and creates `meeting`.
2. API stores metadata and enqueues processing job.
3. Worker pulls job, runs ASR + diarization provider.
4. Worker stores transcript segments + speakers.
5. Worker runs LLM summarization + action item extraction.
6. UI polls/websocket updates status to `completed`.

## 4) AI Stack (Pragmatic Defaults)

Option A (fastest to ship):
- Use managed API provider that includes transcription + diarization.
- Use LLM API for summary/action items.

Option B (more control, more ops):
- Whisper (ASR) + pyannote (diarization) self-hosted.
- LLM API for notes.

Recommended for MVP:
- Start with Option A for speed and reliability.
- Keep provider abstraction (`TranscriptionProvider` interface) so you can swap later.

Local-first path (selected next):
- Add `local` transcription mode for offline development and cost control.
- Use local ASR + diarization pipeline (e.g., faster-whisper + pyannote).
- Use local LLM for notes generation (e.g., Ollama) when offline.
- Keep `managed` mode available for hosted production fallback.

## 5) Data Model (Postgres)

`users`
- id (uuid, pk)
- email (unique)
- created_at

`meetings`
- id (uuid, pk)
- user_id (fk users.id)
- title (text)
- audio_url (text)
- duration_sec (int, nullable)
- status (enum: uploaded, processing, completed, failed)
- started_at (timestamptz, nullable)
- created_at

`speakers`
- id (uuid, pk)
- meeting_id (fk meetings.id)
- label (text)           -- default: Speaker 1, Speaker 2
- display_name (text)    -- user-editable

`transcript_segments`
- id (uuid, pk)
- meeting_id (fk meetings.id)
- speaker_id (fk speakers.id, nullable)
- start_ms (int)
- end_ms (int)
- text (text)
- confidence (real, nullable)
- created_at

`meeting_notes`
- id (uuid, pk)
- meeting_id (fk meetings.id, unique)
- summary_md (text)
- key_points_json (jsonb)
- created_at
- updated_at

`action_items`
- id (uuid, pk)
- meeting_id (fk meetings.id)
- owner_name (text, nullable)
- task (text)
- due_date (date, nullable)
- status (enum: open, done)
- source_segment_id (uuid, nullable)

Indexes:
- transcript_segments(meeting_id, start_ms)
- meetings(user_id, created_at desc)
- action_items(meeting_id, status)

## 6) API Endpoints (v1)

Auth:
- `POST /auth/signup`
- `POST /auth/login`

Meetings:
- `POST /meetings` create meeting + upload URL
- `POST /meetings/:id/complete-upload`
- `GET /meetings` list user meetings
- `GET /meetings/:id` details + status

Transcripts/Speakers:
- `GET /meetings/:id/transcript`
- `PATCH /meetings/:id/speakers/:speakerId` rename speaker
- `PATCH /meetings/:id/segments/:segmentId` edit text (optional but useful)

Notes:
- `GET /meetings/:id/notes`
- `POST /meetings/:id/notes/regenerate`

Search:
- `GET /search?q=...` basic full-text over transcript text

## 7) Frontend Screens (Mobile)

1. Auth screen
2. Meetings list
3. Record screen
4. Meeting detail
   - processing state
   - transcript by speaker + timestamps
   - summary + action items
5. Speaker rename modal

## 8) Background Jobs

Queue jobs:
- `process_meeting_audio(meeting_id)`
- `generate_meeting_notes(meeting_id)`

Retries:
- max 3 retries with exponential backoff.
- move to dead-letter state on final failure.

Idempotency:
- job checks if transcript exists before reprocessing.

## 9) Security and Compliance Baseline

- Explicit consent screen before recording.
- Encrypt in transit (TLS) and at rest (DB + storage).
- Per-user authorization checks for every meeting endpoint.
- Configurable retention policy (e.g., auto-delete raw audio after N days).
- Audit events for transcript edits and speaker renames.

Note: recording consent laws vary by jurisdiction; legal review is required before launch.

## 10) 4-Week Delivery Plan

Week 1: Foundation
- Set up monorepo, API service, DB schema, migrations.
- Implement auth, meeting creation, object storage upload flow.
- Mobile app scaffold + auth + record/upload flow.
- Queue and worker scaffolding.

Week 2: Transcription + Diarization
- Integrate provider for async transcription + diarization.
- Persist speakers + transcript segments.
- Add processing status and failure handling.
- Build transcript viewer in mobile app.

Week 3: Notes Intelligence
- Add summary + action-item generation.
- Add speaker rename endpoint + UI.
- Implement search over transcript text.
- Add basic telemetry (job durations, failure rates).

Week 4: Hardening + Launch Readiness
- QA on noisy audio samples and long meetings.
- Improve retries, idempotency, and error UX.
- Add retention controls and consent/legal copy.
- Beta release with 10-20 test users and feedback loop.

## 11) Acceptance Tests (MVP)

- Uploading a 30-minute recording produces transcript + diarization within target SLA.
- At least 2 speakers are correctly separated on sample test set.
- User can rename speakers and see updates instantly in transcript.
- Summary and action items generate for completed meetings.
- Meeting data is isolated by user account.

## 12) Suggested Tech Stack

- Mobile: React Native + Expo
- API: Node.js + TypeScript + Fastify
- Worker: Node.js or Python worker process
- DB: PostgreSQL
- Queue: BullMQ + Redis
- Storage: S3
- Auth: JWT (MVP), migrate to managed auth later if needed

## 13) Next Build Steps

1. Create project skeleton (`mobile`, `api`, `worker`).
2. Add Docker Compose for Postgres + Redis.
3. Implement migrations for schema above.
4. Build upload + processing happy path end-to-end.
5. Wire transcription provider and validate on real meeting sample.
6. Add local AI mode (`TRANSCRIPTION_PROVIDER=local`) and validate on sample meetings.

## 14) Build Progress Tracker

Last updated: 2026-02-20

### Completed
- [x] Monorepo scaffolded (`apps/mobile`, `apps/api`, `apps/worker`) with TypeScript workspaces.
- [x] Docker Compose added for Postgres + Redis.
- [x] Postgres migration created for users, meetings, speakers, transcript segments, notes, and action items.
- [x] API service implemented with JWT auth + user-scoped endpoints from section 6.
- [x] Queue wiring implemented (`process_meeting_audio`, `generate_meeting_notes`) with retries/backoff.
- [x] Worker implemented with provider abstraction (`TranscriptionProvider`) + mock provider.
- [x] Worker persistence flow implemented: diarized segments -> speakers/segments -> notes/action items.
- [x] Mobile app scaffolded (Expo) with minimalist dark UI (Obsidian-inspired).
- [x] Mobile auth, recording, upload initiation, meetings list, transcript view, speaker rename, and notes view wired.
- [x] Replaced mocked upload URL with real S3-compatible presigned upload flow in API.
- [x] Added basic worker telemetry for job durations and failure rates.
- [x] Replaced mock transcription provider with managed transcription + diarization provider integration (Deepgram Option A).

### In Progress
- [ ] Validate managed transcription provider on real meeting samples and tune defaults.

### Local-First Track (New)
- [ ] Add `local` provider mode to worker (`mock | managed | local`).
- [ ] Implement local ASR + diarization adapter behind `TranscriptionProvider`.
- [ ] Add local notes generation path via Ollama with fallback to current notes logic.
- [ ] Add local setup docs (dependencies, model downloads, CPU/GPU guidance).
- [ ] Add acceptance checks for local mode (30-minute sample, speaker separation, summary/actions).

### Next
- [ ] Add consent screen + legal copy before recording.
- [ ] Add retention controls for raw audio cleanup.
- [ ] Add QA dataset + acceptance test automation.
