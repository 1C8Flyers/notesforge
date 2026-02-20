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
2. Start full stack in Docker (Postgres, Redis, migrations, API, worker):
   - `docker compose up -d --build`
3. Install dependencies:
   - `npm install`
4. Start mobile app in separate terminal:
   - `npm run dev:mobile -- --web`

Note: API and worker already run in Docker after step 2.

## Docker deployment notes

- Default exposed ports:
  - API: `4000`
  - Postgres: `5432`
  - Redis: `6379`
- To avoid host port conflicts (e.g., on NAS), set:
  - `POSTGRES_HOST_PORT=55432`
  - `REDIS_HOST_PORT=56379`
  - `API_HOST_PORT=4000`

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
