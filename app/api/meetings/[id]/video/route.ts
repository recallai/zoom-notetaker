import { NextRequest, NextResponse } from "next/server";
import { getMeetingNote, retrieveBotData } from "@/lib/meetings";

// GET /api/meetings/[id]/video - Get fresh video URL for a meeting
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const meeting = await getMeetingNote(id);

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    if (meeting.status !== "done") {
      return NextResponse.json(
        { error: "Meeting not completed yet" },
        { status: 400 }
      );
    }

    if (!meeting.botId) {
      return NextResponse.json(
        { error: "No bot ID found for this meeting" },
        { status: 400 }
      );
    }

    // Retrieve fresh bot data from Recall.ai
    const botData = await retrieveBotData(meeting.botId);

    // Extract video URL from bot data
    const videoUrl =
      botData.recordings[0]?.media_shortcuts?.video_mixed?.data?.download_url;

    if (!videoUrl) {
      return NextResponse.json(
        { error: "No video available for this meeting" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      videoUrl,
      expiresIn: "6 hours", // Recall.ai URLs expire after 6 hours
      meeting: {
        id: meeting.id,
        title: meeting.title,
        status: meeting.status,
      },
    });
  } catch (error) {
    console.error("Failed to fetch video URL:", error);
    return NextResponse.json(
      { error: "Failed to fetch video URL" },
      { status: 500 }
    );
  }
}
