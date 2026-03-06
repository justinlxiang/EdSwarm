"use client";

import { useState } from "react";
import type { CourseDigest as CourseDigestType } from "@/lib/types";
import { ThreadCard } from "./thread-card";
import {
  BookOpen,
  MessageCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Loader2,
  PenSquare,
} from "lucide-react";
import { NewPostComposer } from "./new-post-composer";

export const COURSE_COLORS = [
  { bg: "bg-blue-500/10", text: "text-blue-600", border: "border-blue-200", btn: "bg-blue-600 hover:bg-blue-700", accent: "bg-blue-50", accentBorder: "border-blue-100", summaryText: "text-blue-600", stripe: "bg-blue-500" },
  { bg: "bg-violet-500/10", text: "text-violet-600", border: "border-violet-200", btn: "bg-violet-600 hover:bg-violet-700", accent: "bg-violet-50", accentBorder: "border-violet-100", summaryText: "text-violet-600", stripe: "bg-violet-500" },
  { bg: "bg-emerald-500/10", text: "text-emerald-600", border: "border-emerald-200", btn: "bg-emerald-600 hover:bg-emerald-700", accent: "bg-emerald-50", accentBorder: "border-emerald-100", summaryText: "text-emerald-600", stripe: "bg-emerald-500" },
  { bg: "bg-amber-500/10", text: "text-amber-600", border: "border-amber-200", btn: "bg-amber-600 hover:bg-amber-700", accent: "bg-amber-50", accentBorder: "border-amber-100", summaryText: "text-amber-600", stripe: "bg-amber-500" },
  { bg: "bg-rose-500/10", text: "text-rose-600", border: "border-rose-200", btn: "bg-rose-600 hover:bg-rose-700", accent: "bg-rose-50", accentBorder: "border-rose-100", summaryText: "text-rose-600", stripe: "bg-rose-500" },
  { bg: "bg-cyan-500/10", text: "text-cyan-600", border: "border-cyan-200", btn: "bg-cyan-600 hover:bg-cyan-700", accent: "bg-cyan-50", accentBorder: "border-cyan-100", summaryText: "text-cyan-600", stripe: "bg-cyan-500" },
  { bg: "bg-pink-500/10", text: "text-pink-600", border: "border-pink-200", btn: "bg-pink-600 hover:bg-pink-700", accent: "bg-pink-50", accentBorder: "border-pink-100", summaryText: "text-pink-600", stripe: "bg-pink-500" },
  { bg: "bg-indigo-500/10", text: "text-indigo-600", border: "border-indigo-200", btn: "bg-indigo-600 hover:bg-indigo-700", accent: "bg-indigo-50", accentBorder: "border-indigo-100", summaryText: "text-indigo-600", stripe: "bg-indigo-500" },
];

interface Props {
  digest: CourseDigestType;
  token: string;
  colorIndex: number;
  onAskAbout: (courseCode: string, courseId: number) => void;
  onGenerateSummary: (digest: CourseDigestType) => Promise<string>;
}

export function CourseDigestCard({
  digest,
  token,
  colorIndex,
  onAskAbout,
  onGenerateSummary,
}: Props) {
  const [showAll, setShowAll] = useState(false);
  const [summary, setSummary] = useState(digest.summary || "");
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);

  const colors = COURSE_COLORS[colorIndex % COURSE_COLORS.length];

  const displayThreads = showAll
    ? digest.threads
    : digest.threads.slice(0, 5);

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
    <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden flex">
      <div className={`w-1.5 shrink-0 ${colors.stripe}`} />
      <div className="flex-1 min-w-0">
        <div className="p-5 border-b border-border/40">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center shrink-0`}>
                <BookOpen className={`w-5 h-5 ${colors.text}`} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">
                  {digest.course.code}
                </h3>
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

          <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
            <span>{digest.threads.length} threads</span>
            {questions > 0 && <span>{questions} questions</span>}
            {posts > 0 && <span>{posts} posts</span>}
            {announcements > 0 && (
              <span className="font-medium text-amber-600">
                {announcements} announcements
              </span>
            )}
          </div>
        </div>

        <div className="p-5">
          {!summary && (
            <button
              onClick={handleSummarize}
              disabled={loadingSummary}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 mb-4 rounded-xl border ${colors.accentBorder} text-sm font-medium ${colors.text} ${colors.accent} hover:opacity-80 disabled:opacity-60 transition-colors`}
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
            <div className={`mb-4 p-4 rounded-xl ${colors.accent} border ${colors.accentBorder}`}>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className={`w-4 h-4 ${colors.text}`} />
                <span className={`text-xs font-semibold ${colors.summaryText} uppercase tracking-wide`}>
                  AI Summary
                </span>
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                {summary}
              </p>
            </div>
          )}

          <div className="space-y-2.5">
            {displayThreads.map((thread) => (
              <ThreadCard key={thread.id} thread={thread} token={token} />
            ))}
          </div>

          {digest.threads.length > 5 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className={`mt-3 flex items-center gap-1 mx-auto text-sm ${colors.text} hover:opacity-70 transition-colors`}
            >
              {showAll ? (
                <>
                  Show less <ChevronUp className="w-4 h-4" />
                </>
              ) : (
                <>
                  Show all {digest.threads.length} threads{" "}
                  <ChevronDown className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>

        <NewPostComposer
          open={composerOpen}
          onClose={() => setComposerOpen(false)}
          course={digest.course}
          token={token}
        />
      </div>
    </div>
  );
}
