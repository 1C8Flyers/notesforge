import { StatusBar } from "expo-status-bar";
import { Audio } from "expo-av";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { createApiClient } from "./src/api";

type Meeting = {
  id: string;
  title: string;
  status: "uploaded" | "processing" | "completed" | "failed";
  created_at: string;
};

type TranscriptResponse = {
  speakers: Array<{ id: string; label: string; display_name: string | null }>;
  segments: Array<{ id: string; speaker_id: string | null; start_ms: number; end_ms: number; text: string }>;
};

type NotesResponse = {
  notes: { summary_md: string; key_points_json: string[] } | null;
  actionItems: Array<{ id: string; owner_name: string | null; task: string; status: string }>;
};

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState("demo@noteforge.app");
  const [password, setPassword] = useState("password123");
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptResponse | null>(null);
  const [notes, setNotes] = useState<NotesResponse | null>(null);
  const [speakerDrafts, setSpeakerDrafts] = useState<Record<string, string>>({});
  const [title, setTitle] = useState("Weekly sync");
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [consentAcceptedAt, setConsentAcceptedAt] = useState<string | null>(null);
  const [showConsentPrompt, setShowConsentPrompt] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const api = useMemo(() => createApiClient(token), [token]);

  useEffect(() => {
    if (!token) {
      return;
    }

    void refreshMeetings();
  }, [token]);

  async function refreshMeetings() {
    setLoading(true);
    try {
      const response = await api.listMeetings();
      setMeetings(response);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function authenticate(mode: "login" | "signup") {
    setError(null);
    setLoading(true);
    try {
      const response = mode === "login" ? await api.login(email, password) : await api.signup(email, password);
      setToken(response.token);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function beginRecording() {
    setError(null);
    const permission = await Audio.requestPermissionsAsync();
    if (!permission.granted) {
      setError("Microphone permission is required.");
      return;
    }

    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    const nextRecording = new Audio.Recording();
    await nextRecording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    await nextRecording.startAsync();
    setRecording(nextRecording);
  }

  async function startRecording() {
    if (!consentAcceptedAt) {
      setShowConsentPrompt(true);
      return;
    }

    await beginRecording();
  }

  async function acceptConsentAndRecord() {
    if (!consentAcceptedAt) {
      setConsentAcceptedAt(new Date().toISOString());
    }
    setShowConsentPrompt(false);
    await beginRecording();
  }

  async function stopRecording() {
    if (!recording) {
      return;
    }

    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setAudioUri(uri ?? null);
    setRecording(null);
  }

  async function uploadAndProcess() {
    if (!audioUri || !title) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const createResult = await api.createMeeting({
        title,
        fileName: "meeting.m4a",
        contentType: "audio/m4a"
      });

      try {
        const fileResponse = await fetch(audioUri);
        const blob = await fileResponse.blob();
        await fetch(createResult.upload.uploadUrl, {
          method: createResult.upload.method,
          headers: createResult.upload.headers,
          body: blob
        });
      } catch {
        // Local fallback for dev mode where upload URL is mocked.
      }

      await api.completeUpload(createResult.meeting.id);
      setSelectedMeetingId(createResult.meeting.id);
      await refreshMeetings();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function openMeeting(meetingId: string) {
    setSelectedMeetingId(meetingId);
    setLoading(true);
    setError(null);

    try {
      const [transcriptResponse, notesResponse] = await Promise.all([
        api.getTranscript(meetingId),
        api.getNotes(meetingId)
      ]);
      setTranscript(transcriptResponse);
      setSpeakerDrafts(
        Object.fromEntries(
          transcriptResponse.speakers.map((speaker: { id: string; label: string; display_name: string | null }) => [
            speaker.id,
            speaker.display_name ?? speaker.label
          ])
        )
      );
      setNotes(notesResponse);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function renameSpeaker(speakerId: string) {
    if (!selectedMeetingId) {
      return;
    }

    const nextName = speakerDrafts[speakerId]?.trim();
    if (!nextName) {
      return;
    }

    await api.renameSpeaker(selectedMeetingId, speakerId, nextName);
    await openMeeting(selectedMeetingId);
  }

  if (!token) {
    return (
      <SafeAreaView style={styles.screen}>
        <StatusBar style="light" />
        <Text style={styles.h1}>NoteForge</Text>
        <Text style={styles.subtle}>Minimal meeting notes for teams.</Text>
        <TextInput placeholder="Email" placeholderTextColor="#666" style={styles.input} value={email} onChangeText={setEmail} />
        <TextInput
          placeholder="Password"
          placeholderTextColor="#666"
          style={styles.input}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <View style={styles.row}>
          <Pressable style={styles.button} onPress={() => authenticate("login")}>
            <Text style={styles.buttonText}>Log in</Text>
          </Pressable>
          <Pressable style={styles.buttonGhost} onPress={() => authenticate("signup")}>
            <Text style={styles.buttonGhostText}>Sign up</Text>
          </Pressable>
        </View>
        {loading && <ActivityIndicator color="#9ca3af" />}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.h1}>Meetings</Text>

        <View style={styles.card}>
          <Text style={styles.h2}>Record</Text>
          {showConsentPrompt || !consentAcceptedAt ? (
            <View style={styles.consentBox}>
              <Text style={styles.consentText}>
                By recording, you confirm participants were informed and consented where required by law.
              </Text>
              <Text style={styles.consentMeta}>
                This consent is session-scoped in MVP and should be legally reviewed before production launch.
              </Text>
              <Pressable style={styles.buttonGhost} onPress={acceptConsentAndRecord}>
                <Text style={styles.buttonGhostText}>I consent · Start recording</Text>
              </Pressable>
            </View>
          ) : (
            <Text style={styles.consentMeta}>Consent accepted at {new Date(consentAcceptedAt).toLocaleString()}.</Text>
          )}
          <TextInput placeholder="Meeting title" placeholderTextColor="#666" style={styles.input} value={title} onChangeText={setTitle} />
          <View style={styles.row}>
            <Pressable style={styles.button} onPress={recording ? stopRecording : startRecording}>
              <Text style={styles.buttonText}>{recording ? "Stop" : "Record"}</Text>
            </Pressable>
            <Pressable style={styles.buttonGhost} onPress={uploadAndProcess}>
              <Text style={styles.buttonGhostText}>Upload</Text>
            </Pressable>
          </View>
          <Text style={styles.subtle}>{audioUri ? "Audio ready" : "No audio recorded yet"}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.rowSpace}>
            <Text style={styles.h2}>My meetings</Text>
            <Pressable onPress={refreshMeetings}>
              <Text style={styles.link}>Refresh</Text>
            </Pressable>
          </View>
          {meetings.map((meeting) => (
            <Pressable key={meeting.id} style={styles.item} onPress={() => openMeeting(meeting.id)}>
              <Text style={styles.itemTitle}>{meeting.title}</Text>
              <Text style={styles.subtle}>{meeting.status}</Text>
            </Pressable>
          ))}
        </View>

        {selectedMeetingId && transcript && (
          <View style={styles.card}>
            <Text style={styles.h2}>Transcript</Text>
            {transcript.speakers.map((speaker) => (
              <View key={speaker.id} style={styles.speakerRow}>
                <TextInput
                  style={styles.input}
                  placeholder={speaker.label}
                  placeholderTextColor="#666"
                  value={speakerDrafts[speaker.id] ?? speaker.display_name ?? speaker.label}
                  onChangeText={(value) =>
                    setSpeakerDrafts((prev) => ({
                      ...prev,
                      [speaker.id]: value
                    }))
                  }
                />
                <Pressable style={styles.buttonGhost} onPress={() => renameSpeaker(speaker.id)}>
                  <Text style={styles.buttonGhostText}>Save</Text>
                </Pressable>
              </View>
            ))}
            {transcript.segments.map((segment) => {
              const speaker = transcript.speakers.find((s) => s.id === segment.speaker_id);
              return (
                <View key={segment.id} style={styles.segment}>
                  <Text style={styles.segmentMeta}>
                    {speaker?.display_name ?? speaker?.label ?? "Unknown"} · {(segment.start_ms / 1000).toFixed(1)}s
                  </Text>
                  <Text style={styles.segmentText}>{segment.text}</Text>
                </View>
              );
            })}
          </View>
        )}

        {notes && (
          <View style={styles.card}>
            <Text style={styles.h2}>Notes</Text>
            <Text style={styles.segmentText}>{notes.notes?.summary_md ?? "Not generated yet."}</Text>
            <Text style={styles.h2}>Action items</Text>
            {notes.actionItems.length === 0 ? <Text style={styles.subtle}>No actions yet.</Text> : null}
            {notes.actionItems.map((item) => (
              <View key={item.id} style={styles.segment}>
                <Text style={styles.segmentMeta}>{item.owner_name ?? "Unassigned"}</Text>
                <Text style={styles.segmentText}>{item.task}</Text>
              </View>
            ))}
          </View>
        )}

        {loading && <ActivityIndicator color="#9ca3af" />}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#111111"
  },
  content: {
    padding: 16,
    gap: 12
  },
  h1: {
    color: "#f5f5f5",
    fontSize: 30,
    fontWeight: "700"
  },
  h2: {
    color: "#f5f5f5",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8
  },
  subtle: {
    color: "#9ca3af"
  },
  card: {
    backgroundColor: "#171717",
    borderColor: "#262626",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    gap: 8
  },
  consentBox: {
    borderColor: "#3f3f46",
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    gap: 8,
    backgroundColor: "#141414"
  },
  consentText: {
    color: "#e4e4e7",
    lineHeight: 20
  },
  consentMeta: {
    color: "#a1a1aa",
    fontSize: 12,
    lineHeight: 18
  },
  row: {
    flexDirection: "row",
    gap: 8
  },
  rowSpace: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  button: {
    backgroundColor: "#27272a",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  buttonGhost: {
    borderColor: "#3f3f46",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  buttonText: {
    color: "#f5f5f5",
    fontWeight: "600"
  },
  buttonGhostText: {
    color: "#d4d4d8"
  },
  input: {
    borderColor: "#3f3f46",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: "#f5f5f5"
  },
  item: {
    borderColor: "#262626",
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    gap: 4
  },
  itemTitle: {
    color: "#f4f4f5",
    fontSize: 15,
    fontWeight: "500"
  },
  link: {
    color: "#d4d4d8"
  },
  error: {
    color: "#ef4444"
  },
  speakerRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center"
  },
  speakerText: {
    color: "#d4d4d8"
  },
  segment: {
    borderTopColor: "#262626",
    borderTopWidth: 1,
    paddingTop: 8,
    gap: 4
  },
  segmentMeta: {
    color: "#a1a1aa",
    fontSize: 12
  },
  segmentText: {
    color: "#e4e4e7",
    lineHeight: 20
  }
});
