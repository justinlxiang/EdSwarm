"use client";

import { useEffect, useRef, useState } from "react";
import type { CourseDigest } from "@/lib/types";
import { COURSE_COLORS } from "./course-digest";
import { SimpleMarkdown } from "./simple-markdown";
import {
  BookOpen,
  MessageSquare,
  HelpCircle,
  Megaphone,
  Sparkles,
  Loader2,
  ArrowRight,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

function stripXml(xml: string): string {
  return xml
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

interface Props {
  digests: CourseDigest[];
  onSelectCourse: (courseId: number, threadId?: number) => void;
  range: "day" | "week";
  courseColorMap: Map<number, number>;
  onSummaryGenerated?: (courseId: number, summary: string) => void;
}

export function HomeOverview({ digests, onSelectCourse, range, courseColorMap, onSummaryGenerated }: Props) {
  const [summaries, setSummaries] = useState<Record<number, string>>({});
  const [loadingIds, setLoadingIds] = useState<Set<number>>(new Set());
  const fetchedRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    for (const digest of digests) {
      const hasSummary = summaries[digest.course.id] ?? digest.summary;
      if (
        fetchedRef.current.has(digest.course.id) ||
        hasSummary ||
        digest.threads.length === 0
      )
        continue;

      fetchedRef.current.add(digest.course.id);
      setLoadingIds((prev) => new Set(prev).add(digest.course.id));

      const threadData = digest.threads
        .slice(0, 20)
        .map(
          (t) =>
            `- [${t.type}] id=${t.id} number=${t.number} "${t.title}" (${t.category}, ${t.reply_count} replies)${t.is_pinned ? " [PINNED]" : ""}${t.is_answered ? " [ANSWERED]" : ""}: ${stripXml(t.document || t.content).slice(0, 150)}`
        )
        .join("\n");

      fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system:
            "You are a course digest summarizer. Highlight the most critical and actionable items: important announcements, deadline changes, unanswered questions needing attention, and key updates. Use 2-4 concise bullet points with plain text (use '- ' prefix). Keep it under 100 words. Prioritize what a student MUST know. When a bullet relates to a specific thread, add a link at the end: [View #N](thread:COURSE_ID:THREAD_ID) where N is the thread number and THREAD_ID is the thread id.",
          prompt: `Summarize the most important recent activity for "${digest.course.code} - ${digest.course.name}" from the ${range === "day" ? "last 24 hours" : "last week"}:\n\n${threadData}`,
          threadsWithIds: threadData,
          courseId: digest.course.id,
        }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.summary) {
            setSummaries((prev) => ({
              ...prev,
              [digest.course.id]: data.summary,
            }));
            onSummaryGenerated?.(digest.course.id, data.summary);
          }
        })
        .finally(() => {
          setLoadingIds((prev) => {
            const next = new Set(prev);
            next.delete(digest.course.id);
            return next;
          });
        });
    }
  }, [digests, range, summaries]);

  const totalThreads = digests.reduce(
    (sum, d) => sum + d.threads.length,
    0
  );

  const sessionOrder: Record<string, number> = {
    Spring: 1,
    Summer: 2,
    Fall: 3,
    Winter: 4,
  };

  const termGroups = (() => {
    const groups: Record<string, CourseDigest[]> = {};
    for (const d of digests) {
      const term =
        d.course.session && d.course.year
          ? `${d.course.session} ${d.course.year}`
          : d.course.year || "Other";
      if (!groups[term]) groups[term] = [];
      groups[term].push(d);
    }
    return Object.entries(groups).sort(([a], [b]) => {
      const [aSess, aYear] = a.split(" ");
      const [bSess, bYear] = b.split(" ");
      const yearDiff = Number(bYear || 0) - Number(aYear || 0);
      if (yearDiff !== 0) return yearDiff;
      return (sessionOrder[bSess] || 0) - (sessionOrder[aSess] || 0);
    });
  })();

  const [collapsedTerms, setCollapsedTerms] = useState<Set<string>>(() =>
    new Set(termGroups.length > 1 ? termGroups.slice(1).map(([t]) => t) : [])
  );

  const collapsedInitRef = useRef(false);
  useEffect(() => {
    if (termGroups.length > 1 && !collapsedInitRef.current) {
      collapsedInitRef.current = true;
      setCollapsedTerms(new Set(termGroups.slice(1).map(([t]) => t)));
    }
  }, [termGroups]);

  function toggleTerm(term: string) {
    setCollapsedTerms((prev) => {
      const next = new Set(prev);
      if (next.has(term)) next.delete(term);
      else next.add(term);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">
          {range === "day" ? "Today's Digest" : "This Week's Digest"}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {totalThreads} threads across {digests.length} courses
        </p>
      </div>

      {termGroups.map(([term, termDigests]) => {
        const isCollapsed = collapsedTerms.has(term);
        const termThreads = termDigests.reduce((s, d) => s + d.threads.length, 0);
        return (
        <div key={term} className="space-y-4">
          <button
            onClick={() => toggleTerm(term)}
            className="flex items-center gap-2 group"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground/50" />
            )}
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide group-hover:text-foreground transition-colors">
              {term}
            </h3>
            <span className="text-xs text-muted-foreground/50">
              {termDigests.length} courses{termThreads > 0 ? ` · ${termThreads} threads` : ""}
            </span>
          </button>
          {!isCollapsed && <div className="grid gap-4 sm:grid-cols-2">
            {termDigests.map((digest) => {
              const stableIdx = courseColorMap.get(digest.course.id) ?? 0;
              const colors = COURSE_COLORS[stableIdx % COURSE_COLORS.length];
              const questions = digest.threads.filter(
                (t) => t.type === "question"
              ).length;
              const announcements = digest.threads.filter(
                (t) => t.type === "announcement"
              ).length;
              const posts = digest.threads.filter(
                (t) => t.type === "post"
              ).length;
              const isLoading = loadingIds.has(digest.course.id);
              const summary = summaries[digest.course.id] ?? digest.summary;

              return (
                <button
                  key={digest.course.id}
                  onClick={() => onSelectCourse(digest.course.id)}
                  className="group text-left bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden hover:shadow-md hover:border-border transition-all flex"
                >
                  <div className={`w-1.5 shrink-0 ${colors.stripe}`} />
                  <div className="flex-1 min-w-0 p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className={`w-9 h-9 rounded-lg ${colors.bg} flex items-center justify-center shrink-0`}
                      >
                        <BookOpen className={`w-4 h-4 ${colors.text}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-sm text-foreground truncate">
                          {digest.course.code}
                        </h3>
                        <p className="text-xs text-muted-foreground truncate">
                          {digest.course.name}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {digest.threads.length}
                      </span>
                      {questions > 0 && (
                        <span className="flex items-center gap-1">
                          <HelpCircle className="w-3 h-3" />
                          {questions}
                        </span>
                      )}
                      {announcements > 0 && (
                        <span className="flex items-center gap-1 text-amber-600 font-medium">
                          <Megaphone className="w-3 h-3" />
                          {announcements}
                        </span>
                      )}
                      {posts > 0 && (
                        <span className="flex items-center gap-1">
                          {posts} posts
                        </span>
                      )}
                    </div>

                    <div className="min-h-[3rem]">
                      {isLoading && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Generating summary...</span>
                        </div>
                      )}
                      {!isLoading && summary && (
                        <div
                          className={`text-xs leading-relaxed text-foreground/70 ${colors.accent} rounded-lg p-2.5 border ${colors.accentBorder}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            <Sparkles
                              className={`w-3 h-3 ${colors.text}`}
                            />
                            <span
                              className={`font-semibold ${colors.summaryText} uppercase tracking-wide text-[10px]`}
                            >
                              Key Updates
                            </span>
                          </div>
                          <SimpleMarkdown
                            text={summary}
                            className="space-y-1"
                            onThreadLinkClick={(courseId, threadId) => {
                              onSelectCourse(courseId, threadId);
                            }}
                          />
                        </div>
                      )}
                      {!isLoading && !summary && (
                        <p className="text-xs text-muted-foreground/50 italic">
                          No activity to summarize
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>}
        </div>
        );
      })}
    </div>
  );
}
