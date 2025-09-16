import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { createMeetingNote } from "@/lib/meetings";

export async function POST(request: NextRequest) {
  try {
    const { meetingUrl } = await request.json();

    if (!meetingUrl) {
      return NextResponse.json(
        { error: "meetingUrl is required" },
        { status: 400 }
      );
    }

    const RECALL_API_KEY = process.env.RECALL_API_KEY;

    if (!RECALL_API_KEY) {
      console.error("ERROR: RECALL_API_KEY environment variable is required");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Call Recall.ai API
    const response = await axios.post(
      "https://us-east-1.recall.ai/api/v1/bot/",
      {
        meeting_url: meetingUrl,
        // configure the bot to transcribe the meeting
        recording_config: {
          transcript: {
            provider: {
              recallai_streaming: {},
            },
          },
        },
      },
      {
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          Authorization: `Token ${RECALL_API_KEY}`,
        },
      }
    );

    // Create meeting note in our filesystem
    const meetingNote = await createMeetingNote(meetingUrl, response.data.id);

    // Success response with meeting note ID
    return NextResponse.json({
      message: "Bot created successfully",
      meetingId: meetingNote.id,
      data: response.data,
    });
  } catch (error) {
    console.error("Failed to create bot:", error);

    return NextResponse.json(
      {
        error: "Failed to create bot",
        details: "Internal server error",
      },
      { status: 500 }
    );
  }
}
