import { env } from "../env";
import { createPresignedAudioDownloadUrl } from "../storage";
import { ProviderSegment, TranscriptionProvider } from "./transcription-provider";

type DeepgramUtterance = {
  start: number;
  end: number;
  transcript: string;
  speaker: number;
  confidence?: number;
};

type DeepgramResponse = {
  results?: {
    utterances?: DeepgramUtterance[];
  };
};

export class ManagedTranscriptionProvider implements TranscriptionProvider {
  async transcribeAndDiarize(audioObjectKey: string): Promise<ProviderSegment[]> {
    if (!env.DEEPGRAM_API_KEY) {
      throw new Error("Missing DEEPGRAM_API_KEY for managed transcription provider.");
    }

    const audioUrl = await createPresignedAudioDownloadUrl(audioObjectKey);

    const query = new URLSearchParams({
      model: env.DEEPGRAM_MODEL,
      diarize: "true",
      punctuate: "true",
      smart_format: "true",
      utterances: "true"
    });

    if (env.DEEPGRAM_LANGUAGE) {
      query.set("language", env.DEEPGRAM_LANGUAGE);
    }

    const response = await fetch(`https://api.deepgram.com/v1/listen?${query.toString()}`, {
      method: "POST",
      headers: {
        authorization: `Token ${env.DEEPGRAM_API_KEY}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({ url: audioUrl })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Deepgram transcription failed: ${response.status} ${errorBody}`);
    }

    const data = (await response.json()) as DeepgramResponse;
    const utterances = data.results?.utterances ?? [];

    if (utterances.length === 0) {
      return [];
    }

    return utterances.map((utterance) => ({
      speakerLabel: `Speaker ${utterance.speaker + 1}`,
      startMs: Math.round(utterance.start * 1000),
      endMs: Math.round(utterance.end * 1000),
      text: utterance.transcript,
      confidence: utterance.confidence
    }));
  }
}
