import fs from "fs/promises";
import path from "path";
import type {
  MeetingNote,
  MeetingNoteUpdate,
  RecallBotData,
  RecallRecording,
  RecallTranscriptData,
  RecallParticipantData,
  TranscriptSegment,
} from "./types";

// Re-export for convenience
export { getParticipantColor } from "./participant-colors";

const MEETINGS_DIR = path.join(process.cwd(), "data", "meetings");

// Ensure meetings directory exists
async function ensureMeetingsDir() {
  try {
    await fs.access(MEETINGS_DIR);
  } catch {
    await fs.mkdir(MEETINGS_DIR, { recursive: true });
  }
}

// Generate unique ID
export function generateMeetingId(): string {
  return crypto.randomUUID();
}

// Create new meeting note
export async function createMeetingNote(
  meetingUrl: string,
  botId?: string
): Promise<MeetingNote> {
  await ensureMeetingsDir();

  const meeting: MeetingNote = {
    id: generateMeetingId(),
    status: "in_progress",
    meetingUrl,
    botId,
    title: "Meeting in Progress",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await saveMeetingNote(meeting);
  return meeting;
}

// Get meeting note by ID
export async function getMeetingNote(id: string): Promise<MeetingNote | null> {
  await ensureMeetingsDir();

  try {
    const content = await fs.readFile(
      path.join(MEETINGS_DIR, `${id}.json`),
      "utf-8"
    );
    return JSON.parse(content);
  } catch {
    return null;
  }
}

// Save meeting note
export async function saveMeetingNote(meeting: MeetingNote): Promise<void> {
  await ensureMeetingsDir();

  meeting.updatedAt = new Date().toISOString();
  const filePath = path.join(MEETINGS_DIR, `${meeting.id}.json`);
  await fs.writeFile(filePath, JSON.stringify(meeting, null, 2));
}

// Update meeting note status and data
export async function updateMeetingNote(
  id: string,
  updates: MeetingNoteUpdate
): Promise<MeetingNote | null> {
  const existing = await getMeetingNote(id);
  if (!existing) return null;

  const updated: MeetingNote = {
    ...existing,
    ...updates,
    id, // Ensure ID doesn't change
    createdAt: existing.createdAt, // Ensure createdAt doesn't change
  };

  await saveMeetingNote(updated);
  return updated;
}

// Helper function to calculate recording duration
function calculateRecordingDuration(
  recordings: RecallRecording[]
): string | null {
  if (!recordings || recordings.length === 0) return null;

  // Find the first recording with both started_at and completed_at
  const recording = recordings.find((r) => r.started_at && r.completed_at);
  if (!recording) return null;

  const startTime = new Date(recording.started_at!);
  const endTime = new Date(recording.completed_at!);
  const durationMs = endTime.getTime() - startTime.getTime();
  const durationMinutes = Math.round(durationMs / (1000 * 60));

  return `${durationMinutes} min`;
}

// Helper function to extract participants from bot data
async function extractParticipants(botData: RecallBotData): Promise<string[]> {
  const recordings = botData.recordings;
  if (!recordings || recordings.length === 0) return [];

  const url =
    recordings[0]?.media_shortcuts?.participant_events?.data
      ?.participants_download_url;
  if (!url) return [];

  try {
    const response = await fetch(url);
    const participants: RecallParticipantData[] = await response.json();
    return participants.map((p) => p.name).filter(Boolean);
  } catch {
    return [];
  }
}

// helper function to extract transcript data from bot data
async function extractTranscript(
  botData: RecallBotData
): Promise<TranscriptSegment[]> {
  const recordings = botData.recordings;
  if (!recordings || recordings.length === 0) return [];

  const url = recordings[0]?.media_shortcuts?.transcript?.data?.download_url;
  if (!url) return [];

  try {
    const response = await fetch(url);
    const transcriptData: RecallTranscriptData[] = await response.json();

    // Process the transcript data to combine words by participant
    const processedTranscript = transcriptData.map((participantData) => {
      const words = participantData.words || [];

      if (words.length === 0) {
        return {
          name: participantData.participant?.name || null,
          id: participantData.participant?.id || null,
          words: "",
          start_timestamp: null,
          end_timestamp: null,
        };
      }

      // Combine all word texts into a single string
      const combinedText = words.map((word) => word.text).join(" ");

      // Get relative timestamps from first and last words
      const firstWord = words[0];
      const lastWord = words[words.length - 1];

      return {
        name: participantData.participant?.name || null,
        id: participantData.participant?.id || null,
        words: combinedText,
        start_timestamp: firstWord.start_timestamp?.relative || null,
        end_timestamp: lastWord.end_timestamp?.relative || null,
      };
    });

    return processedTranscript;
  } catch (error) {
    console.error("Error extracting transcript:", error);
    return [];
  }
}

// Process bot data to extract meeting information
export async function processBotData(botData: RecallBotData) {
  const duration = calculateRecordingDuration(botData.recordings || []);
  const participants = await extractParticipants(botData);
  const transcript = await extractTranscript(botData);

  return {
    duration,
    participants,
    transcript,
    title: botData.meeting_metadata?.title || "Completed Meeting",
  };
}

// Retrieve bot data from Recall.ai API
export async function retrieveBotData(botId: string): Promise<RecallBotData> {
  const RECALL_API_KEY = process.env.RECALL_API_KEY;

  if (!RECALL_API_KEY) {
    throw new Error("RECALL_API_KEY environment variable is required");
  }

  try {
    const response = await fetch(
      `https://us-east-1.recall.ai/api/v1/bot/${botId}/`,
      {
        headers: {
          accept: "application/json",
          Authorization: `Token ${RECALL_API_KEY}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to retrieve bot data: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error retrieving bot data:", error);
    throw error;
  }
}

// Get all meetings (for potential future use)
export async function getAllMeetings(): Promise<MeetingNote[]> {
  await ensureMeetingsDir();

  try {
    const files = await fs.readdir(MEETINGS_DIR);
    const meetings: MeetingNote[] = [];

    for (const file of files) {
      if (file.endsWith(".json")) {
        const content = await fs.readFile(
          path.join(MEETINGS_DIR, file),
          "utf-8"
        );
        meetings.push(JSON.parse(content));
      }
    }

    return meetings.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    console.error("Error reading meetings:", error);
    return [];
  }
}
