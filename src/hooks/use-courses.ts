"use client";

import { useState, useCallback } from "react";
import type { EdCourseRole, EdThread, CourseDigest, TimeRange } from "@/lib/types";
import { DEMO_TOKEN } from "@/lib/mock-data";
import { getDemoThreads } from "@/lib/demo-storage";

function filterThreadsByTime(threads: EdThread[], range: TimeRange): EdThread[] {
  const now = new Date();
  const cutoff = new Date(
    range === "day"
      ? now.getTime() - 24 * 60 * 60 * 1000
      : now.getTime() - 7 * 24 * 60 * 60 * 1000
  );
  return threads
    .filter((t) => new Date(t.created_at) >= cutoff)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function useCourseDigests() {
  const [digests, setDigests] = useState<CourseDigest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDigests = useCallback(
    async (token: string, courses: EdCourseRole[], range: TimeRange) => {
      setLoading(true);
      setError(null);

      try {
        const activeCourses = courses.filter(
          (c) => c.course.status === "active"
        );

        if (token === DEMO_TOKEN) {
          const all: CourseDigest[] = activeCourses.map((cr) => {
            const threads = getDemoThreads().filter(
              (t) => t.course_id === cr.course.id
            );
            const filtered = filterThreadsByTime(threads, range);
            return { course: cr.course, threads: filtered };
          });
          all.sort((a, b) => b.threads.length - a.threads.length);
          setDigests(all);
          setLoading(false);
          return;
        }

        const results = await Promise.allSettled(
          activeCourses.map(async (cr) => {
            const res = await fetch("/api/ed/threads", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                token,
                courseId: cr.course.id,
                limit: 100,
              }),
            });
            if (!res.ok) throw new Error("Failed to fetch threads");
            const data = await res.json();
            const allThreads: EdThread[] = data.threads || data;
            const filtered = filterThreadsByTime(allThreads, range);
            return {
              course: cr.course,
              threads: filtered,
            } as CourseDigest;
          })
        );

        const all: CourseDigest[] = results.map((r, i) =>
          r.status === "fulfilled"
            ? r.value
            : { course: activeCourses[i].course, threads: [] }
        );

        all.sort((a, b) => b.threads.length - a.threads.length);

        setDigests(all);
      } catch {
        setError("Failed to load course digests");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { digests, loading, error, fetchDigests, setDigests };
}
