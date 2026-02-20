const API_URL =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.EXPO_PUBLIC_API_URL ??
  "http://localhost:4000";

export type ApiClient = ReturnType<typeof createApiClient>;

export function createApiClient(token: string | null) {
  async function call(path: string, init?: RequestInit) {
    const response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(init?.headers ?? {})
      }
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || `Request failed: ${response.status}`);
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  }

  return {
    signup: (email: string, password: string) => call("/auth/signup", { method: "POST", body: JSON.stringify({ email, password }) }),
    login: (email: string, password: string) => call("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
    listMeetings: () => call("/meetings"),
    createMeeting: (input: { title: string; fileName: string; contentType: string; durationSec?: number }) =>
      call("/meetings", { method: "POST", body: JSON.stringify(input) }),
    completeUpload: (meetingId: string) => call(`/meetings/${meetingId}/complete-upload`, { method: "POST" }),
    getMeeting: (meetingId: string) => call(`/meetings/${meetingId}`),
    getTranscript: (meetingId: string) => call(`/meetings/${meetingId}/transcript`),
    renameSpeaker: (meetingId: string, speakerId: string, displayName: string) =>
      call(`/meetings/${meetingId}/speakers/${speakerId}`, { method: "PATCH", body: JSON.stringify({ displayName }) }),
    getNotes: (meetingId: string) => call(`/meetings/${meetingId}/notes`)
  };
}
