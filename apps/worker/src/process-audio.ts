import { query } from "./db";
import { createTranscriptionProvider } from "./providers";

type MeetingRow = { id: string; audio_url: string; status: string };
type SpeakerRow = { id: string; label: string };

export async function processMeetingAudio(meetingId: string) {
  const meeting = await query<MeetingRow>("select id, audio_url, status from meetings where id = $1", [meetingId]);
  if (!meeting[0]) {
    return;
  }

  const existingSegments = await query<{ count: string }>(
    "select count(*)::text as count from transcript_segments where meeting_id = $1",
    [meetingId]
  );
  if (Number(existingSegments[0].count) > 0) {
    await query("update meetings set status = 'completed' where id = $1", [meetingId]);
    return;
  }

  await query("update meetings set status = 'processing' where id = $1", [meetingId]);

  const provider = createTranscriptionProvider();
  const segments = await provider.transcribeAndDiarize(meeting[0].audio_url);

  const speakerMap = new Map<string, string>();
  for (const segment of segments) {
    if (!speakerMap.has(segment.speakerLabel)) {
      const inserted = await query<SpeakerRow>(
        "insert into speakers(meeting_id, label, display_name) values($1, $2, $3) returning id, label",
        [meetingId, segment.speakerLabel, segment.speakerLabel]
      );
      speakerMap.set(segment.speakerLabel, inserted[0].id);
    }
  }

  for (const segment of segments) {
    await query(
      `insert into transcript_segments(meeting_id, speaker_id, start_ms, end_ms, text, confidence)
       values($1, $2, $3, $4, $5, $6)`,
      [meetingId, speakerMap.get(segment.speakerLabel) ?? null, segment.startMs, segment.endMs, segment.text, segment.confidence ?? null]
    );
  }

  await query("update meetings set status = 'completed' where id = $1", [meetingId]);
}
