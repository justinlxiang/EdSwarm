"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useRef, useState, useMemo } from "react";
import { SimpleMarkdown } from "./simple-markdown";
import type { UIMessage } from "ai";
import {
  X,
  Send,
  Loader2,
  Bot,
  User,
  Paperclip,
  Trash2,
} from "lucide-react";
import { FileDropZone, type FileItem } from "./file-drop-zone";
import { fetchFileCatalog, buildDemoFileContext } from "@/lib/file-context";
import { DEMO_COURSE_ID } from "@/lib/mock-data";
import { useChatContext } from "@/lib/chat-context";

interface Props {
  open: boolean;
  onClose: () => void;
  context: string;
  token: string;
  courseName?: string;
  courseId?: number;
  edUserId?: number;
  isDemo?: boolean;
  chatKey: string;
}

function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

export function ChatPanel({ open, onClose, context, courseName, courseId, edUserId, isDemo, chatKey }: Props) {
  const { getMessages, saveMessages } = useChatContext();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [showFileDrop, setShowFileDrop] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [fileContext, setFileContext] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevChatKeyRef = useRef<string | null>(null);
  const isRestoringRef = useRef(false);

  useEffect(() => {
    if (isDemo) {
      const idForFiles = courseId ?? DEMO_COURSE_ID;
      setFileContext(buildDemoFileContext(idForFiles));
    } else if (courseId && edUserId) {
      fetchFileCatalog(courseId, edUserId).then(({ catalogText }) => {
        setFileContext(catalogText);
      });
    } else {
      setFileContext("");
    }
  }, [courseId, edUserId, isDemo]);

  const courseInstruction = courseName
    ? `The student has opened this chat specifically for the course "${courseName}". Focus your answers on this course unless they ask about something else. When they say "this course" or "my class", they mean "${courseName}".`
    : "The student is browsing all their courses. Help them with any course they ask about.";

  const systemPrompt = `You are an AI teaching assistant that helps students understand their course content from Ed Discussion.
You have access to recent threads, questions, and announcements from the student's courses.
Be helpful, concise, and encourage learning. When referencing specific threads, mention their titles and numbers.
If the student asks you to draft a question for Ed, format it clearly with a suggested title and body.
If the student shares files (homework, projects), analyze them and help with questions.
${fileContext ? `\nYou have access to the following course files. When the student asks what course files you have, list the file names from the Course files section below. When your answer uses information from a file, reference it by name (e.g. "According to cs101-syllabus.md..." or "The syllabus mentions...") so the student knows the source.${isDemo ? "" : " Use the get_file_content tool to retrieve full file contents when only summaries are shown."}\n${fileContext}` : ""}

${courseInstruction}

Context:
${context || "No specific course context loaded yet."}`;

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
      }),
    []
  );

  const { messages, status, sendMessage, setMessages } = useChat({
    transport,
  });

  const isLoading = status === "submitted" || status === "streaming";

  // Restore messages when chatKey changes (switching course)
  useEffect(() => {
    if (prevChatKeyRef.current !== chatKey) {
      isRestoringRef.current = true;
      const prevKey = prevChatKeyRef.current;
      if (prevKey !== null) {
        saveMessages(prevKey, messages);
      }
      prevChatKeyRef.current = chatKey;
      const stored = getMessages(chatKey);
      setMessages(stored);
      queueMicrotask(() => {
        isRestoringRef.current = false;
      });
    }
  }, [chatKey, messages, getMessages, saveMessages, setMessages]);

  // Persist messages whenever they change (skip during restore to avoid saving wrong data)
  useEffect(() => {
    if (isRestoringRef.current) return;
    if (messages.length > 0) {
      saveMessages(chatKey, messages);
    }
  }, [chatKey, messages, saveMessages]);

  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [messages]);

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!inputValue.trim() && files.length === 0) return;

    let text = inputValue;
    if (files.length > 0) {
      const fileDescriptions = files
        .map((f) => `[Attached file: ${f.name} (${f.type})]`)
        .join("\n");
      text = `${fileDescriptions}\n\n${text}`;
      setFiles([]);
      setShowFileDrop(false);
    }

    sendMessage(
      { text },
      { body: { system: systemPrompt, edUserId } }
    );
    setInputValue("");
  }

  function handleClear() {
    setMessages([]);
    saveMessages(chatKey, []);
    setFiles([]);
    setInputValue("");
  }

  function handleSuggestion(text: string) {
    setInputValue(text);
  }

  if (!open) return null;

  return (
      <div className="w-[400px] shrink-0 bg-white border-l border-border/60 flex flex-col h-[calc(100vh-57px)] sticky top-[57px]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">
              {courseName ? `AI — ${courseName}` : "AI Assistant"}
            </h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleClear}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Clear chat"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <Bot className="w-10 h-10 text-muted-foreground/30" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Ask me anything about your courses
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  I can help summarize threads, explain topics, or draft
                  questions for Ed
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                {[
                  "Summarize today's activity",
                  "What are the key announcements?",
                  "Help me draft a question",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => handleSuggestion(suggestion)}
                    className="text-xs px-3 py-1.5 rounded-full bg-accent text-accent-foreground hover:bg-primary/10 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => {
            const text = getMessageText(m);
            if (!text) return null;
            return (
              <div
                key={m.id}
                className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}
              >
                {m.role === "assistant" && (
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {m.role === "user" ? (
                    <p className="whitespace-pre-wrap">{text}</p>
                  ) : (
                    <SimpleMarkdown text={text} className="space-y-1.5" />
                  )}
                </div>
                {m.role === "user" && (
                  <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            );
          })}

          {isLoading &&
            messages.length > 0 &&
            getMessageText(messages[messages.length - 1]) === "" && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-muted rounded-2xl px-4 py-2.5">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}

          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-border/40 p-3 space-y-2">
          {showFileDrop && (
            <FileDropZone files={files} onFilesChange={setFiles} />
          )}

          <form onSubmit={handleFormSubmit} className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => setShowFileDrop(!showFileDrop)}
              className={`p-2.5 rounded-xl transition-colors shrink-0 ${
                showFileDrop
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              title="Attach files"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask about your courses..."
              className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-muted/30 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary transition-all"
              disabled={isLoading}
            />

            <button
              type="submit"
              disabled={isLoading || (!inputValue.trim() && files.length === 0)}
              className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
  );
}
