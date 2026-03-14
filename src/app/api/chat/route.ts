import { anthropic } from "@ai-sdk/anthropic";
import {
  streamText,
  convertToModelMessages,
  tool,
  stepCountIs,
  type UIMessage,
  type ModelMessage,
} from "ai";
import { z } from "zod";
import { getServiceClient } from "@/lib/supabase";

export const maxDuration = 60;

const ANTHROPIC_CACHE = {
  anthropic: { cacheControl: { type: "ephemeral" as const } },
};

const DEFAULT_SYSTEM = `You are an AI teaching assistant that helps students understand their course content from Ed Discussion. 
You have access to recent threads, questions, and announcements from the student's courses. 
Be helpful, concise, and encourage learning. When referencing specific threads, mention their titles.
If the student asks you to draft a question for Ed, format it clearly with a title and body.`;

function withCacheControl(messages: ModelMessage[]): ModelMessage[] {
  if (messages.length === 0) return messages;
  return messages.map((msg, i) =>
    i === messages.length - 1
      ? {
          ...msg,
          providerOptions: { ...msg.providerOptions, ...ANTHROPIC_CACHE },
        }
      : msg
  );
}

export async function POST(req: Request) {
  const { messages, system, edUserId } = await req.json();

  const modelMessages = await convertToModelMessages(
    messages as UIMessage[]
  );

  const tools = edUserId
    ? {
        get_file_content: tool({
          description:
            "Retrieve the full content of a course file by its ID. Use this when the student asks about something that likely relates to a specific uploaded course file (syllabus, homework spec, lecture notes, etc.). The file IDs are listed in the system prompt under 'Available course files'.",
          inputSchema: z.object({
            fileId: z.number().describe("The file ID from the course files catalog"),
          }),
          execute: async ({ fileId }: { fileId: number }) => {
            try {
              const sb = getServiceClient();
              const { data: user } = await sb
                .from("users")
                .select("id")
                .eq("ed_user_id", Number(edUserId))
                .single();
              if (!user) return { error: "User not found" };

              const { data: file } = await sb
                .from("course_files")
                .select("file_name, file_content")
                .eq("id", fileId)
                .eq("user_id", user.id)
                .single();
              if (!file) return { error: "File not found" };
              return { fileName: file.file_name, content: file.file_content };
            } catch {
              return { error: "Failed to fetch file" };
            }
          },
        }),
      }
    : undefined;

  const result = streamText({
    model: anthropic("claude-sonnet-4-6"),
    system: system || DEFAULT_SYSTEM,
    messages: withCacheControl(modelMessages),
    tools,
    stopWhen: stepCountIs(3),
  });

  return result.toUIMessageStreamResponse();
}
