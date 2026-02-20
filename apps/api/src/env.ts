import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ path: "../../.env" });

const envSchema = z.object({
	API_PORT: z.coerce.number().default(4000),
	API_HOST: z.string().default("0.0.0.0"),
	JWT_SECRET: z.string().min(16),
	DATABASE_URL: z.string().url().or(z.string().startsWith("postgres://")),
	REDIS_URL: z.string().startsWith("redis://"),
	S3_ENDPOINT: z.string().url().optional(),
	S3_REGION: z.string().default("us-east-1"),
	S3_BUCKET: z.string().min(3),
	S3_ACCESS_KEY_ID: z.string().min(1),
	S3_SECRET_ACCESS_KEY: z.string().min(1),
	S3_FORCE_PATH_STYLE: z.coerce.boolean().default(true),
	S3_SIGNED_UPLOAD_EXPIRES_SEC: z.coerce.number().int().positive().default(900)
});

export const env = envSchema.parse(process.env);