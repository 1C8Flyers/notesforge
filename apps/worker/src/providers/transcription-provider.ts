export type ProviderSegment = {
  speakerLabel: string;
  startMs: number;
  endMs: number;
  text: string;
  confidence?: number;
};

export interface TranscriptionProvider {
  transcribeAndDiarize(audioUrl: string): Promise<ProviderSegment[]>;
}
