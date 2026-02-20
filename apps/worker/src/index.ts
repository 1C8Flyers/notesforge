import { Worker } from "bullmq";
import { env } from "./env";
import { processMeetingAudio } from "./process-audio";
import { processMeetingNotes } from "./process-notes";
import { runAudioRetentionSweep } from "./retention";
import { getTelemetrySnapshot, recordJobFailure, recordJobSuccess } from "./telemetry";

const connection = { url: env.REDIS_URL };

const audioWorker = new Worker(
  "process_meeting_audio",
  async (job) => {
    const started = Date.now();
    await processMeetingAudio(job.data.meetingId);
    await processMeetingNotes(job.data.meetingId);
    recordJobSuccess("process_meeting_audio", Date.now() - started);
  },
  { connection }
);

const notesWorker = new Worker(
  "generate_meeting_notes",
  async (job) => {
    const started = Date.now();
    await processMeetingNotes(job.data.meetingId);
    recordJobSuccess("generate_meeting_notes", Date.now() - started);
  },
  { connection }
);

audioWorker.on("failed", (job, error) => {
  const durationMs = job?.processedOn && job?.timestamp ? Math.max(0, job.processedOn - job.timestamp) : 0;
  recordJobFailure("process_meeting_audio", durationMs);
  console.error("Audio job failed", { id: job?.id, error: error.message });
});

notesWorker.on("failed", (job, error) => {
  const durationMs = job?.processedOn && job?.timestamp ? Math.max(0, job.processedOn - job.timestamp) : 0;
  recordJobFailure("generate_meeting_notes", durationMs);
  console.error("Notes job failed", { id: job?.id, error: error.message });
});

setInterval(() => {
  console.log("Worker telemetry", getTelemetrySnapshot());
}, 60_000);

if (env.AUDIO_RETENTION_ENABLED) {
  const runSweep = async () => {
    try {
      await runAudioRetentionSweep();
    } catch (error) {
      console.error("Audio retention sweep crashed", {
        message: error instanceof Error ? error.message : String(error)
      });
    }
  };

  void runSweep();
  setInterval(() => {
    void runSweep();
  }, env.AUDIO_RETENTION_SWEEP_MINUTES * 60_000);
}

console.log("Worker online");
