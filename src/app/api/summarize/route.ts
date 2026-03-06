import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

export const maxDuration = 60;

const DEFAULT_SYSTEM = `You are a course digest summarizer. Create brief, informative summaries of Ed Discussion activity. Use plain text with bullet points (use "- " prefix). Keep it under 150 words. Focus on what matters most to students.`;

export async function POST(req: Request) {
  const { courseCode, courseName, threads, system, prompt } = await req.json();

  const resolvedSystem = system || DEFAULT_SYSTEM;
  const resolvedPrompt =
    prompt ||
    `Summarize these recent Ed Discussion threads for course "${courseCode} - ${courseName}" into a concise digest (3-5 bullet points). Focus on key topics, important announcements, popular questions, and any unresolved issues.\n\nThreads:\n${threads}`;

  const { text } = await generateText({
    model: anthropic("claude-3-5-haiku-latest"),
    system: resolvedSystem,
    prompt: resolvedPrompt,
  });

  return Response.json({ summary: text });
}
