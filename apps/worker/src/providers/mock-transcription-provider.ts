import { ProviderSegment, TranscriptionProvider } from "./transcription-provider";

export class MockTranscriptionProvider implements TranscriptionProvider {
  async transcribeAndDiarize(_audioUrl: string): Promise<ProviderSegment[]> {
    return [
      {
        speakerLabel: "Speaker 1",
        startMs: 0,
        endMs: 6500,
        text: "Welcome everyone. Let's align on launch timelines.",
        confidence: 0.91
      },
      {
        speakerLabel: "Speaker 2",
        startMs: 6800,
        endMs: 11500,
        text: "Engineering can deliver the API by next Friday.",
        confidence: 0.88
      },
      {
        speakerLabel: "Speaker 1",
        startMs: 11800,
        endMs: 18000,
        text: "Great, let's capture action items and owners.",
        confidence: 0.93
      }
    ];
  }
}
