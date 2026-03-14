import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

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
      return NextResponse.json({ config: null });
    }

    const { data: row, error } = await sb
      .from("agent_configs")
      .select(
        "instructions, allowed_categories, blocked_categories, auto_answer_enabled, updated_at"
      )
      .eq("user_id", user.id)
      .eq("course_id", Number(courseId))
      .maybeSingle();

    if (error) throw error;

    if (!row) {
      return NextResponse.json({ config: null });
    }

    return NextResponse.json({
      config: {
        instructions: row.instructions,
        allowedCategories: row.allowed_categories,
        blockedCategories: row.blocked_categories,
        autoAnswerEnabled: row.auto_answer_enabled,
      },
    });
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "Failed to fetch agent config";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const {
      edUserId,
      courseId,
      instructions,
      allowedCategories,
      blockedCategories,
      autoAnswerEnabled,
    } = await req.json();

    if (!edUserId || !courseId) {
      return NextResponse.json(
        { error: "edUserId and courseId are required" },
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

    const { error } = await sb.from("agent_configs").upsert(
      {
        user_id: user.id,
        course_id: Number(courseId),
        instructions: instructions ?? "",
        allowed_categories: allowedCategories ?? [],
        blocked_categories: blockedCategories ?? [],
        auto_answer_enabled: autoAnswerEnabled ?? false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,course_id" }
    );

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "Failed to save agent config";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { edUserId, courseId } = await req.json();

    if (!edUserId || !courseId) {
      return NextResponse.json(
        { error: "edUserId and courseId are required" },
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
      .from("agent_configs")
      .delete()
      .eq("user_id", user.id)
      .eq("course_id", Number(courseId));

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "Failed to delete agent config";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
