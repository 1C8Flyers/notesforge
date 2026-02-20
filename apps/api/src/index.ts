import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import { env } from "./env";
import { authRoutes } from "./routes/auth";
import { meetingRoutes } from "./routes/meetings";
import { transcriptRoutes } from "./routes/transcript";
import { notesRoutes } from "./routes/notes";
import { searchRoutes } from "./routes/search";

async function start() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });
  await app.register(jwt, { secret: env.JWT_SECRET });

  app.get("/health", async () => ({ ok: true }));

  await app.register(authRoutes);
  await app.register(meetingRoutes);
  await app.register(transcriptRoutes);
  await app.register(notesRoutes);
  await app.register(searchRoutes);

  try {
    await app.listen({ port: env.API_PORT, host: env.API_HOST });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

void start();
