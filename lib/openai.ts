import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import type { Summary, TranscriptSegment } from "./types";
import { getParticipantColor } from "./participant-colors";

// Zod schema that matches our Summary interface
const summarySegmentSchema = z.object({
  type: z.enum(["text", "participant", "timestamp_link"]),
  content: z.string(),
  participantId: z.string().optional(),
  timestamp: z.number().optional(),
  className: z.string().optional(),
});

const participantInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  colorClass: z.string(),
});

const summarySchema = z.object({
  content: z.array(summarySegmentSchema),
  participants: z.array(participantInfoSchema),
});

export async function generateMeetingSummary(
  transcript: TranscriptSegment[],
  participants: string[]
): Promise<Summary> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable is required");
  }

  if (!transcript || transcript.length === 0) {
    throw new Error("Transcript is required for summary generation");
  }

  // Generate consistent colors for participants
  const participantColors = participants.map((participant, index) => ({
    name: participant,
    id: participant.toLowerCase().replace(/\s+/g, "_"),
    colorClass: getParticipantColor(index),
  }));

  // Convert transcript array to string
  const transcriptText = transcript
    .map((t) => `${t.name || "Speaker"}: ${t.words}`)
    .join("\n");

  try {
    const result = await generateObject({
      model: openai("gpt-5"),
      schema: summarySchema,
      prompt: `You are an expert meeting summarizer. Create a structured summary with participant highlights and important moments that can link to video timestamps.

Required JSON format:
{
  "content": [
    {"type": "text", "content": "This was a productive meeting between "},
    {"type": "participant", "content": "John Smith", "participantId": "john_smith"},
    {"type": "text", "content": " and "},
    {"type": "participant", "content": "Sarah Johnson", "participantId": "sarah_johnson"},
    {"type": "text", "content": ". "},
    {"type": "participant", "content": "John Smith", "participantId": "john_smith"},
    {"type": "text", "content": " discussed "},
    {"type": "timestamp_link", "content": "the Q4 budget planning", "timestamp": 120},
    {"type": "text", "content": " while "},
    {"type": "participant", "content": "Sarah Johnson", "participantId": "sarah_johnson"},
    {"type": "text", "content": " focused on implementation details."}
  ],
  "participants": [
    ${participantColors
      .map(
        (p) =>
          `{"id": "${p.id}", "name": "${p.name}", "colorClass": "${p.colorClass}"}`
      )
      .join(",\n    ")}
  ]
}

Guidelines:
- Write 2-4 paragraphs in past tense
- Always use participant segments for names - never write participant names as regular text
- Mark participant names with "participant" type and create participant objects
- Use at most 2-3 of the timestamp_link fields. You should always include at least one. 
- Use the EXACT participant data provided below (including colorClass)
- Create participantId by converting names to lowercase with underscores
- DO NOT infer timestamps for words in the middle of segments - only use actual segment start times
- Focus timestamp links on key decisions, major announcements, or pivotal discussion topics

Participants: ${participantColors
        .map((p) => `${p.name} (id: ${p.id}, color: ${p.colorClass})`)
        .join(", ")}
          
Transcript:
${transcriptText}

Create a structured summary with the participants and important moments that should be clickable.`,
    });

    return result.object;
  } catch (error) {
    console.error("Error generating meeting summary:", error);
    throw error;
  }
}
