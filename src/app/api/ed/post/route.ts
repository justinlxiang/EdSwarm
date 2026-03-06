import { NextRequest, NextResponse } from "next/server";
import { postThread } from "@/lib/ed-api";

export async function POST(req: NextRequest) {
  try {
    const { token, courseId, params } = await req.json();
    if (!token || !courseId || !params) {
      return NextResponse.json(
        { error: "Token, courseId, and params are required" },
        { status: 400 }
      );
    }
    const data = await postThread(token, courseId, params);
    return NextResponse.json(data);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to post thread";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
