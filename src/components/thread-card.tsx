"use client";

import { useState, useRef, useEffect } from "react";
import type { EdThread, EdComment, EdThreadDetail } from "@/lib/types";
import {
  MessageSquare,
  Eye,
  ThumbsUp,
  CheckCircle2,
  Pin,
  ChevronDown,
  ChevronUp,
  Loader2,
  Bot,
  Send,
  Sparkles,
  User,
  Reply,
  Award,
} from "lucide-react";

function stripXml(xml: string): string {
  return xml
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function CommentBubble({
  comment,
  users,
  depth = 0,
}: {
  comment: EdComment;
  users: Map<number, string>;
  depth?: number;
}) {
  const text = stripXml(comment.document || comment.content);
  const authorName = comment.is_anonymous
    ? "Anonymous"
    : users.get(comment.user_id) || "Unknown";
  const isAnswer = comment.type === "answer";

  return (
    <div className={depth > 0 ? "ml-5 mt-2" : "mt-2.5"}>
      <div
        className={`rounded-xl p-3 text-sm ${
          isAnswer
            ? "bg-green-50 border border-green-200/60"
            : "bg-muted/50 border border-border/40"
        }`}
      >
        <div className="flex items-center gap-2 mb-1.5">
          <div
            className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
              isAnswer ? "bg-green-100" : "bg-muted"
            }`}
          >
            {isAnswer ? (
              <Award className="w-3 h-3 text-green-600" />
            ) : (
              <User className="w-3 h-3 text-muted-foreground" />
            )}
          </div>
          <span className="text-xs font-medium text-foreground">
            {authorName}
          </span>
          {isAnswer && (
            <span className="text-[10px] font-semibold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full uppercase">
              Answer
            </span>
          )}
          {comment.is_endorsed && (
            <CheckCircle2 className="w-3 h-3 text-green-500" />
          )}
          <span className="text-[10px] text-muted-foreground ml-auto">
            {timeAgo(comment.created_at)}
          </span>
        </div>
        <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap">
          {text}
        </p>
        {comment.vote_count > 0 && (
          <div className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground">
            <ThumbsUp className="w-3 h-3" />
            {comment.vote_count}
          </div>
        )}
      </div>

      {comment.comments?.map((reply) => (
        <CommentBubble
          key={reply.id}
          comment={reply}
          users={users}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}

interface ThreadCardProps {
  thread: EdThread;
  token: string;
}

export function ThreadCard({ thread, token }: ThreadCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<EdThreadDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMode, setAiMode] = useState<"ask" | "draft">("ask");
  const aiResponseRef = useRef<HTMLDivElement>(null);

  const preview = stripXml(thread.document || thread.content);

  async function fetchDetail() {
    if (detail || loadingDetail) return;
    setLoadingDetail(true);
    try {
      const res = await fetch("/api/ed/thread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, threadId: thread.id }),
      });
      if (res.ok) {
        const data: EdThreadDetail = await res.json();
        setDetail(data);
      }
    } finally {
      setLoadingDetail(false);
    }
  }

  function handleToggle() {
    const next = !expanded;
    setExpanded(next);
    if (next) fetchDetail();
  }

  useEffect(() => {
    if (aiResponse) {
      aiResponseRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [aiResponse]);

  async function handleAiSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!aiInput.trim() || aiLoading) return;

    setAiLoading(true);
    setAiResponse("");

    const threadContext = stripXml(
      (detail?.thread?.document || detail?.thread?.content) ??
        thread.document ??
        thread.content
    ).slice(0, 2000);

    const allComments = [
      ...(detail?.thread?.answers ?? []),
      ...(detail?.thread?.comments ?? []),
    ];
    const commentContext = allComments
      .slice(0, 15)
      .map((c) => {
        const authorName = detail?.users?.find((u) => u.id === c.user_id)?.name ?? "Unknown";
        return `${authorName} (${c.type}): ${stripXml(c.document || c.content).slice(0, 300)}`;
      })
      .join("\n");

    const systemPrompt =
      aiMode === "draft"
        ? `You are helping a student draft a reply comment for an Ed Discussion thread. Write a clear, well-formatted comment that the student can post as a reply. Output ONLY the comment text, nothing else. Be helpful and concise.`
        : `You are an AI teaching assistant. The student is asking about a specific Ed Discussion thread. Answer their question using the thread context. Be concise and helpful.`;

    const userPrompt =
      aiMode === "draft"
        ? `Thread: "${thread.title}"\n\nThread body:\n${threadContext}\n\nExisting comments:\n${commentContext}\n\nDraft a reply about: ${aiInput}`
        : `Thread: "${thread.title}"\n\nThread body:\n${threadContext}\n\nExisting comments:\n${commentContext}\n\nStudent question: ${aiInput}`;

    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: systemPrompt,
          prompt: userPrompt,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiResponse(data.summary);
      } else {
        setAiResponse("Failed to get AI response. Please try again.");
      }
    } catch {
      setAiResponse("Failed to get AI response. Please try again.");
    } finally {
      setAiLoading(false);
    }
  }

  const userMap = new Map<number, string>();
  if (detail?.users) {
    for (const u of detail.users) {
      userMap.set(u.id, u.name);
    }
  }

  const answers = detail?.thread?.answers ?? [];
  const comments = detail?.thread?.comments ?? [];
  const totalResponses = answers.length + comments.length;

  return (
    <div
      className={`border rounded-xl transition-all ${
        expanded
          ? "border-primary/30 shadow-md bg-white"
          : "border-border/60 hover:bg-muted/30"
      }`}
    >
      <div
        className="p-4 cursor-pointer select-none"
        onClick={handleToggle}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {thread.is_pinned && (
                <Pin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              )}
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-accent text-accent-foreground">
                {thread.category}
              </span>
              {thread.type === "question" && thread.is_answered && (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
              )}
            </div>
            <h4 className="font-semibold text-sm text-foreground leading-snug">
              #{thread.number} {thread.title}
            </h4>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {timeAgo(thread.created_at)}
            </span>
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </div>

        <div className="mt-2.5 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MessageSquare className="w-3.5 h-3.5" />
            {thread.reply_count}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" />
            {thread.unique_view_count}
          </span>
          <span className="flex items-center gap-1">
            <ThumbsUp className="w-3.5 h-3.5" />
            {thread.vote_count}
          </span>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border/40">
          {/* Thread body */}
          <div className="px-4 pt-3 pb-2">
            <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
              {preview}
            </p>
          </div>

          {/* Comments section */}
          <div className="px-4 pb-3">
            {loadingDetail && (
              <div className="flex items-center gap-2 py-4 justify-center text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading comments...
              </div>
            )}

            {!loadingDetail && detail && totalResponses === 0 && (
              <p className="text-xs text-muted-foreground py-3 text-center">
                No replies yet
              </p>
            )}

            {!loadingDetail && detail && totalResponses > 0 && (
              <div className="mt-1">
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  {totalResponses} {totalResponses === 1 ? "reply" : "replies"}
                </p>
                <div className="max-h-80 overflow-y-auto pr-1">
                  {answers.map((a) => (
                    <CommentBubble key={a.id} comment={a} users={userMap} />
                  ))}
                  {comments.map((c) => (
                    <CommentBubble key={c.id} comment={c} users={userMap} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* AI input bar */}
          <div className="px-4 pb-4 border-t border-border/30 pt-3">
            <div className="flex items-center bg-muted rounded-lg p-0.5 mb-2 w-fit">
              <button
                onClick={() => setAiMode("ask")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  aiMode === "ask"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Sparkles className="w-3 h-3" />
                Ask AI
              </button>
              <button
                onClick={() => setAiMode("draft")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  aiMode === "draft"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Reply className="w-3 h-3" />
                Draft Reply
              </button>
            </div>

            <form onSubmit={handleAiSubmit} className="flex items-center gap-2">
              <input
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                placeholder={
                  aiMode === "draft"
                    ? "Describe what you want to reply..."
                    : "Ask a question about this thread..."
                }
                className="flex-1 px-3 py-2 rounded-lg border border-border bg-muted/30 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary transition-all"
                disabled={aiLoading}
                onClick={(e) => e.stopPropagation()}
              />
              <button
                type="submit"
                disabled={aiLoading || !aiInput.trim()}
                className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                {aiLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </form>

            {aiResponse && (
              <div
                ref={aiResponseRef}
                className="mt-3 p-3 rounded-xl bg-accent/60 border border-primary/10"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Bot className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[10px] font-semibold text-primary uppercase tracking-wide">
                    {aiMode === "draft" ? "Draft Reply" : "AI Answer"}
                  </span>
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                  {aiResponse}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
