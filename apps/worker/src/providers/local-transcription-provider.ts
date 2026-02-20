import { env } from "../env";
import { createPresignedAudioDownloadUrl } from "../storage";
import { ProviderSegment, TranscriptionProvider } from "./transcription-provider";

type LocalAsrSegment = {
  speakerLabel: string;
  startMs: number;
  endMs: number;
  text: string;
  confidence?: number;
};

type LocalAsrResponse = {
  segments: LocalAsrSegment[];
};

export class LocalTranscriptionProvider implements TranscriptionProvider {
  async transcribeAndDiarize(audioObjectKey: string): Promise<ProviderSegment[]> {
    if (!env.LOCAL_ASR_ENDPOINT) {
      throw new Error("Missing LOCAL_ASR_ENDPOINT for local transcription provider.");
    }

    const audioUrl = await createPresignedAudioDownloadUrl(audioObjectKey);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), env.LOCAL_ASR_TIMEOUT_MS);

    try {
      const response = await fetch(env.LOCAL_ASR_ENDPOINT, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(env.LOCAL_ASR_API_KEY ? { authorization: `Bearer ${env.LOCAL_ASR_API_KEY}` } : {})
        },
        body: JSON.stringify({ audioUrl }),
        signal: controller.signal
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Local ASR failed: ${response.status} ${body}`);
      }

      const payload = (await response.json()) as LocalAsrResponse;
      return (payload.segments ?? []).map((segment) => ({
        speakerLabel: segment.speakerLabel,
        startMs: segment.startMs,
        endMs: segment.endMs,
        text: segment.text,
        confidence: segment.confidence
      }));
    } finally {
      clearTimeout(timeout);
    }
  }
}
