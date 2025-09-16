// Core Meeting Types
export interface SummarySegment {
  type: "text" | "participant" | "timestamp_link";
  content: string;
  // For participant segments
  participantId?: string;
  // For timestamp links
  timestamp?: number; // seconds from start
  // For styling
  className?: string;
}

export interface ParticipantInfo {
  id: string;
  name: string;
  colorClass: string; // e.g., "bg-blue-50 text-blue-900"
}

export interface Summary {
  content: SummarySegment[];
  participants: ParticipantInfo[];
}

export interface TranscriptSegment {
  name: string | null;
  id: string | null;
  words: string;
  start_timestamp: number | null;
  end_timestamp: number | null;
}

export interface MeetingNote {
  id: string;
  status: "in_progress" | "processing" | "done" | "errored";
  meetingUrl: string;
  botId?: string;
  title?: string;
  transcript?: TranscriptSegment[];
  summary?: Summary;
  participants?: string[];
  duration?: string; // e.g., "45 min"
  createdAt: string;
  updatedAt: string;
}

// Recall.ai API Types
export interface RecallBotWord {
  text: string;
  start_timestamp?: {
    relative?: number;
  };
  end_timestamp?: {
    relative?: number;
  };
}

export interface RecallParticipant {
  id: string;
  name: string;
}

export interface RecallTranscriptData {
  participant?: RecallParticipant;
  words: RecallBotWord[];
}

export interface RecallRecording {
  started_at?: string;
  completed_at?: string;
  media_shortcuts?: {
    video_mixed?: {
      data?: {
        download_url?: string;
      };
    };
    transcript?: {
      data?: {
        download_url?: string;
      };
    };
    participant_events?: {
      data?: {
        participants_download_url?: string;
      };
    };
  };
}

export interface RecallBotData {
  id: string;
  meeting_metadata?: {
    title?: string;
    participants?: string[];
  };
  recordings: RecallRecording[];
}

export interface RecallParticipantData {
  name: string;
}

// Webhook Types
export interface WebhookData {
  bot?: {
    id: string;
  };
  transcript_segments?: Array<{
    speaker: string;
    text: string;
  }>;
  meeting_metadata?: {
    title?: string;
    participants?: string[];
  };
}

export interface WebhookPayload {
  data: WebhookData;
  event: string;
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success?: boolean;
  message?: string;
  error?: string;
  data?: T;
}

export interface CreateBotResponse extends ApiResponse {
  meetingId: string;
  data: {
    id: string;
    [key: string]: unknown;
  };
}

export interface VideoUrlResponse extends ApiResponse {
  videoUrl: string;
  expiresIn: string;
  meeting: {
    id: string;
    title?: string;
    status: string;
  };
}

// Utility Types
export type MeetingStatus = MeetingNote["status"];
export type SummarySegmentType = SummarySegment["type"];

// Form/UI Types
export interface MeetingFormData {
  meetingUrl: string;
}

// Update types for partial updates
export type MeetingNoteUpdate = Partial<Omit<MeetingNote, "id" | "createdAt">>;
