import { NextRequest, NextResponse } from "next/server";
import { listThreads } from "@/lib/ed-api";

export async function POST(req: NextRequest) {
  try {
    const { token, courseId, limit, offset, sort } = await req.json();
    if (!token || !courseId) {
      return NextResponse.json(
        { error: "Token and courseId are required" },
        { status: 400 }
      );
    }
    const data = await listThreads(token, courseId, limit, offset, sort);
    return NextResponse.json(data);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to fetch threads";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
