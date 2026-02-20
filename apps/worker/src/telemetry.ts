type JobType = "process_meeting_audio" | "generate_meeting_notes";

type Metric = {
  completed: number;
  failed: number;
  totalDurationMs: number;
};

const metrics: Record<JobType, Metric> = {
  process_meeting_audio: { completed: 0, failed: 0, totalDurationMs: 0 },
  generate_meeting_notes: { completed: 0, failed: 0, totalDurationMs: 0 }
};

export function recordJobSuccess(type: JobType, durationMs: number) {
  metrics[type].completed += 1;
  metrics[type].totalDurationMs += durationMs;
}

export function recordJobFailure(type: JobType, durationMs: number) {
  metrics[type].failed += 1;
  metrics[type].totalDurationMs += durationMs;
}

export function getTelemetrySnapshot() {
  return Object.fromEntries(
    Object.entries(metrics).map(([type, metric]) => {
      const attempts = metric.completed + metric.failed;
      const failureRate = attempts === 0 ? 0 : metric.failed / attempts;
      const avgDurationMs = attempts === 0 ? 0 : Math.round(metric.totalDurationMs / attempts);
      return [type, { ...metric, attempts, failureRate, avgDurationMs }];
    })
  );
}
