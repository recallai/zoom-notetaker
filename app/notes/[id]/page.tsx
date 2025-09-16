"use client";

import Link from "next/link";
import { ArrowLeft, Play, Clock, AlertCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, use, useCallback } from "react";
import type {
  MeetingNote,
  SummarySegment,
  ParticipantInfo,
  TranscriptSegment,
} from "@/lib/types";
import { getParticipantColor } from "@/lib/participant-colors";

export default function NotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const [meeting, setMeeting] = useState<MeetingNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"summary" | "transcript">(
    "summary"
  );

  const fetchVideoUrl = useCallback(async () => {
    console.log("🎥 Fetching video URL for meeting:", resolvedParams.id);
    setVideoLoading(true);
    setVideoError(null);

    try {
      const response = await fetch(`/api/meetings/${resolvedParams.id}/video`);
      console.log("🎥 Video API response status:", response.status);

      if (response.ok) {
        const videoData = await response.json();
        console.log("🎥 Video data received:", videoData);
        setVideoUrl(videoData.videoUrl);
      } else {
        const errorData = await response.json();
        console.log("❌ Video error:", errorData);
        setVideoError(errorData.error || "Failed to load video");
      }
    } catch {
      console.log("❌ Video fetch error");
      setVideoError("Failed to load video");
    } finally {
      setVideoLoading(false);
    }
  }, [resolvedParams.id]);

  const fetchMeeting = useCallback(async () => {
    try {
      const response = await fetch(`/api/meetings/${resolvedParams.id}`);

      if (response.ok) {
        const meetingData = await response.json();
        setMeeting(meetingData);
        setError(null);

        // If meeting is done, also fetch video URL
        if (meetingData.status === "done") {
          console.log("✅ Meeting is done, fetching video URL...");
          void fetchVideoUrl();
        } else {
          console.log(
            "⏳ Meeting status:",
            meetingData.status,
            "- not fetching video yet"
          );
        }
      } else if (response.status === 404) {
        setError("Meeting not found");
      } else {
        setError("Failed to load meeting");
      }
    } catch {
      setError("Failed to load meeting");
    } finally {
      setLoading(false);
    }
  }, [resolvedParams.id, fetchVideoUrl]);

  useEffect(() => {
    fetchMeeting();

    // Set up polling if meeting is in progress or processing
    const interval = setInterval(() => {
      if (
        meeting?.status === "in_progress" ||
        meeting?.status === "processing"
      ) {
        fetchMeeting();
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedParams.id, meeting?.status]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading meeting...</p>
        </div>
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <Link href="/">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-gray-500 hover:text-gray-700 mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
          <div className="flex flex-col items-center justify-center py-16">
            <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              {error || "Meeting not found"}
            </h1>
            <p className="text-gray-500">
              The meeting you&apos;re looking for doesn&apos;t exist or
              couldn&apos;t be loaded.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 py-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <Link
            href="/"
            className="cursor-pointer p-1 rounded hover:ring-2 hover:ring-gray-300 transition-all"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900">
            {meeting.title || "Meeting"}
          </h1>
        </div>

        {/* Status-based content */}
        {meeting.status === "in_progress" && (
          <div className="flex flex-col items-center justify-center py-16 space-y-6">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-100 border-t-blue-600"></div>
              <Clock className="w-8 h-8 text-blue-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold text-gray-900">
                Meeting in Progress
              </h2>
              <p className="text-gray-500 max-w-md">
                Our notetaker is currently in your meeting. The transcript and
                summary will appear here automatically when the meeting ends.
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md">
              <p className="text-sm text-blue-800">
                <strong>Meeting URL:</strong> <br />
                <a
                  href={meeting.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline break-all"
                >
                  {meeting.meetingUrl}
                </a>
              </p>
            </div>
          </div>
        )}

        {meeting.status === "processing" && (
          <div className="flex flex-col items-center justify-center py-16 space-y-6">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-100 border-t-purple-600"></div>
              <Sparkles className="w-8 h-8 text-purple-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold text-gray-900">
                Generating AI Summary
              </h2>
              <p className="text-gray-500 max-w-md">
                Meeting completed! We&apos;re now analyzing the transcript and
                creating your intelligent summary.
              </p>
            </div>
          </div>
        )}

        {meeting.status === "errored" && (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <AlertCircle className="w-16 h-16 text-red-400" />
            <div className="text-center space-y-2">
              <h2 className="text-xl font-semibold text-gray-900">
                Meeting Error
              </h2>
              <p className="text-gray-500 max-w-md">
                There was an issue with the notetaker for this meeting. Please
                try creating a new meeting.
              </p>
            </div>
          </div>
        )}

        {meeting.status === "done" && (
          <>
            {/* Participants */}
            {meeting.participants && meeting.participants.length > 0 && (
              <div className="mb-2">
                <div className="flex items-center gap-4">
                  <span className="text-xs font-medium text-gray-500 shrink-0">
                    Participants:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {meeting.participants.map((participant, index) => {
                      const colorClass = getParticipantColor(index);

                      return (
                        <span
                          key={index}
                          className={`inline-block px-2 py-1 rounded text-xs font-medium ${colorClass}`}
                        >
                          {participant}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Meeting Info */}
            <div className="mb-3">
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span>{new Date(meeting.createdAt).toLocaleDateString()}</span>
                {meeting.duration && (
                  <>
                    <span>•</span>
                    <span>{meeting.duration}</span>
                  </>
                )}
                <span>•</span>
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
                  Completed
                </span>
              </div>
            </div>

            {/* Video Player */}
            <div className="mb-5">
              {videoLoading && (
                <div className="aspect-video bg-gray-100 rounded-lg border flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading video...</p>
                  </div>
                </div>
              )}

              {videoError && (
                <div className="aspect-video bg-gray-100 rounded-lg border flex items-center justify-center">
                  <div className="text-center">
                    <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                    <p className="text-gray-500">Failed to load video</p>
                    <p className="text-sm text-gray-400">{videoError}</p>
                    <button
                      onClick={fetchVideoUrl}
                      className="mt-2 text-blue-600 text-sm hover:underline"
                    >
                      Try again
                    </button>
                  </div>
                </div>
              )}

              {videoUrl && !videoLoading && !videoError && (
                <div className="aspect-video bg-black rounded-lg border overflow-hidden">
                  <video
                    controls
                    width="100%"
                    height="100%"
                    className="w-full h-full"
                    preload="metadata"
                  >
                    <source src={videoUrl} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
              )}

              {!videoUrl && !videoLoading && !videoError && (
                <div className="aspect-video bg-gray-100 rounded-lg border flex items-center justify-center">
                  <div className="text-center">
                    <Play className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Video Recording</p>
                    <p className="text-sm text-gray-400">
                      Video processing in progress...
                    </p>
                    <button
                      onClick={fetchVideoUrl}
                      className="mt-2 text-blue-600 text-sm hover:underline"
                    >
                      Check for video
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Tabbed Content */}
            {(meeting.summary || meeting.transcript) && (
              <div className="mb-5">
                {/* Tab Navigation */}
                <div className="flex border-b border-gray-200 mb-4">
                  {meeting.summary && (
                    <button
                      onClick={() => setActiveTab("summary")}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                        activeTab === "summary"
                          ? "border-blue-600 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      Meeting Summary
                    </button>
                  )}
                  {meeting.transcript && (
                    <button
                      onClick={() => setActiveTab("transcript")}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                        activeTab === "transcript"
                          ? "border-blue-600 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      Transcript
                    </button>
                  )}
                </div>

                {/* Tab Content */}
                <div className="border border-gray-200 rounded-lg p-4">
                  {activeTab === "summary" && meeting.summary && (
                    <div className="prose prose-sm max-w-none">
                      <div className="text-gray-800 leading-loose">
                        {meeting.summary?.content?.map(
                          (segment: SummarySegment, index: number) => {
                            if (segment.type === "participant") {
                              const participant =
                                meeting.summary?.participants?.find(
                                  (p: ParticipantInfo) =>
                                    p.id === segment.participantId
                                );
                              return (
                                <span
                                  key={index}
                                  className={`inline-block px-2 py-1 rounded text-xs font-medium mr-1 ${
                                    participant?.colorClass ||
                                    "bg-gray-50 text-gray-900"
                                  }`}
                                >
                                  {segment.content}
                                </span>
                              );
                            } else if (segment.type === "timestamp_link") {
                              return (
                                <button
                                  key={index}
                                  onClick={() => {
                                    const video = document.querySelector(
                                      "video"
                                    ) as HTMLVideoElement;
                                    if (video && segment.timestamp) {
                                      video.currentTime = segment.timestamp;
                                      video.play();
                                    }
                                  }}
                                  className="underline text-blue-600 hover:text-blue-800 cursor-pointer"
                                >
                                  {segment.content}
                                </button>
                              );
                            } else {
                              return <span key={index}>{segment.content}</span>;
                            }
                          }
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === "transcript" && meeting.transcript && (
                    <div className="max-h-96 overflow-y-auto space-y-3">
                      {meeting.transcript.map(
                        (segment: TranscriptSegment, index: number) => (
                          <div
                            key={index}
                            className="border-b border-gray-200 pb-3 last:border-b-0"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-gray-900">
                                {segment.name ||
                                  `Participant ${segment.id || index + 1}`}
                              </span>
                              {segment.start_timestamp !== null &&
                                segment.end_timestamp !== null && (
                                  <span className="text-xs text-gray-500">
                                    {Math.floor(segment.start_timestamp / 60)}:
                                    {(segment.start_timestamp % 60)
                                      .toFixed(0)
                                      .padStart(2, "0")}{" "}
                                    - {Math.floor(segment.end_timestamp / 60)}:
                                    {(segment.end_timestamp % 60)
                                      .toFixed(0)
                                      .padStart(2, "0")}
                                  </span>
                                )}
                            </div>
                            <p className="text-sm text-gray-700 leading-relaxed">
                              {segment.words}
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
