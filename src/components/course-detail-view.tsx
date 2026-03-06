"use client";

import { useState } from "react";
import type { CourseDigest as CourseDigestType } from "@/lib/types";
import { ThreadCard } from "./thread-card";
import { COURSE_COLORS } from "./course-digest";
import {
  BookOpen,
  MessageCircle,
  Sparkles,
  Loader2,
  PenSquare,
} from "lucide-react";
import { NewPostComposer } from "./new-post-composer";

interface Props {
  digest: CourseDigestType;
  token: string;
  colorIndex: number;
  onAskAbout: (courseCode: string, courseId: number) => void;
  onGenerateSummary: (digest: CourseDigestType) => Promise<string>;
}

export function CourseDetailView({
  digest,
  token,
  colorIndex,
  onAskAbout,
  onGenerateSummary,
}: Props) {
  const [summary, setSummary] = useState(digest.summary || "");
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);

  const colors = COURSE_COLORS[colorIndex % COURSE_COLORS.length];

  const questions = digest.threads.filter((t) => t.type === "question").length;
  const posts = digest.threads.filter((t) => t.type === "post").length;
  const announcements = digest.threads.filter(
    (t) => t.type === "announcement"
  ).length;

  async function handleSummarize() {
    if (summary) return;
    setLoadingSummary(true);
    try {
      const result = await onGenerateSummary(digest);
      setSummary(result);
    } finally {
      setLoadingSummary(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center shrink-0`}
          >
            <BookOpen className={`w-6 h-6 ${colors.text}`} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {digest.course.code}
            </h2>
            <p className="text-sm text-muted-foreground">
              {digest.course.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setComposerOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border ${colors.border} ${colors.text} hover:opacity-80 transition-colors`}
          >
            <PenSquare className="w-3.5 h-3.5" />
            New Post
          </button>
          <button
            onClick={() => onAskAbout(digest.course.code, digest.course.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg text-white ${colors.btn} transition-colors`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Ask AI
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">
          {digest.threads.length} threads
        </span>
        {questions > 0 && <span>{questions} questions</span>}
        {posts > 0 && <span>{posts} posts</span>}
        {announcements > 0 && (
          <span className="font-medium text-amber-600">
            {announcements} announcements
          </span>
        )}
      </div>

      {!summary && (
        <button
          onClick={handleSummarize}
          disabled={loadingSummary}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border ${colors.accentBorder} text-sm font-medium ${colors.text} ${colors.accent} hover:opacity-80 disabled:opacity-60 transition-colors`}
        >
          {loadingSummary ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {loadingSummary ? "Generating summary..." : "Generate AI Summary"}
        </button>
      )}

      {summary && (
        <div
          className={`p-4 rounded-xl ${colors.accent} border ${colors.accentBorder}`}
        >
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className={`w-4 h-4 ${colors.text}`} />
            <span
              className={`text-xs font-semibold ${colors.summaryText} uppercase tracking-wide`}
            >
              AI Summary
            </span>
          </div>
          <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
            {summary}
          </p>
        </div>
      )}

      <div className="space-y-2.5">
        {digest.threads.map((thread) => (
          <ThreadCard key={thread.id} thread={thread} token={token} />
        ))}
      </div>

      {digest.threads.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">No threads in the selected time range.</p>
        </div>
      )}

      <NewPostComposer
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        course={digest.course}
        token={token}
      />
    </div>
  );
}
