import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";

export const maxDuration = 60;

const DEFAULT_SYSTEM = `You are a course digest summarizer. Create brief, informative summaries of Ed Discussion activity. Use plain text with bullet points (use "- " prefix). Keep it under 150 words. Focus on what matters most to students.`;

export async function POST(req: Request) {
  const { courseCode, courseName, threads, threadsWithIds, courseId, system, prompt } = await req.json();

  const resolvedSystem = system || DEFAULT_SYSTEM;
  let resolvedPrompt =
    prompt ||
    `Summarize these recent Ed Discussion threads for course "${courseCode} - ${courseName}" into a concise digest (3-5 bullet points). Focus on key topics, important announcements, popular questions, and any unresolved issues.\n\nThreads:\n${threads}`;

  // When threadsWithIds and courseId are provided, instruct AI to add thread links
  if (threadsWithIds && courseId) {
    resolvedPrompt += `\n\nIMPORTANT: For each bullet point, when it clearly relates to a specific thread, add a link at the end using this exact format: [View #N](thread:${courseId}:THREAD_ID) where N is the thread's display number and THREAD_ID is the thread's id from the list below. Only add links when a bullet directly references a thread. Use the thread id (not number) for THREAD_ID.\n\nThreads with IDs:\n${threadsWithIds}`;
  }

  const { text } = await generateText({
    model: anthropic("claude-haiku-4-5"),
    system: resolvedSystem,
    prompt: resolvedPrompt,
  });

  return Response.json({ summary: text });
}
