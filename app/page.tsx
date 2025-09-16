"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Clock } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { MeetingNote } from "@/lib/types";

export default function HomePage() {
  const [meetingUrl, setMeetingUrl] = useState("");
  const [isCreatingBot, setIsCreatingBot] = useState(false);
  const [meetingNotes, setMeetingNotes] = useState<MeetingNote[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchMeetings = async () => {
    try {
      const response = await fetch("/api/meetings");
      if (response.ok) {
        const meetings = await response.json();
        setMeetingNotes(meetings);
      } else {
        console.error("Failed to fetch meetings");
      }
    } catch (error) {
      console.error("Failed to fetch meetings:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  const handleCreateBot = async () => {
    if (!meetingUrl.trim()) {
      alert("Please enter a meeting URL");
      return;
    }

    setIsCreatingBot(true);

    try {
      const response = await fetch("/api/send-bot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ meetingUrl }),
      });

      const result = await response.json();

      if (response.ok) {
        // Redirect to the notes page for this meeting
        router.push(`/notes/${result.meetingId}`);
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error("Failed to send bot:", error);
      alert("Failed to send bot to meeting. Please try again.");
    } finally {
      setIsCreatingBot(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <main className="max-w-6xl mx-auto px-8 py-16">
        <div className="mb-12">
          <h1 className="text-2xl font-medium text-gray-900 text-center">
            Recall.ai Meeting Notes
          </h1>
        </div>

        <section className="mb-16">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
              <div className="aspect-square border-2 border-dashed border-gray-200 hover:border-blue-300 rounded-lg p-6 cursor-default  bg-gray-50/50 hover:bg-blue-50/30 flex flex-col items-center justify-center group">
                <div className="text-center space-y-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    New Meeting Notes
                  </h3>

                  <div className="space-y-3 w-full max-w-48">
                    <Input
                      type="url"
                      placeholder="Meeting URL"
                      value={meetingUrl}
                      onChange={(e) => setMeetingUrl(e.target.value)}
                      className="border-gray-200 focus:border-blue-600 focus:ring-0 text-xs h-8 text-center"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Button
                      size="sm"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white h-7 text-xs font-normal cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCreateBot();
                      }}
                      disabled={isCreatingBot}
                    >
                      {isCreatingBot
                        ? "Sending Notetaker..."
                        : "Send Notetaker"}
                    </Button>
                  </div>
                </div>
              </div>

              {meetingNotes.map((note) => (
                <Link key={note.id} href={`/notes/${note.id}`}>
                  <div className="group aspect-square border border-gray-200 hover:border-gray-300 rounded-lg p-6 cursor-pointer transition-all hover:shadow-sm bg-white">
                    <div className="h-full flex flex-col">
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors text-sm leading-tight flex-1">
                            {note.title || "Meeting"}
                          </h3>
                          <span
                            className={`inline-block px-2 py-1 rounded-full text-xs font-medium ml-2 ${
                              note.status === "in_progress"
                                ? "bg-yellow-50 text-yellow-700"
                                : note.status === "processing"
                                ? "bg-blue-50 text-blue-700"
                                : note.status === "done"
                                ? "bg-green-50 text-green-700"
                                : "bg-red-50 text-red-700"
                            }`}
                          >
                            {note.status === "in_progress"
                              ? "In Progress"
                              : note.status === "processing"
                              ? "Processing"
                              : note.status === "done"
                              ? "Completed"
                              : "Error"}
                          </span>
                        </div>

                        {/* Summary Preview */}
                        {note.summary && (
                          <div className="mt-3">
                            <p className="text-xs text-gray-600 leading-relaxed line-clamp-5">
                              {typeof note.summary === "string"
                                ? note.summary
                                : note.summary.content
                                    ?.map((segment) => segment.content)
                                    .join("")}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="flex items-center justify-between text-xs text-gray-400">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(note.createdAt).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                              }
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {note.duration ||
                              (note.participants?.length
                                ? `${note.participants.length} people`
                                : "")}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}

              {meetingNotes.length === 0 && (
                <div className="col-span-full text-center py-16">
                  <div className="text-gray-400 mb-4">
                    <Calendar className="w-16 h-16 mx-auto mb-4" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No meetings yet
                  </h3>
                  <p className="text-gray-500">
                    Create your first meeting note by entering a meeting URL
                    above.
                  </p>
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
