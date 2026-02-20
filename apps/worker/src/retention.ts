import { query } from "./db";
import { env } from "./env";
import { deleteAudioObject } from "./storage";

type MeetingAudioRow = {
  id: string;
  audio_url: string;
};

function isDeletedAudioUrl(audioUrl: string) {
  return audioUrl.startsWith("deleted://");
}

function toDeletedAudioUrl(audioUrl: string) {
  return `deleted://${audioUrl}`;
}

export async function runAudioRetentionSweep() {
  if (!env.AUDIO_RETENTION_ENABLED) {
    return;
  }

  const candidates = await query<MeetingAudioRow>(
    `select id, audio_url
     from meetings
     where created_at < now() - ($1 || ' days')::interval
       and status in ('completed', 'failed')
       and audio_url not like 'deleted://%'
     order by created_at asc
     limit $2`,
    [String(env.AUDIO_RETENTION_DAYS), env.AUDIO_RETENTION_BATCH_SIZE]
  );

  if (candidates.length === 0) {
    return;
  }

  let deletedCount = 0;

  for (const meeting of candidates) {
    if (!meeting.audio_url || isDeletedAudioUrl(meeting.audio_url)) {
      continue;
    }

    try {
      await deleteAudioObject(meeting.audio_url);
      await query("update meetings set audio_url = $1 where id = $2", [toDeletedAudioUrl(meeting.audio_url), meeting.id]);
      deletedCount += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Audio retention delete failed", { meetingId: meeting.id, message });
    }
  }

  console.log("Audio retention sweep completed", {
    candidates: candidates.length,
    deletedCount,
    retentionDays: env.AUDIO_RETENTION_DAYS
  });
}
