import { NextRequest, NextResponse } from "next/server";
import { getThread } from "@/lib/ed-api";

export async function POST(req: NextRequest) {
  try {
    const { token, threadId } = await req.json();
    if (!token || !threadId) {
      return NextResponse.json(
        { error: "Token and threadId are required" },
        { status: 400 }
      );
    }
    const data = await getThread(token, threadId);
    return NextResponse.json(data);
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "Failed to fetch thread";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
