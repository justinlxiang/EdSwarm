import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const fileId = req.nextUrl.searchParams.get("fileId");
    const edUserId = req.nextUrl.searchParams.get("edUserId");

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

    const { data: file, error } = await sb
      .from("course_files")
      .select("file_name, file_content")
      .eq("id", Number(fileId))
      .eq("user_id", user.id)
      .single();

    if (error || !file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    return NextResponse.json(file);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to fetch file";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
