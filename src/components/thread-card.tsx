"use client";

import { useState, useRef, useEffect } from "react";
import type { EdThread, EdComment, EdThreadDetail } from "@/lib/types";
import { DEMO_TOKEN } from "@/lib/mock-data";
import { getDemoThreadDetail, addDemoComment } from "@/lib/demo-storage";
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
  PenLine,
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
  expandThreadId?: number | null;
  threadRef?: (el: HTMLDivElement | null) => void;
  /** Display number (1 = most recent). When provided, used instead of thread.number. */
  displayNumber?: number;
}

export function ThreadCard({ thread, token, expandThreadId, threadRef, displayNumber }: ThreadCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<EdThreadDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMode, setAiMode] = useState<"write" | "draft" | "ask">("write");
  const [postingReply, setPostingReply] = useState(false);
  const [replyResult, setReplyResult] = useState<"success" | "error" | null>(null);
  const aiResponseRef = useRef<HTMLDivElement>(null);

  const preview = stripXml(thread.document || thread.content);

  async function fetchDetail() {
    if (detail || loadingDetail) return;
    setLoadingDetail(true);
    try {
      if (token === DEMO_TOKEN) {
        const data = getDemoThreadDetail(thread.id);
        if (data) setDetail(data);
      } else {
        const res = await fetch("/api/ed/thread", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, threadId: thread.id }),
        });
        if (res.ok) {
          const data: EdThreadDetail = await res.json();
          setDetail(data);
        }
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
    if (expandThreadId === thread.id && !expanded) {
      setExpanded(true);
      fetchDetail();
    }
  }, [expandThreadId, thread.id]);

  useEffect(() => {
    if (aiResponse) {
      aiResponseRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [aiResponse]);

  async function handleDirectPost(e: React.FormEvent) {
    e.preventDefault();
    if (!aiInput.trim() || postingReply) return;
    setPostingReply(true);
    setReplyResult(null);

    try {
      let ok = false;
      if (token === DEMO_TOKEN) {
        addDemoComment(thread.id, aiInput, "comment");
        ok = true;
      } else {
        const res = await fetch("/api/ed/comment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            threadId: thread.id,
            content: aiInput,
            document: `<paragraph>${aiInput}</paragraph>`,
          }),
        });
        ok = res.ok;
      }
      setReplyResult(ok ? "success" : "error");
      if (ok) {
        setTimeout(() => {
          setAiInput("");
          setReplyResult(null);
        }, 2000);
      }
    } catch {
      setReplyResult("error");
    } finally {
      setPostingReply(false);
    }
  }

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

  async function handlePostReply() {
    if (!aiResponse || postingReply) return;
    setPostingReply(true);
    setReplyResult(null);

    try {
      let ok = false;
      if (token === DEMO_TOKEN) {
        addDemoComment(thread.id, aiResponse, "comment");
        ok = true;
      } else {
        const res = await fetch("/api/ed/comment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            threadId: thread.id,
            content: aiResponse,
            document: `<paragraph>${aiResponse}</paragraph>`,
          }),
        });
        ok = res.ok;
      }
      setReplyResult(ok ? "success" : "error");
      if (ok) {
        setTimeout(() => {
          setAiResponse("");
          setAiInput("");
          setReplyResult(null);
        }, 2000);
      }
    } catch {
      setReplyResult("error");
    } finally {
      setPostingReply(false);
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
      ref={threadRef}
      data-thread-id={thread.id}
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
              #{displayNumber ?? thread.number} {thread.title}
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
                onClick={() => setAiMode("write")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  aiMode === "write"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <PenLine className="w-3 h-3" />
                Write Reply
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
                AI Draft
              </button>
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
            </div>

            {replyResult === "success" && aiMode === "write" && (
              <div className="flex items-center gap-1.5 text-green-600 text-xs font-medium mb-2">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Reply posted!
              </div>
            )}
            {replyResult === "error" && aiMode === "write" && (
              <div className="text-xs text-red-500 mb-2">
                Failed to post reply. Please try again.
              </div>
            )}

            <form
              onSubmit={aiMode === "write" ? handleDirectPost : handleAiSubmit}
              className="flex items-center gap-2"
            >
              <input
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                placeholder={
                  aiMode === "write"
                    ? "Type your reply..."
                    : aiMode === "draft"
                      ? "Describe what you want to reply..."
                      : "Ask a question about this thread..."
                }
                className="flex-1 px-3 py-2 rounded-lg border border-border bg-muted/30 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary transition-all"
                disabled={aiLoading || postingReply}
                onClick={(e) => e.stopPropagation()}
              />
              <button
                type="submit"
                disabled={aiLoading || postingReply || !aiInput.trim()}
                className={`p-2 rounded-lg text-primary-foreground hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0 ${
                  aiMode === "write" ? "bg-green-600 hover:bg-green-700" : "bg-primary hover:bg-primary/90"
                }`}
                onClick={(e) => e.stopPropagation()}
                title={aiMode === "write" ? "Post reply to Ed" : undefined}
              >
                {aiLoading || postingReply ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </form>

            {aiResponse && (
              <div
                ref={aiResponseRef}
                className="mt-3 rounded-xl bg-accent/60 border border-primary/10 overflow-hidden"
              >
                <div className="p-3">
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

                {aiMode === "draft" && (
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-primary/5 border-t border-primary/10">
                    {replyResult === "success" ? (
                      <div className="flex items-center gap-1.5 text-green-600 text-xs font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Reply posted!
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePostReply();
                          }}
                          disabled={postingReply}
                          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                        >
                          {postingReply ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Send className="w-3.5 h-3.5" />
                          )}
                          {postingReply ? "Posting..." : "Post Reply to Ed"}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAiResponse("");
                            setReplyResult(null);
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                          Discard
                        </button>
                        {replyResult === "error" && (
                          <span className="text-xs text-red-500 ml-auto">
                            Failed to post
                          </span>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
