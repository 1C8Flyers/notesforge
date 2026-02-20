import { query } from "./db";
import { generateMeetingNotes } from "./notes-provider";

type SegmentRow = {
  id: string;
  text: string;
  speaker: string;
};

export async function processMeetingNotes(meetingId: string) {
  const segments = await query<SegmentRow>(
    `select ts.id, ts.text, coalesce(s.display_name, s.label, 'Unknown') as speaker
     from transcript_segments ts
     left join speakers s on s.id = ts.speaker_id
     where ts.meeting_id = $1
     order by ts.start_ms asc`,
    [meetingId]
  );

  const output = await generateMeetingNotes(segments);

  await query(
    `insert into meeting_notes(meeting_id, summary_md, key_points_json, updated_at)
     values($1, $2, $3::jsonb, now())
     on conflict (meeting_id)
     do update set summary_md = excluded.summary_md, key_points_json = excluded.key_points_json, updated_at = now()`,
    [meetingId, output.summary, JSON.stringify(output.keyPoints)]
  );

  await query("delete from action_items where meeting_id = $1", [meetingId]);

  for (const actionItem of output.actionItems) {
    await query(
      `insert into action_items(meeting_id, owner_name, task, status, source_segment_id)
       values($1, $2, $3, 'open', $4)`,
      [meetingId, actionItem.ownerName || null, actionItem.task, actionItem.sourceSegmentId || null]
    );
  }
}
