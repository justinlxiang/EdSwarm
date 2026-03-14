import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import type { SupabaseClient } from "@supabase/supabase-js";

async function generateFileSummary(
  sb: SupabaseClient,
  fileId: number,
  fileName: string,
  fileContent: string
) {
  const { text } = await generateText({
    model: anthropic("claude-haiku-4-5"),
    system:
      "Summarize this course material in 2-3 sentences. Focus on what topics and information it contains. Be specific about key details (dates, assignments, policies, concepts).",
    prompt: `File: ${fileName}\n\n${fileContent.slice(0, 12000)}`,
  });
  await sb
    .from("course_files")
    .update({ file_summary: text })
    .eq("id", fileId);
}

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
      .select("id, file_name, file_size, created_at")
      .eq("user_id", user.id)
      .eq("course_id", Number(courseId))
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ files: files ?? [] });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to fetch files";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { edUserId, courseId, fileName, fileContent } = await req.json();

    if (!edUserId || !courseId || !fileName || !fileContent) {
      return NextResponse.json(
        { error: "edUserId, courseId, fileName, and fileContent are required" },
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
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { data: file, error } = await sb
      .from("course_files")
      .insert({
        user_id: user.id,
        course_id: Number(courseId),
        file_name: fileName,
        file_content: fileContent,
        file_size: new Blob([fileContent]).size,
      })
      .select("id, file_name, file_size, created_at")
      .single();

    if (error) throw error;

    // Fire-and-forget: generate a summary so the upload returns immediately
    generateFileSummary(sb, file.id, fileName, fileContent).catch(() => {});

    return NextResponse.json({ file });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to upload file";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { fileId, edUserId } = await req.json();

    if (!fileId || !edUserId) {
      return NextResponse.json(
        { error: "fileId and edUserId are required" },
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
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { error } = await sb
      .from("course_files")
      .delete()
      .eq("id", fileId)
      .eq("user_id", user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to delete file";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
