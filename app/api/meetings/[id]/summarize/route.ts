import { NextRequest, NextResponse } from "next/server";
import { getMeetingNote, updateMeetingNote } from "@/lib/meetings";
import { generateMeetingSummary } from "@/lib/openai";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: "Meeting ID is required" },
        { status: 400 }
      );
    }

    // Get the meeting
    const meeting = await getMeetingNote(id);
    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    // Check if we have a transcript
    if (!meeting.transcript) {
      return NextResponse.json(
        { error: "No transcript available for this meeting" },
        { status: 400 }
      );
    }

    // Generate summary
    try {
      console.log(`Generating AI summary for meeting: ${id}`);
      const summary = await generateMeetingSummary(
        meeting.transcript,
        meeting.participants || []
      );

      // Update the meeting with the summary
      await updateMeetingNote(id, { summary });

      console.log(`AI summary generated successfully for meeting: ${id}`);

      return NextResponse.json({
        success: true,
        summary,
        message: "Summary generated successfully",
      });
    } catch (summaryError) {
      console.error(
        `Failed to generate AI summary for meeting ${id}:`,
        summaryError
      );
      return NextResponse.json(
        { error: "Failed to generate summary" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in summarize endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
