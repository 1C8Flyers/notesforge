import { env } from "../env";
import { ManagedTranscriptionProvider } from "./managed-transcription-provider";
import { MockTranscriptionProvider } from "./mock-transcription-provider";
import { TranscriptionProvider } from "./transcription-provider";

export function createTranscriptionProvider(): TranscriptionProvider {
  if (env.TRANSCRIPTION_PROVIDER === "managed") {
    return new ManagedTranscriptionProvider();
  }

  return new MockTranscriptionProvider();
}
