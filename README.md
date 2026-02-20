# NoteForge MVP

Minimalist AI meeting notes app (Obsidian-style dark UI) with:
- Mobile recording + upload flow (Expo)
- API (Fastify + TypeScript)
- Worker (BullMQ) for transcription + notes generation
- PostgreSQL + Redis via Docker Compose

## Monorepo layout

- `apps/mobile` - React Native + Expo app
- `apps/api` - Fastify API service
- `apps/worker` - Background worker

## Quick start

1. Copy env file:
   - `cp .env.example .env`
2. Start infrastructure:
   - `docker compose up -d`
3. Install dependencies:
   - `npm install`
4. Run migration:
   - `psql postgres://postgres:postgres@localhost:5432/noteforge -f apps/api/migrations/001_init.sql`
5. Start services in separate terminals:
   - `npm run dev:api`
   - `npm run dev:worker`
   - `npm run dev:mobile`

## Notes

- API upload flow now returns real S3-compatible presigned PUT URLs.
- Worker supports `TRANSCRIPTION_PROVIDER=mock|managed` through the `TranscriptionProvider` abstraction.
- Managed mode currently integrates with Deepgram (`DEEPGRAM_API_KEY`) and uses S3 presigned GET URLs for source audio.
- Worker also supports local notes generation via Ollama (`LOCAL_NOTES_PROVIDER=ollama`) with automatic fallback to heuristic notes generation.

## Local-first setup (offline-leaning)

1. In `.env`, set worker mode and local endpoints:
   - `TRANSCRIPTION_PROVIDER=local`
   - `LOCAL_ASR_ENDPOINT=http://localhost:<port>/transcribe`
   - `LOCAL_NOTES_PROVIDER=ollama`
   - `OLLAMA_ENDPOINT=http://localhost:11434/api/generate`
   - `OLLAMA_MODEL=llama3.1`

2. Start a local ASR+diarization service that accepts:
   - `POST /transcribe`
   - Body: `{ "audioUrl": "<signed-audio-url>" }`
   - Response: `{ "segments": [{ "speakerLabel": "Speaker 1", "startMs": 0, "endMs": 1200, "text": "...", "confidence": 0.9 }] }`

3. Start Ollama and pull a model:
   - `ollama pull llama3.1`

4. Start app services:
   - `npm run dev:api`
   - `npm run dev:worker`

If Ollama is unavailable, worker logs an error and automatically falls back to heuristic notes generation.

## Smoke acceptance checks

Run automated API checks (requires API + worker + Postgres + Redis running):

- `npm run qa:smoke`

This verifies:
- meeting processing reaches `completed`
- transcript segments exist
- notes summary exists
- search endpoint responds
- user isolation blocks cross-user meeting access
