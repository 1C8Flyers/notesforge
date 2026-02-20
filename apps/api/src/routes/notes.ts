import { FastifyInstance } from "fastify";
import { z } from "zod";
import { query } from "../db";
import { requireAuth } from "../plugins/auth";
import { notesQueue } from "../queue";

type NoteRow = {
  summary_md: string;
  key_points_json: unknown;
  updated_at: string;
};

type ActionItemRow = {
  id: string;
  owner_name: string | null;
  task: string;
  due_date: string | null;
  status: "open" | "done";
  source_segment_id: string | null;
};

export async function notesRoutes(app: FastifyInstance) {
  app.get("/meetings/:id/notes", { preHandler: requireAuth }, async (request, reply) => {
    const user = request.user as { sub: string; email: string };
    const params = z.object({ id: z.string().uuid() }).parse(request.params);

    const owned = await query<{ id: string }>("select id from meetings where id = $1 and user_id = $2", [params.id, user.sub]);
    if (!owned[0]) {
      return reply.code(404).send({ error: "Meeting not found" });
    }

    const notes = await query<NoteRow>("select summary_md, key_points_json, updated_at from meeting_notes where meeting_id = $1", [params.id]);
    const actionItems = await query<ActionItemRow>(
      "select id, owner_name, task, due_date, status, source_segment_id from action_items where meeting_id = $1 order by id asc",
      [params.id]
    );

    return { notes: notes[0] ?? null, actionItems };
  });

  app.post("/meetings/:id/notes/regenerate", { preHandler: requireAuth }, async (request, reply) => {
    const user = request.user as { sub: string; email: string };
    const params = z.object({ id: z.string().uuid() }).parse(request.params);

    const owned = await query<{ id: string }>("select id from meetings where id = $1 and user_id = $2", [params.id, user.sub]);
    if (!owned[0]) {
      return reply.code(404).send({ error: "Meeting not found" });
    }

    await notesQueue.add("generate", { meetingId: params.id }, { attempts: 3, backoff: { type: "exponential", delay: 2000 } });
    return { ok: true };
  });
}
