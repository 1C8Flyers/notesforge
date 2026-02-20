export type Segment = { text: string; speaker: string; id: string };

export type NotesOutput = {
  summary: string;
  keyPoints: string[];
  actionItems: Array<{
    task: string;
    ownerName: string;
    sourceSegmentId: string;
  }>;
};

export function generateSummary(segments: Segment[]): NotesOutput {
  const joined = segments.map((s) => `${s.speaker}: ${s.text}`).join(" ");
  const summary = joined.length > 0
    ? `## Summary\n${joined.slice(0, 700)}${joined.length > 700 ? "..." : ""}`
    : "## Summary\nNo transcript available.";

  const keyPoints = segments.slice(0, 5).map((segment) => segment.text);
  const actionItems = segments
    .filter((segment) => /\b(will|todo|action|next|by)\b/i.test(segment.text))
    .slice(0, 5)
    .map((segment) => ({
      task: segment.text,
      ownerName: segment.speaker,
      sourceSegmentId: segment.id
    }));

  return { summary, keyPoints, actionItems };
}
