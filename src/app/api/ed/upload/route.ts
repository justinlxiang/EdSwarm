import { NextRequest, NextResponse } from "next/server";
import { uploadFile } from "@/lib/ed-api";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const token = formData.get("token") as string;
    const file = formData.get("file") as File;

    if (!token || !file) {
      return NextResponse.json(
        { error: "Token and file are required" },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    const data = await uploadFile(token, buffer, file.name, file.type);
    return NextResponse.json(data);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to upload file";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
