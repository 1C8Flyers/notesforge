create extension if not exists "pgcrypto";

do $$ begin
  create type meeting_status as enum ('uploaded', 'processing', 'completed', 'failed');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type action_item_status as enum ('open', 'done');
exception when duplicate_object then null;
end $$;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists meetings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  audio_url text not null,
  duration_sec int,
  status meeting_status not null default 'uploaded',
  started_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists speakers (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references meetings(id) on delete cascade,
  label text not null,
  display_name text
);

create table if not exists transcript_segments (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references meetings(id) on delete cascade,
  speaker_id uuid references speakers(id) on delete set null,
  start_ms int not null,
  end_ms int not null,
  text text not null,
  confidence real,
  created_at timestamptz not null default now()
);

create table if not exists meeting_notes (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid unique not null references meetings(id) on delete cascade,
  summary_md text not null,
  key_points_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists action_items (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references meetings(id) on delete cascade,
  owner_name text,
  task text not null,
  due_date date,
  status action_item_status not null default 'open',
  source_segment_id uuid references transcript_segments(id) on delete set null
);

create index if not exists idx_transcript_segments_meeting_start on transcript_segments(meeting_id, start_ms);
create index if not exists idx_meetings_user_created_desc on meetings(user_id, created_at desc);
create index if not exists idx_action_items_meeting_status on action_items(meeting_id, status);
