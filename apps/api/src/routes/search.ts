import { FastifyInstance } from "fastify";
import { z } from "zod";
import { query } from "../db";
import { requireAuth } from "../plugins/auth";

type SearchResult = {
  segment_id: string;
  meeting_id: string;
  title: string;
  start_ms: number;
  end_ms: number;
  text: string;
};

export async function searchRoutes(app: FastifyInstance) {
  app.get("/search", { preHandler: requireAuth }, async (request) => {
    const user = request.user as { sub: string; email: string };
    const { q } = z.object({ q: z.string().min(2) }).parse(request.query);

    return query<SearchResult>(
      `select ts.id as segment_id, m.id as meeting_id, m.title, ts.start_ms, ts.end_ms, ts.text
       from transcript_segments ts
       inner join meetings m on m.id = ts.meeting_id
       where m.user_id = $1 and ts.text ilike $2
       order by m.created_at desc, ts.start_ms asc
       limit 100`,
      [user.sub, `%${q}%`]
    );
  });
}
