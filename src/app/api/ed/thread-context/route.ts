import { NextRequest, NextResponse } from "next/server";
import { readCache } from "@/lib/thread-cache";

export async function POST(req: NextRequest) {
  try {
    const { courseIds } = await req.json();

    if (!courseIds || !Array.isArray(courseIds) || courseIds.length === 0) {
      return NextResponse.json(
        { error: "courseIds array is required" },
        { status: 400 }
      );
    }

    const sections: string[] = [];

    for (const courseId of courseIds) {
      const cache = readCache(courseId);
      if (!cache || cache.threads.length === 0) continue;

      const threadLines = cache.threads.slice(0, 100).map((t) => {
        let line = `[#${t.number}] "${t.title}" (${t.category})`;
        if (t.isAnswered) line += " [ANSWERED]";
        line += `: ${t.contentText.slice(0, 200)}`;
        if (t.answers.length > 0) {
          const best = t.answers.find((a) => a.isEndorsed) ?? t.answers[0];
          line += `\n  → Answer: ${best.text.slice(0, 200)}`;
        }
        return line;
      });

      sections.push(
        `Course ${courseId} (${cache.threadCount} threads total, showing ${threadLines.length}):\n${threadLines.join("\n")}`
      );
    }

    return NextResponse.json({
      context: sections.join("\n\n") || "No cached threads available.",
    });
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "Failed to load thread context";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
