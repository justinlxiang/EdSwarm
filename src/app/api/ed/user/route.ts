import { NextRequest, NextResponse } from "next/server";
import { getUserInfo } from "@/lib/ed-api";
import { getServiceClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }
    const data = await getUserInfo(token);

    try {
      const sb = getServiceClient();
      await sb.from("users").upsert(
        {
          ed_user_id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          ed_token: token,
          avatar: data.user.avatar,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "ed_user_id" }
      );
    } catch {
      // Non-critical: don't block login if Supabase is down
    }

    return NextResponse.json(data);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to fetch user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
