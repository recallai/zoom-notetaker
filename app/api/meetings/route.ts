import { NextResponse } from "next/server";
import { getAllMeetings } from "@/lib/meetings";

// GET /api/meetings - Get all meetings
export async function GET() {
  try {
    const meetings = await getAllMeetings();
    return NextResponse.json(meetings);
  } catch (error) {
    console.error("Failed to fetch meetings:", error);
    return NextResponse.json(
      { error: "Failed to fetch meetings" },
      { status: 500 }
    );
  }
}
