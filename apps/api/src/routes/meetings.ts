import { FastifyInstance } from "fastify";
import { z } from "zod";
import { query } from "../db";
import { requireAuth } from "../plugins/auth";
import { audioQueue } from "../queue";
import { buildAudioObjectKey, createPresignedAudioUpload } from "../storage";

type MeetingRow = {
  id: string;
  title: string;
  status: "uploaded" | "processing" | "completed" | "failed";
  created_at: string;
  started_at: string | null;
  duration_sec: number | null;
  audio_url: string;
};

export async function meetingRoutes(app: FastifyInstance) {
  app.post("/meetings", { preHandler: requireAuth }, async (request) => {
    const user = request.user as { sub: string; email: string };
    const bodySchema = z.object({
      title: z.string().min(1).default("Untitled meeting"),
      startedAt: z.string().datetime().optional(),
      durationSec: z.number().int().positive().optional(),
      fileName: z.string().min(1),
      contentType: z.string().default("audio/m4a")
    });
    const body = bodySchema.parse(request.body);
    const audioObjectKey = buildAudioObjectKey(user.sub, body.fileName);
    const upload = await createPresignedAudioUpload({
      key: audioObjectKey,
      contentType: body.contentType
    });

    const created = await query<MeetingRow>(
      `insert into meetings(user_id, title, audio_url, status, started_at, duration_sec)
       values($1, $2, $3, 'uploaded', $4, $5)
       returning id, title, status, created_at, started_at, duration_sec, audio_url`,
      [user.sub, body.title, audioObjectKey, body.startedAt ?? null, body.durationSec ?? null]
    );

    return {
      meeting: created[0],
      upload
    };
  });

  app.post("/meetings/:id/complete-upload", { preHandler: requireAuth }, async (request, reply) => {
    const user = request.user as { sub: string; email: string };
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const meeting = await query<MeetingRow>("select * from meetings where id = $1 and user_id = $2", [params.id, user.sub]);
    if (!meeting[0]) {
      return reply.code(404).send({ error: "Meeting not found" });
    }

    await query("update meetings set status = 'processing' where id = $1", [params.id]);
    await audioQueue.add("process", { meetingId: params.id }, { attempts: 3, backoff: { type: "exponential", delay: 2000 } });

    return { ok: true, status: "processing" };
  });

  app.get("/meetings", { preHandler: requireAuth }, async (request) => {
    const user = request.user as { sub: string; email: string };
    return query<MeetingRow>(
      "select id, title, status, created_at, started_at, duration_sec, audio_url from meetings where user_id = $1 order by created_at desc",
      [user.sub]
    );
  });

  app.get("/meetings/:id", { preHandler: requireAuth }, async (request, reply) => {
    const user = request.user as { sub: string; email: string };
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const meeting = await query<MeetingRow>(
      "select id, title, status, created_at, started_at, duration_sec, audio_url from meetings where id = $1 and user_id = $2",
      [params.id, user.sub]
    );

    if (!meeting[0]) {
      return reply.code(404).send({ error: "Meeting not found" });
    }

    return meeting[0];
  });
}
