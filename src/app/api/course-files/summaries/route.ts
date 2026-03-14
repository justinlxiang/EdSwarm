import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

export async function GET(req: NextRequest) {
  try {
    const courseId = req.nextUrl.searchParams.get("courseId");
    const edUserId = req.nextUrl.searchParams.get("edUserId");

    if (!courseId || !edUserId) {
      return NextResponse.json(
        { error: "courseId and edUserId are required" },
        { status: 400 }
      );
    }

    const sb = getServiceClient();

    const { data: user } = await sb
      .from("users")
      .select("id")
      .eq("ed_user_id", Number(edUserId))
      .single();

    if (!user) {
      return NextResponse.json({ files: [] });
    }

    const { data: files, error } = await sb
      .from("course_files")
      .select("id, file_name, file_size, file_summary")
      .eq("user_id", user.id)
      .eq("course_id", Number(courseId))
      .order("created_at", { ascending: false });

    if (error) throw error;

    const result = files ?? [];

    // Lazy backfill: generate summaries for files that don't have one yet
    const missing = result.filter((f) => !f.file_summary);
    if (missing.length > 0) {
      backfillSummaries(sb, user.id, missing.map((f) => f.id)).catch(() => {});
    }

    return NextResponse.json({ files: result });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to fetch summaries";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function backfillSummaries(
  sb: ReturnType<typeof getServiceClient>,
  userId: number,
  fileIds: number[]
) {
  for (const fileId of fileIds) {
    try {
      const { data: file } = await sb
        .from("course_files")
        .select("file_name, file_content")
        .eq("id", fileId)
        .eq("user_id", userId)
        .single();
      if (!file) continue;

      const { text } = await generateText({
        model: anthropic("claude-haiku-4-5"),
        system:
          "Summarize this course material in 2-3 sentences. Focus on what topics and information it contains. Be specific about key details (dates, assignments, policies, concepts).",
        prompt: `File: ${file.file_name}\n\n${file.file_content.slice(0, 12000)}`,
      });

      await sb
        .from("course_files")
        .update({ file_summary: text })
        .eq("id", fileId);
    } catch {
      // Skip files that fail to summarize
    }
  }
}
