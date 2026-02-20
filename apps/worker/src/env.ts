import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ path: "../../.env" });

const envSchema = z.object({
  DATABASE_URL: z.string().url().or(z.string().startsWith("postgres://")),
  REDIS_URL: z.string().startsWith("redis://"),
  TRANSCRIPTION_PROVIDER: z.enum(["mock", "managed", "local"]).default("mock"),
  S3_ENDPOINT: z.string().url().optional(),
  S3_REGION: z.string().default("us-east-1"),
  S3_BUCKET: z.string().min(3).optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_FORCE_PATH_STYLE: z.coerce.boolean().default(true),
  S3_SIGNED_DOWNLOAD_EXPIRES_SEC: z.coerce.number().int().positive().default(900),
  AUDIO_RETENTION_ENABLED: z.coerce.boolean().default(false),
  AUDIO_RETENTION_DAYS: z.coerce.number().int().positive().default(30),
  AUDIO_RETENTION_SWEEP_MINUTES: z.coerce.number().int().positive().default(60),
  AUDIO_RETENTION_BATCH_SIZE: z.coerce.number().int().positive().default(100),
  DEEPGRAM_API_KEY: z.string().optional(),
  DEEPGRAM_MODEL: z.string().default("nova-2"),
  DEEPGRAM_LANGUAGE: z.string().optional(),
  LOCAL_ASR_ENDPOINT: z.string().url().optional(),
  LOCAL_ASR_API_KEY: z.string().optional(),
  LOCAL_ASR_TIMEOUT_MS: z.coerce.number().int().positive().default(120000),
  LOCAL_NOTES_PROVIDER: z.enum(["heuristic", "ollama"]).default("heuristic"),
  OLLAMA_ENDPOINT: z.string().url().default("http://localhost:11434/api/generate"),
  OLLAMA_MODEL: z.string().default("llama3.1"),
  OLLAMA_TIMEOUT_MS: z.coerce.number().int().positive().default(120000)
});

export const env = envSchema.parse(process.env);
