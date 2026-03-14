import { NextRequest, NextResponse } from "next/server";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

export const maxDuration = 60;

const FALLBACK_SYSTEM = `You are a course teaching assistant agent. Answer the student's question clearly and helpfully based on the provided course context and instructions. If the question is outside your scope, say so politely.`;

export async function POST(req: NextRequest) {
  try {
    const { system, context, questionTitle, questionContent } = await req.json();

    if (!questionTitle && !questionContent) {
      return NextResponse.json(
        { error: "Missing question content" },
        { status: 400 }
      );
    }

    const systemPrompt = system || FALLBACK_SYSTEM;

    const parts: string[] = [];
    if (context) {
      parts.push(`<course_context>\n${context}\n</course_context>`);
    }
    parts.push(
      `<student_question>\nTitle: ${questionTitle}\n\n${questionContent}\n</student_question>`
    );
    parts.push(
      "Please provide a helpful answer to this student question. Be concise and accurate. Use the course context if relevant. When your answer draws on information from an uploaded course file, reference it by name (e.g. \"According to the syllabus...\" or \"As described in hw3_spec.md...\") so the student knows where to find more detail."
    );

    const { text } = await generateText({
      model: anthropic("claude-sonnet-4-6"),
      system: systemPrompt,
      prompt: parts.join("\n\n"),
    });

    return NextResponse.json({ answer: text });
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "Failed to generate answer";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
