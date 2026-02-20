import { z } from "zod";
import { env } from "./env";
import { generateSummary, NotesOutput, Segment } from "./notes";

const ollamaResultSchema = z.object({
  summaryMd: z.string().min(1),
  keyPoints: z.array(z.string()).default([]),
  actionItems: z
    .array(
      z.object({
        task: z.string().min(1),
        ownerName: z.string().default("Unassigned")
      })
    )
    .default([])
});

function formatTranscriptForPrompt(segments: Segment[]) {
  return segments
    .slice(0, 400)
    .map((segment, index) => `[${index + 1}] ${segment.speaker}: ${segment.text}`)
    .join("\n");
}

async function generateWithOllama(segments: Segment[]): Promise<NotesOutput> {
  const transcript = formatTranscriptForPrompt(segments);

  const prompt = [
    "You are an assistant generating concise meeting notes.",
    "Return strict JSON only with keys: summaryMd, keyPoints, actionItems.",
    "actionItems must be an array of objects with keys: task, ownerName.",
    "Do not include markdown code fences.",
    "Transcript:",
    transcript
  ].join("\n\n");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.OLLAMA_TIMEOUT_MS);

  try {
    const response = await fetch(env.OLLAMA_ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: env.OLLAMA_MODEL,
        prompt,
        stream: false,
        format: "json"
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Ollama notes failed: ${response.status} ${body}`);
    }

    const raw = (await response.json()) as { response?: string };
    const parsed = ollamaResultSchema.parse(JSON.parse(raw.response ?? "{}"));

    return {
      summary: parsed.summaryMd,
      keyPoints: parsed.keyPoints,
      actionItems: parsed.actionItems.map((item) => ({
        task: item.task,
        ownerName: item.ownerName,
        sourceSegmentId: ""
      }))
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateMeetingNotes(segments: Segment[]): Promise<NotesOutput> {
  if (env.LOCAL_NOTES_PROVIDER !== "ollama") {
    return generateSummary(segments);
  }

  try {
    return await generateWithOllama(segments);
  } catch (error) {
    console.error("Ollama notes generation failed, falling back to heuristic notes", {
      message: error instanceof Error ? error.message : String(error)
    });
    return generateSummary(segments);
  }
}
