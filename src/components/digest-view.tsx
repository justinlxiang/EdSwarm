"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useToken } from "@/lib/context";
import { useCourseDigests } from "@/hooks/use-courses";
import type { CourseDigest, TimeRange } from "@/lib/types";
import { COURSE_COLORS } from "./course-digest";
import { HomeOverview } from "./home-overview";
import { CourseDetailView } from "./course-detail-view";
import { ChatPanel } from "./chat-panel";
import { TeacherDashboard } from "./teacher-dashboard";
import { LandingPage } from "./landing-page";
import {
  Calendar,
  CalendarDays,
  RefreshCw,
  LogOut,
  Loader2,
  Inbox,
  MessageSquareText,
  Home,
  BookOpen,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";

function stripXml(xml: string): string {
  return xml
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function DigestView() {
  const { token, user, courses, clearSession, isDemo } = useToken();
  const { digests, loading, error, fetchDigests, setDigests } =
    useCourseDigests();
  const [range, setRange] = useState<TimeRange>("day");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatContext, setChatContext] = useState<string>("");
  const [chatCourseName, setChatCourseName] = useState<string | undefined>();
  const [chatCourseId, setChatCourseId] = useState<number | undefined>();
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [expandThreadId, setExpandThreadId] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedTerms, setExpandedTerms] = useState<Set<string> | null>(null);
  const [viewMode, setViewMode] = useState<"student" | "teacher">("student");
  const [showLanding, setShowLanding] = useState(false);
  const router = useRouter();

  const isStaff = useMemo(
    () => courses.some((cr) => cr.role.role !== "student"),
    [courses]
  );
  const hasFetched = useRef(false);

  useEffect(() => {
    if (!token) {
      router.push("/");
      return;
    }
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchDigests(token, courses, range);
      for (const cr of courses) {
        if (cr.course.status === "active") {
          syncCourseThreads(cr.course.id);
        }
      }
    }
  }, [token, courses, range, fetchDigests, router]);

  function handleRangeChange(newRange: TimeRange) {
    if (newRange === range) return;
    setRange(newRange);
    hasFetched.current = false;
  }

  useEffect(() => {
    if (!hasFetched.current && token) {
      hasFetched.current = true;
      fetchDigests(token, courses, range);
    }
  }, [range, token, courses, fetchDigests]);

  function handleRefresh() {
    if (!token) return;
    fetchDigests(token, courses, range);
  }

  function handleLogout() {
    clearSession();
    router.push("/");
  }

  async function fetchFullContext(courseIds: number[]): Promise<string> {
    try {
      const res = await fetch("/api/ed/thread-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseIds }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.context) return data.context;
      }
    } catch {}
    return "";
  }

  function handleAskAbout(courseCode: string, courseIdArg: number) {
    const courseDigest = digests.find((d) => d.course.code === courseCode);
    if (!courseDigest) return;

    setChatCourseName(`${courseCode} — ${courseDigest.course.name}`);
    setChatCourseId(courseIdArg);
    setChatOpen(true);

    const recentFallback = courseDigest.threads
      .slice(0, 30)
      .map((t) => {
        const body = stripXml(t.document || t.content).slice(0, 300);
        let line = `[#${t.number}] "${t.title}" (${t.category}, ${t.reply_count} replies)${t.is_answered ? " [ANSWERED]" : ""}: ${body}`;
        if (t.answers && t.answers.length > 0) {
          const best = t.answers.find((a) => a.is_endorsed) ?? t.answers[0];
          line += `\n  → Answer: ${stripXml(best.document || best.content).slice(0, 300)}`;
        }
        return line;
      })
      .join("\n");
    setChatContext(
      `Course: ${courseCode} - ${courseDigest.course.name}\n\nRecent threads:\n${recentFallback}`
    );

    const fallbackLength = recentFallback.length;
    fetchFullContext([courseDigest.course.id]).then((full) => {
      if (full && full.length > fallbackLength) {
        setChatContext(
          `Course: ${courseCode} - ${courseDigest.course.name}\n\nAll threads:\n${full}`
        );
      }
    });
  }

  const syncedCourses = useRef(new Set<number>());

  function syncCourseThreads(courseId: number) {
    if (!token || syncedCourses.current.has(courseId)) return;
    syncedCourses.current.add(courseId);
    fetch("/api/ed/sync-threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, courseId }),
    }).catch(() => {});
  }

  function handleSelectCourse(courseId: number, threadId?: number) {
    setSelectedCourseId(courseId);
    setExpandThreadId(threadId ?? null);
    setSidebarOpen(false);
    syncCourseThreads(courseId);
  }

  // Sync chat panel to current page when course changes (chat stays open, switches context)
  const activeChatKey = selectedCourseId ? String(selectedCourseId) : "main";
  useEffect(() => {
    if (!chatOpen) return;
    if (selectedCourseId === null) {
      setChatCourseId(undefined);
      setChatCourseName(undefined);
      const richContext = digests
        .map((d) => {
          const threadList = d.threads
            .slice(0, 20)
            .map((t) => {
              const body = stripXml(t.document || t.content).slice(0, 300);
              let line = `[#${t.number}] "${t.title}" (${t.category}, ${t.reply_count} replies)${t.is_answered ? " [ANSWERED]" : ""}: ${body}`;
              if (t.answers && t.answers.length > 0) {
                const best = t.answers.find((a) => a.is_endorsed) ?? t.answers[0];
                line += `\n  → Answer: ${stripXml(best.document || best.content).slice(0, 300)}`;
              }
              return line;
            })
            .join("\n");
          return `${d.course.code} - ${d.course.name} (${d.threads.length} recent threads):\n${threadList}`;
        })
        .join("\n\n");
      setChatContext(richContext);
      const allCourseIds = courses
        .filter((cr) => cr.course.status === "active")
        .map((cr) => cr.course.id);
      fetchFullContext(allCourseIds).then((full) => {
        if (full && full.length > richContext.length) setChatContext(full);
      });
    } else {
      const digest = digests.find((d) => d.course.id === selectedCourseId);
      if (digest) {
        setChatCourseId(digest.course.id);
        setChatCourseName(`${digest.course.code} — ${digest.course.name}`);
        const recentFallback = digest.threads
          .slice(0, 30)
          .map((t) => {
            const body = stripXml(t.document || t.content).slice(0, 300);
            let line = `[#${t.number}] "${t.title}" (${t.category}, ${t.reply_count} replies)${t.is_answered ? " [ANSWERED]" : ""}: ${body}`;
            if (t.answers && t.answers.length > 0) {
              const best = t.answers.find((a) => a.is_endorsed) ?? t.answers[0];
              line += `\n  → Answer: ${stripXml(best.document || best.content).slice(0, 300)}`;
            }
            return line;
          })
          .join("\n");
        setChatContext(
          `Course: ${digest.course.code} - ${digest.course.name}\n\nRecent threads:\n${recentFallback}`
        );
        fetchFullContext([digest.course.id]).then((full) => {
          if (full && full.length > recentFallback.length) {
            setChatContext(
              `Course: ${digest.course.code} - ${digest.course.name}\n\nAll threads:\n${full}`
            );
          }
        });
      }
    }
  }, [chatOpen, selectedCourseId, digests, courses]);

  const generateSummary = useCallback(
    async (digest: CourseDigest): Promise<string> => {
      const threadData = digest.threads
        .slice(0, 30)
        .map(
          (t) =>
            `- [${t.type}] id=${t.id} number=${t.number} "${t.title}" (${t.category}, ${t.reply_count} replies, ${t.vote_count} votes)${t.is_answered ? " [ANSWERED]" : ""}${t.is_pinned ? " [PINNED]" : ""}: ${stripXml(t.document || t.content).slice(0, 200)}`
        )
        .join("\n");

      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseCode: digest.course.code,
          courseName: digest.course.name,
          threads: threadData,
          threadsWithIds: threadData,
          courseId: digest.course.id,
        }),
      });

      if (!res.ok) throw new Error("Failed to generate summary");
      const data = await res.json();

      setDigests((prev) =>
        prev.map((d) =>
          d.course.id === digest.course.id
            ? { ...d, summary: data.summary }
            : d
        )
      );

      return data.summary;
    },
    [setDigests]
  );

  const termGroups = useMemo(() => {
    const groups: Record<string, CourseDigest[]> = {};
    for (const d of digests) {
      const term =
        d.course.session && d.course.year
          ? `${d.course.session} ${d.course.year}`
          : d.course.year || "Other";
      if (!groups[term]) groups[term] = [];
      groups[term].push(d);
    }
    const sessionOrder: Record<string, number> = {
      Spring: 1,
      Summer: 2,
      Fall: 3,
      Winter: 4,
    };
    return Object.entries(groups).sort(([a], [b]) => {
      const [aSess, aYear] = a.split(" ");
      const [bSess, bYear] = b.split(" ");
      const yearDiff = Number(bYear || 0) - Number(aYear || 0);
      if (yearDiff !== 0) return yearDiff;
      return (sessionOrder[bSess] || 0) - (sessionOrder[aSess] || 0);
    });
  }, [digests]);

  const collapsedTerms = useMemo(() => {
    if (expandedTerms !== null) {
      const all = new Set(termGroups.map(([t]) => t));
      const collapsed = new Set<string>();
      for (const t of all) {
        if (!expandedTerms.has(t)) collapsed.add(t);
      }
      return collapsed;
    }
    return new Set(termGroups.slice(1).map(([t]) => t));
  }, [termGroups, expandedTerms]);

  const courseColorMap = useMemo(() => {
    const map = new Map<number, number>();
    for (const cr of courses) {
      // Stable hash from course ID so colors don't shift between logins
      let h = cr.course.id;
      h = ((h >>> 16) ^ h) * 0x45d9f3b;
      h = ((h >>> 16) ^ h) * 0x45d9f3b;
      h = (h >>> 16) ^ h;
      map.set(cr.course.id, Math.abs(h) % COURSE_COLORS.length);
    }
    return map;
  }, [courses]);

  if (!token) return null;

  const activeCourseCount = courses.filter(
    (c) => c.course.status === "active"
  ).length;

  const selectedDigest = selectedCourseId
    ? digests.find((d) => d.course.id === selectedCourseId)
    : null;
  const selectedColorIndex = selectedCourseId
    ? (courseColorMap.get(selectedCourseId) ?? 0)
    : 0;


  function toggleTerm(term: string) {
    setExpandedTerms((prev) => {
      const current = prev ?? new Set([termGroups[0]?.[0]]);
      const next = new Set(current);
      if (next.has(term)) {
        next.delete(term);
      } else {
        next.add(term);
      }
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      {/* Header - unchanged */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-border/40">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              {sidebarOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
            <div
              onClick={() => setShowLanding(true)}
              className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <img
                src="/logo-inverted.png"
                alt="Ed Swarm"
                className="w-7 h-7"
              />
              <h1 className="text-xl font-bold text-foreground tracking-tight">
                Ed Swarm
              </h1>
            </div>
            {user && (
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {user.name}
              </span>
            )}

            {isStaff && (
              <div className="flex items-center bg-muted rounded-lg p-0.5 ml-2">
                <button
                  onClick={() => setViewMode("student")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === "student"
                      ? "bg-white text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Student</span>
                </button>
                <button
                  onClick={() => setViewMode("teacher")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === "teacher"
                      ? "bg-white text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Teacher</span>
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {viewMode === "student" && <div className="flex items-center bg-muted rounded-lg p-0.5">
              <button
                onClick={() => handleRangeChange("day")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  range === "day"
                    ? "bg-white text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Today</span>
              </button>
              <button
                onClick={() => handleRangeChange("week")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  range === "week"
                    ? "bg-white text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">This Week</span>
              </button>
            </div>}

            {viewMode === "student" && (
              <>
                <button
                  onClick={handleRefresh}
                  disabled={loading}
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title="Refresh"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                  />
                </button>

                <button
                  onClick={() => {
                    if (chatOpen) {
                      setChatOpen(false);
                    } else if (selectedDigest) {
                      handleAskAbout(selectedDigest.course.code, selectedDigest.course.id);
                    } else {
                      setChatCourseName(undefined);
                      setChatCourseId(undefined);
                      setChatOpen(true);

                      const richContext = digests
                        .map((d) => {
                          const threadList = d.threads
                            .slice(0, 20)
                            .map((t) => {
                              const body = stripXml(t.document || t.content).slice(0, 300);
                              let line = `[#${t.number}] "${t.title}" (${t.category}, ${t.reply_count} replies)${t.is_answered ? " [ANSWERED]" : ""}: ${body}`;
                              if (t.answers && t.answers.length > 0) {
                                const best = t.answers.find((a) => a.is_endorsed) ?? t.answers[0];
                                line += `\n  → Answer: ${stripXml(best.document || best.content).slice(0, 300)}`;
                              }
                              return line;
                            })
                            .join("\n");
                          return `${d.course.code} - ${d.course.name} (${d.threads.length} recent threads):\n${threadList}`;
                        })
                        .join("\n\n");
                      setChatContext(richContext);

                      const allCourseIds = courses
                        .filter((cr) => cr.course.status === "active")
                        .map((cr) => cr.course.id);
                      fetchFullContext(allCourseIds).then((full) => {
                        if (full && full.length > richContext.length) setChatContext(full);
                      });
                    }
                  }}
                  className={`p-2 rounded-lg transition-colors ${
                    chatOpen
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                  title={chatOpen ? "Close AI Chat" : "Open AI Chat"}
                >
                  <MessageSquareText className="w-4 h-4" />
                </button>
              </>
            )}

            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-red-50 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {showLanding ? (
        <LandingPage
          onEnterDashboard={() => {
            setShowLanding(false);
            setSelectedCourseId(null);
          }}
          userName={user?.name}
        />
      ) : viewMode === "teacher" ? (
        <main className="flex-1 min-w-0 p-6 lg:p-8">
          <TeacherDashboard />
        </main>
      ) : (
        <div className="flex">
          {/* Mobile sidebar overlay */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-black/20 z-20 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Sidebar */}
          <aside
            className={`fixed lg:sticky top-[57px] left-0 z-20 h-[calc(100vh-57px)] w-60 bg-white/90 backdrop-blur-lg border-r border-border/40 overflow-y-auto transition-transform lg:transition-none lg:translate-x-0 shrink-0 ${
              sidebarOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <nav className="p-3 space-y-1">
            <button
              onClick={() => {
                setSelectedCourseId(null);
                setExpandThreadId(null);
                setSidebarOpen(false);
              }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCourseId === null
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                <Home className="w-4 h-4" />
                Home
              </button>

              {termGroups.map(([term, termDigests]) => {
                const isCollapsed = collapsedTerms.has(term);
                return (
                <div key={term}>
                  <button
                    onClick={() => toggleTerm(term)}
                    className="w-full flex items-center gap-1.5 pt-3 pb-1 px-3 group"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
                    ) : (
                      <ChevronDown className="w-3 h-3 text-muted-foreground/50" />
                    )}
                    <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider group-hover:text-muted-foreground transition-colors">
                      {term}
                    </p>
                    {isCollapsed && (
                      <span className="text-[10px] text-muted-foreground/40 ml-auto">
                        {termDigests.length}
                      </span>
                    )}
                  </button>
                  {!isCollapsed && termDigests.map((digest) => {
                    const stableIdx = courseColorMap.get(digest.course.id) ?? 0;
                    const colors =
                      COURSE_COLORS[stableIdx % COURSE_COLORS.length];
                    const isActive = selectedCourseId === digest.course.id;
                    return (
                      <button
                        key={digest.course.id}
                        onClick={() => handleSelectCourse(digest.course.id)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                          isActive
                            ? "bg-muted font-medium text-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                        }`}
                      >
                        <div
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${colors.stripe}`}
                        />
                        <span className="truncate flex-1 text-left">
                          {digest.course.code}
                        </span>
                        {digest.threads.length > 0 && (
                          <span
                            className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${
                              isActive
                                ? `${colors.bg} ${colors.text}`
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {digest.threads.length}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                );
              })}

              {loading && digests.length === 0 && (
                <div className="px-3 py-4 space-y-2">
                  {Array.from({ length: Math.min(activeCourseCount || 3, 5) }).map(
                    (_, i) => (
                      <div
                        key={i}
                        className="h-8 bg-muted/60 rounded-lg animate-pulse"
                      />
                    )
                  )}
                </div>
              )}
            </nav>
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0 p-6 lg:p-8">
            <div className="max-w-4xl mx-auto">
              {loading && digests.length === 0 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">
                      Loading {activeCourseCount} active courses...
                    </p>
                  </div>
                  {Array.from({
                    length: Math.min(activeCourseCount || 3, 4),
                  }).map((_, i) => (
                    <div
                      key={i}
                      className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden animate-pulse"
                    >
                      <div className="p-5 border-b border-border/40">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-muted" />
                          <div className="space-y-2 flex-1">
                            <div className="h-4 bg-muted rounded w-24" />
                            <div className="h-3 bg-muted rounded w-48" />
                          </div>
                        </div>
                      </div>
                      <div className="p-5 space-y-3">
                        <div className="h-10 bg-muted rounded-xl" />
                        {[1, 2, 3].map((j) => (
                          <div key={j} className="h-20 bg-muted/60 rounded-xl" />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {error && !loading && (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                    <span className="text-destructive text-lg">!</span>
                  </div>
                  <p className="text-destructive font-medium">{error}</p>
                  <button
                    onClick={handleRefresh}
                    className="text-sm text-primary hover:underline"
                  >
                    Try again
                  </button>
                </div>
              )}

              {!loading && !error && digests.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <Inbox className="w-12 h-12 text-muted-foreground/30" />
                  <h2 className="text-lg font-medium text-foreground">
                    All caught up
                  </h2>
                  <p className="text-sm text-muted-foreground max-w-sm text-center">
                    No new activity in the{" "}
                    {range === "day" ? "last 24 hours" : "last 7 days"} across
                    your active courses.
                  </p>
                  <button
                    onClick={() =>
                      handleRangeChange(range === "day" ? "week" : "day")
                    }
                    className="mt-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    Try {range === "day" ? "this week" : "today"} instead
                  </button>
                </div>
              )}

              {!loading && digests.length > 0 && !selectedDigest && (
              <HomeOverview
                digests={digests}
                onSelectCourse={handleSelectCourse}
                range={range}
                courseColorMap={courseColorMap}
                onSummaryGenerated={(courseId, summary) => {
                  setDigests((prev) =>
                    prev.map((d) =>
                      d.course.id === courseId ? { ...d, summary } : d
                    )
                  );
                }}
              />
              )}

              {!loading && selectedDigest && (
                <CourseDetailView
                  key={selectedDigest.course.id}
                  digest={selectedDigest}
                  token={token}
                  colorIndex={selectedColorIndex}
                  onAskAbout={handleAskAbout}
                  onGenerateSummary={generateSummary}
                  expandThreadId={expandThreadId}
                  onThreadLinkClick={(courseId, threadId) => {
                    handleSelectCourse(courseId, threadId);
                  }}
                />
              )}

              {!loading &&
                selectedCourseId &&
                !selectedDigest &&
                digests.length > 0 && (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <BookOpen className="w-12 h-12 text-muted-foreground/30" />
                    <h2 className="text-lg font-medium text-foreground">
                      No recent activity
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      This course has no threads in the selected time range.
                    </p>
                    <button
                      onClick={() => setSelectedCourseId(null)}
                      className="mt-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                    >
                      Back to Home
                    </button>
                  </div>
                )}
            </div>
          </main>

          {chatOpen && (
            <ChatPanel
              open={true}
              onClose={() => setChatOpen(false)}
              context={chatContext}
              token={token}
              courseName={chatCourseName}
              courseId={chatCourseId}
              edUserId={user?.id}
              chatKey={activeChatKey}
              isDemo={isDemo}
            />
          )}
        </div>
      )}
    </div>
  );
}
