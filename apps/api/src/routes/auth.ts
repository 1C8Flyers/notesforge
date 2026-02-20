import { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { query } from "../db";

type UserRow = { id: string; email: string; password_hash: string };

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/signup", async (request, reply) => {
    const bodySchema = z.object({ email: z.string().email(), password: z.string().min(8) });
    const body = bodySchema.parse(request.body);

    const existing = await query<UserRow>("select id, email, password_hash from users where email = $1", [body.email]);
    if (existing.length > 0) {
      return reply.code(409).send({ error: "Email already exists" });
    }

    const hash = await bcrypt.hash(body.password, 10);
    const created = await query<{ id: string; email: string }>(
      "insert into users(email, password_hash) values($1, $2) returning id, email",
      [body.email, hash]
    );

    const token = await reply.jwtSign({ sub: created[0].id, email: created[0].email });
    return { token, user: created[0] };
  });

  app.post("/auth/login", async (request, reply) => {
    const bodySchema = z.object({ email: z.string().email(), password: z.string().min(8) });
    const body = bodySchema.parse(request.body);

    const users = await query<UserRow>("select id, email, password_hash from users where email = $1", [body.email]);
    const user = users[0];
    if (!user) {
      return reply.code(401).send({ error: "Invalid credentials" });
    }

    const isValid = await bcrypt.compare(body.password, user.password_hash);
    if (!isValid) {
      return reply.code(401).send({ error: "Invalid credentials" });
    }

    const token = await reply.jwtSign({ sub: user.id, email: user.email });
    return { token, user: { id: user.id, email: user.email } };
  });
}
