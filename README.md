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
