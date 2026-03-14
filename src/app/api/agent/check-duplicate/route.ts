import { NextRequest, NextResponse } from "next/server";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText, tool, stepCountIs } from "ai";
import { z } from "zod";
import { searchCache, getThreadFromCache } from "@/lib/thread-cache";
import type { DuplicateCheckResult, DuplicateMatch } from "@/lib/types";

export const maxDuration = 60;

const SYSTEM_PROMPT = `You are a duplicate-question detector for an Ed Discussion course forum.

Your job: determine if a student's new question has ALREADY been asked and/or answered in the course. Be aggressive about finding matches — it's better to flag a potential duplicate than to miss one.

You have two tools:
1. searchThreads - keyword search through all past threads. Call with short keyword phrases (2-4 words).
2. getThreadDetail - get full content and answers for a specific thread.

Strategy:
1. Search with 2-3 SHORT keyword queries extracted from the question (e.g. "late submission", "homework due date")
2. For any thread that looks relevant, use getThreadDetail to check its answers
3. Respond with your JSON verdict

IMPORTANT: After your tool calls, you MUST respond with a JSON object. Do not make any more tool calls after you have enough information.

Response format (no markdown, no backticks, ONLY the JSON):
{
  "hasDuplicates": true/false,
  "matches": [
    {
      "threadId": number,
      "threadNumber": number,
      "title": "string",
      "relevance": "exact_duplicate" | "likely_answered" | "related",
      "answerSnippet": "first 200 chars of existing answer, or empty string",
      "explanation": "why this matches"
    }
  ]
}

Relevance levels:
- "exact_duplicate" = same question asked again
- "likely_answered" = existing thread's answer covers this question
- "related" = same topic, partially relevant

Set hasDuplicates to true if ANY match has relevance "exact_duplicate" or "likely_answered".`;

export async function POST(req: NextRequest) {
  try {
    const { courseId, questionTitle, questionContent } = await req.json();

    if (!courseId || (!questionTitle && !questionContent)) {
      return NextResponse.json(
        { error: "Missing courseId or question content" },
        { status: 400 }
      );
    }

    const searchHits = new Map<number, { threadId: number; threadNumber: number; title: string; isAnswered: boolean; snippet: string }>();

    const { text, steps } = await generateText({
      model: anthropic("claude-haiku-4-5"),
      system: SYSTEM_PROMPT,
      tools: {
        searchThreads: tool({
          description:
            "Search past course threads by keywords. Use short 2-4 word queries.",
          inputSchema: z.object({
            query: z
              .string()
              .describe("Short keyword query (2-4 words)"),
          }),
          execute: async ({ query }) => {
            const results = searchCache(courseId, query);
            for (const r of results) {
              if (!searchHits.has(r.id)) {
                searchHits.set(r.id, {
                  threadId: r.id,
                  threadNumber: r.number,
                  title: r.title,
                  isAnswered: r.isAnswered,
                  snippet: r.snippet,
                });
              }
            }
            if (results.length === 0)
              return { results: [], message: "No matches found" };
            return {
              results: results.map((r) => ({
                threadId: r.id,
                threadNumber: r.number,
                title: r.title,
                snippet: r.snippet,
                isAnswered: r.isAnswered,
                category: r.category,
              })),
            };
          },
        }),
        getThreadDetail: tool({
          description:
            "Get full content and answers for a specific thread by ID.",
          inputSchema: z.object({
            threadId: z.number().describe("The thread ID to retrieve"),
          }),
          execute: async ({ threadId }) => {
            const thread = getThreadFromCache(courseId, threadId);
            if (!thread)
              return { error: "Thread not found in cache" };
            return {
              id: thread.id,
              number: thread.number,
              title: thread.title,
              content: thread.contentText,
              category: thread.category,
              isAnswered: thread.isAnswered,
              answers: thread.answers.map((a) => ({
                text: a.text,
                isEndorsed: a.isEndorsed,
              })),
            };
          },
        }),
      },
      stopWhen: stepCountIs(8),
      prompt: `Student's new question:\nTitle: ${questionTitle || "(no title)"}\n\nContent: ${questionContent || "(no content)"}\n\nSearch the course threads to check if this has already been asked or answered. Use short keyword searches, then respond with JSON.`,
    });

    let result: DuplicateCheckResult | null = null;

    // Try parsing the final text response
    if (text) {
      try {
        const cleaned = text.replace(/```json\s*|\s*```/g, "").trim();
        result = JSON.parse(cleaned);
      } catch {
        // Try to find JSON anywhere in the text
        const jsonMatch = text.match(/\{[\s\S]*"hasDuplicates"[\s\S]*\}/);
        if (jsonMatch) {
          try {
            result = JSON.parse(jsonMatch[0]);
          } catch {}
        }
      }
    }

    // Also check steps for any text that contains JSON (in case last step had it)
    if (!result && steps) {
      for (const step of [...steps].reverse()) {
        if (step.text) {
          try {
            const cleaned = step.text.replace(/```json\s*|\s*```/g, "").trim();
            const parsed = JSON.parse(cleaned);
            if ("hasDuplicates" in parsed) {
              result = parsed;
              break;
            }
          } catch {}
        }
      }
    }

    // Fallback: if LLM didn't produce valid JSON but search found answered threads,
    // build a result from the search hits
    if (!result && searchHits.size > 0) {
      const answeredHits = Array.from(searchHits.values()).filter(
        (h) => h.isAnswered
      );
      if (answeredHits.length > 0) {
        const matches: DuplicateMatch[] = answeredHits.slice(0, 5).map((h) => {
          const full = getThreadFromCache(courseId, h.threadId);
          const answerText = full?.answers?.[0]?.text ?? "";
          return {
            threadId: h.threadId,
            threadNumber: h.threadNumber,
            title: h.title,
            relevance: "related" as const,
            answerSnippet: answerText.slice(0, 200),
            explanation: "This thread may be related to your question and has an existing answer.",
          };
        });
        result = { hasDuplicates: true, matches };
      }
    }

    return NextResponse.json(result ?? { hasDuplicates: false, matches: [] });
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "Failed to check for duplicates";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
