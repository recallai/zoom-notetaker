import { NextRequest, NextResponse } from "next/server";
import {
  updateMeetingNote,
  getAllMeetings,
  retrieveBotData,
  processBotData,
} from "@/lib/meetings";
import { generateMeetingSummary } from "@/lib/openai";
import type {
  WebhookPayload,
  MeetingNoteUpdate,
  TranscriptSegment,
  WebhookData,
} from "@/lib/types";

// Async processing function that handles the heavy lifting after webhook response
async function processWebhookAsync(
  meetingId: string,
  botId: string,
  eventName: string,
  data: WebhookData
) {
  console.log(
    `Starting async processing for bot ${botId}, event: ${eventName}`
  );

  // Update meeting status based on event
  let status: "in_progress" | "processing" | "done" | "errored" = "in_progress";
  let updates: MeetingNoteUpdate = {};

  if (eventName === "bot.done") {
    // First, set to processing while we generate the summary
    status = "processing";

    try {
      // Retrieve detailed bot data from Recall.ai
      console.log(`Fetching bot data for botId: ${botId}`);
      const botData = await retrieveBotData(botId);

      // Process bot data to extract meeting information
      const processedData = await processBotData(botData);

      // First update with processing status and basic meeting data
      const basicUpdates = {
        status,
        title: processedData.title,
        participants: processedData.participants,
        ...(processedData.duration && { duration: processedData.duration }),
        ...(processedData.transcript && {
          transcript: processedData.transcript,
        }),
      };

      // Update to processing status immediately so UI shows the right state
      await updateMeetingNote(meetingId, basicUpdates);
      console.log(`Updated meeting ${meetingId} to processing status`);

      // Generate AI summary if we have a transcript
      if (processedData.transcript && Array.isArray(processedData.transcript)) {
        try {
          console.log(`Generating AI summary for botId: ${botId}`);
          const summary = await generateMeetingSummary(
            processedData.transcript,
            processedData.participants || []
          );

          // Update with summary and mark as done
          updates = {
            ...basicUpdates,
            status: "done",
            summary: summary,
          };
          console.log(`AI summary generated successfully for botId: ${botId}`);
        } catch (summaryError) {
          console.error(
            `Failed to generate AI summary for ${botId}:`,
            summaryError
          );
          // Mark as done even without summary
          updates = {
            ...basicUpdates,
            status: "done",
          };
        }
      } else {
        // No transcript, just mark as done
        updates = {
          ...basicUpdates,
          status: "done",
        };
      }

      console.log(`Processed bot data:`, {
        title: processedData.title,
        participants: processedData.participants,
        duration: processedData.duration,
        hasTranscript: !!processedData.transcript,
        hasSummary: !!updates.summary,
      });
    } catch (error) {
      console.error(`Failed to retrieve bot data for ${botId}:`, error);
      // Still mark as done but with minimal updates
      updates = {
        status,
        title: "Completed Meeting",
      };
    }
  } else if (
    eventName === "bot.video_call_ended" ||
    eventName === "bot.recording_ready"
  ) {
    // Start with processing status
    status = "processing";

    // If we have transcript data in the webhook (fallback)
    let transcript: TranscriptSegment[] | null = null;
    if (data.transcript_segments) {
      transcript = data.transcript_segments.map((segment, index) => ({
        name: segment.speaker,
        id: String(index),
        words: segment.text,
        start_timestamp: null,
        end_timestamp: null,
      }));
    }

    // Extract other meeting data (fallback)
    const basicUpdates = {
      status,
      title: data.meeting_metadata?.title || "Completed Meeting",
      participants: data.meeting_metadata?.participants || [],
      ...(transcript && { transcript }),
    };

    // Update to processing status immediately
    await updateMeetingNote(meetingId, basicUpdates);
    console.log(`Updated meeting ${meetingId} to processing status (fallback)`);

    // Generate AI summary if we have a transcript (fallback case)
    if (transcript) {
      try {
        console.log(`Generating AI summary for botId: ${botId} (fallback)`);
        const summary = await generateMeetingSummary(
          transcript,
          data.meeting_metadata?.participants || []
        );
        updates = {
          ...basicUpdates,
          status: "done",
          summary: summary,
        };
        console.log(
          `AI summary generated successfully for botId: ${botId} (fallback)`
        );
      } catch (summaryError) {
        console.error(
          `Failed to generate AI summary for ${botId} (fallback):`,
          summaryError
        );
        // Mark as done even without summary
        updates = {
          ...basicUpdates,
          status: "done",
        };
      }
    } else {
      // No transcript, just mark as done
      updates = {
        ...basicUpdates,
        status: "done",
      };
    }
  } else if (eventName === "bot.error") {
    status = "errored";
    updates.status = status;
  }

  await updateMeetingNote(meetingId, updates);
  console.log(`Updated meeting ${meetingId} to status: ${status}`);
}

export async function POST(request: NextRequest) {
  try {
    const { data, event }: WebhookPayload = await request.json();

    // Extract bot ID and event name
    const botId = data?.bot?.id;
    const eventName = event;

    if (!botId || !eventName) {
      return NextResponse.json(
        { error: "Invalid webhook payload - missing bot ID or event name" },
        { status: 400 }
      );
    }

    console.log(`Webhook received: ${eventName} for bot ${botId}`);

    // Find the meeting note by botId
    const allMeetings = await getAllMeetings();
    const meeting = allMeetings.find((m) => m.botId === botId);

    if (!meeting) {
      console.warn(`No meeting found for bot ${botId}`);
      return NextResponse.json({
        message: "Webhook processed but no matching meeting found",
        botId,
        event: eventName,
      });
    }

    // IMPORTANT: Respond immediately with 200 to prevent webhook retries
    // The actual processing happens asynchronously after this response
    const response = NextResponse.json({
      message: "Webhook received and processing started",
      botId,
      event: eventName,
    });

    // Process the webhook asynchronously (don't await this)
    processWebhookAsync(meeting.id, botId, eventName, data).catch((error) => {
      console.error(`Async webhook processing failed for ${botId}:`, error);
    });

    return response;
  } catch (error) {
    console.error("Failed to process webhook:", error);
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 }
    );
  }
}
