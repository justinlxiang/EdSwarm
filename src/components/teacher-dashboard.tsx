"use client";

import { useState, useMemo, useCallback } from "react";
import { useToken } from "@/lib/context";
import type { EdCourseRole, EdThread, AgentConfig } from "@/lib/types";
import { AgentConfigCard } from "./agent-config-card";
import { AnswerReviewPanel } from "./answer-review-panel";
import { GraduationCap, Bot } from "lucide-react";

function roleName(role: string): string {
  switch (role) {
    case "admin":
      return "Instructor";
    case "staff":
      return "Staff";
    case "tutor":
      return "TA";
    default:
      return role;
  }
}

export function TeacherDashboard() {
  const { token, courses } = useToken();

  const [reviewState, setReviewState] = useState<{
    threads: EdThread[];
    config: AgentConfig;
    courseId: number;
    courseName: string;
  } | null>(null);

  const staffCourses = useMemo(
    () =>
      courses.filter(
        (cr) =>
          cr.role.role !== "student" && cr.course.status === "active"
      ),
    [courses]
  );

  const termGroups = useMemo(() => {
    const groups: Record<string, EdCourseRole[]> = {};
    for (const cr of staffCourses) {
      const term =
        cr.course.session && cr.course.year
          ? `${cr.course.session} ${cr.course.year}`
          : cr.course.year || "Other";
      if (!groups[term]) groups[term] = [];
      groups[term].push(cr);
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
  }, [staffCourses]);

  const handleStartAnswering = useCallback(
    (courseId: number, courseName: string) =>
      (threads: EdThread[], config: AgentConfig) => {
        setReviewState({ threads, config, courseId, courseName });
      },
    []
  );

  if (!token) return null;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-500/5 flex items-center justify-center">
            <Bot className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">
              Agent Configuration
            </h2>
            <p className="text-sm text-muted-foreground">
              Configure AI agents to automatically answer student questions on
              your courses.
            </p>
          </div>
        </div>
      </div>

      {staffCourses.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <GraduationCap className="w-12 h-12 text-muted-foreground/30" />
          <h2 className="text-lg font-medium text-foreground">
            No staff courses
          </h2>
          <p className="text-sm text-muted-foreground max-w-sm text-center">
            You are not listed as staff, TA, or instructor on any active
            courses.
          </p>
        </div>
      )}

      <div className="space-y-8">
        {termGroups.map(([term, crs]) => (
          <div key={term}>
            <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider mb-3 px-1">
              {term}
            </p>
            <div className="space-y-3">
              {crs.map((cr) => (
                <AgentConfigCard
                  key={cr.course.id}
                  course={cr.course}
                  roleLabel={roleName(cr.role.role)}
                  token={token}
                  onStartAnswering={handleStartAnswering(
                    cr.course.id,
                    `${cr.course.code} — ${cr.course.name}`
                  )}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {reviewState && (
        <AnswerReviewPanel
          threads={reviewState.threads}
          config={reviewState.config}
          courseName={reviewState.courseName}
          token={token}
          onClose={() => setReviewState(null)}
        />
      )}
    </div>
  );
}
