import { NextRequest, NextResponse } from "next/server";
import { postComment } from "@/lib/ed-api";

export async function POST(req: NextRequest) {
  try {
    const { token, threadId, content, document } = await req.json();

    if (!token || !threadId) {
      return NextResponse.json(
        { error: "Missing token or threadId" },
        { status: 400 }
      );
    }

    const result = await postComment(
      token,
      threadId,
      content || "",
      document || `<paragraph>${content || ""}</paragraph>`
    );
    return NextResponse.json(result);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to post comment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
