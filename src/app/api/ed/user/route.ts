import { NextRequest, NextResponse } from "next/server";
import { getUserInfo } from "@/lib/ed-api";

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }
    const data = await getUserInfo(token);
    return NextResponse.json(data);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to fetch user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
