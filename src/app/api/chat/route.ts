import { anthropic } from "@ai-sdk/anthropic";
import {
  streamText,
  convertToModelMessages,
  type UIMessage,
  type ModelMessage,
} from "ai";

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
  const { messages, system } = await req.json();

  const modelMessages = await convertToModelMessages(
    messages as UIMessage[]
  );

  const result = streamText({
    model: anthropic("claude-sonnet-4-6"),
    system: system || DEFAULT_SYSTEM,
    messages: withCacheControl(modelMessages),
  });

  return result.toUIMessageStreamResponse();
}
