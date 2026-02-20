import { Queue } from "bullmq";
import { env } from "./env";

const connection = { url: env.REDIS_URL };

export const audioQueue = new Queue("process_meeting_audio", { connection });
export const notesQueue = new Queue("generate_meeting_notes", { connection });
