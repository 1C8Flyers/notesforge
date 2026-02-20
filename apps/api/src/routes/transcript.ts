import { FastifyInstance } from "fastify";
import { z } from "zod";
import { query } from "../db";
import { requireAuth } from "../plugins/auth";

type SpeakerRow = { id: string; label: string; display_name: string | null };
type SegmentRow = {
  id: string;
  speaker_id: string | null;
  start_ms: number;
  end_ms: number;
  text: string;
  confidence: number | null;
};

export async function transcriptRoutes(app: FastifyInstance) {
  app.get("/meetings/:id/transcript", { preHandler: requireAuth }, async (request, reply) => {
    const user = request.user as { sub: string; email: string };
    const params = z.object({ id: z.string().uuid() }).parse(request.params);

    const owned = await query<{ id: string }>("select id from meetings where id = $1 and user_id = $2", [params.id, user.sub]);
    if (!owned[0]) {
      return reply.code(404).send({ error: "Meeting not found" });
    }

    const speakers = await query<SpeakerRow>(
      "select id, label, display_name from speakers where meeting_id = $1 order by label asc",
      [params.id]
    );
    const segments = await query<SegmentRow>(
      "select id, speaker_id, start_ms, end_ms, text, confidence from transcript_segments where meeting_id = $1 order by start_ms asc",
      [params.id]
    );

    return { speakers, segments };
  });

  app.patch("/meetings/:id/speakers/:speakerId", { preHandler: requireAuth }, async (request, reply) => {
    const user = request.user as { sub: string; email: string };
    const params = z.object({ id: z.string().uuid(), speakerId: z.string().uuid() }).parse(request.params);
    const body = z.object({ displayName: z.string().min(1).max(80) }).parse(request.body);

    const updated = await query<SpeakerRow>(
      `update speakers s
       set display_name = $1
       from meetings m
       where s.id = $2 and s.meeting_id = m.id and m.id = $3 and m.user_id = $4
       returning s.id, s.label, s.display_name`,
      [body.displayName, params.speakerId, params.id, user.sub]
    );

    if (!updated[0]) {
      return reply.code(404).send({ error: "Speaker not found" });
    }

    return updated[0];
  });

  app.patch("/meetings/:id/segments/:segmentId", { preHandler: requireAuth }, async (request, reply) => {
    const user = request.user as { sub: string; email: string };
    const params = z.object({ id: z.string().uuid(), segmentId: z.string().uuid() }).parse(request.params);
    const body = z.object({ text: z.string().min(1) }).parse(request.body);

    const updated = await query<{ id: string; text: string }>(
      `update transcript_segments ts
       set text = $1
       from meetings m
       where ts.id = $2 and ts.meeting_id = m.id and m.id = $3 and m.user_id = $4
       returning ts.id, ts.text`,
      [body.text, params.segmentId, params.id, user.sub]
    );

    if (!updated[0]) {
      return reply.code(404).send({ error: "Segment not found" });
    }

    return updated[0];
  });
}
