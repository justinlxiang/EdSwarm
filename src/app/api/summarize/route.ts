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
    resolvedPrompt += `\n\nIMPORTANT: For each bullet point, when it clearly relates to a specific thread, add a link at the end using this EXACT format: [Thread #N](thread:${courseId}:THREAD_ID) where N is the thread's display number (1, 2, 3...) and THREAD_ID is the numeric id= value from the thread list below (e.g. id=90001, id=91002). NEVER use the display number for THREAD_ID — always use the id= value. Example: for "id=90002 number=2" use [Thread #2](thread:${courseId}:90002).\n\nThreads with IDs:\n${threadsWithIds}`;
  }

  const { text } = await generateText({
    model: anthropic("claude-haiku-4-5"),
    system: resolvedSystem,
    prompt: resolvedPrompt,
  });

  return Response.json({ summary: text });
}
