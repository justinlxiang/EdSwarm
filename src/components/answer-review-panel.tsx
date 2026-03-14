"use client";

import { useState, useCallback } from "react";
import type { EdThread, AgentConfig, AnswerReviewItem } from "@/lib/types";
import { DEMO_TOKEN } from "@/lib/mock-data";
import { addDemoComment } from "@/lib/demo-storage";
import {
  X,
  Loader2,
  Check,
  XCircle,
  CheckCheck,
  XOctagon,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Send,
} from "lucide-react";

function stripXml(xml: string): string {
  return xml.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

interface Props {
  threads: EdThread[];
  config: AgentConfig;
  courseName: string;
  token: string;
  onClose: () => void;
}

export function AnswerReviewPanel({
  threads,
  config,
  courseName,
  token,
  onClose,
}: Props) {
  const [items, setItems] = useState<AnswerReviewItem[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generatingIndex, setGeneratingIndex] = useState(-1);
  const [generationDone, setGenerationDone] = useState(false);
  const [posting, setPosting] = useState<Set<number>>(new Set());
  const [posted, setPosted] = useState<Set<number>>(new Set());
  const [expandedItem, setExpandedItem] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const contextText = config.contextChunks
    .map((c) => `--- ${c.name} ---\n${c.content}`)
    .join("\n\n");

  const generateAnswers = useCallback(async () => {
    setGenerating(true);
    setError(null);
    const results: AnswerReviewItem[] = [];

    for (let i = 0; i < threads.length; i++) {
      const thread = threads[i];
      setGeneratingIndex(i);
      try {
        const res = await fetch("/api/agent/answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system: config.instructions,
            context: contextText,
            questionTitle: thread.title,
            questionContent: stripXml(thread.document || thread.content),
          }),
        });
        if (!res.ok) throw new Error("Failed to generate answer");
        const data = await res.json();
        results.push({
          threadId: thread.id,
          threadTitle: thread.title,
          threadContent: stripXml(thread.document || thread.content),
          category: thread.category,
          answer: data.answer,
          editedAnswer: data.answer,
          status: "pending",
        });
      } catch {
        results.push({
          threadId: thread.id,
          threadTitle: thread.title,
          threadContent: stripXml(thread.document || thread.content),
          category: thread.category,
          answer: "",
          editedAnswer: "",
          status: "dismissed",
        });
      }
      setItems([...results]);
    }

    setGenerating(false);
    setGenerationDone(true);
    setGeneratingIndex(-1);
  }, [threads, config.instructions, contextText]);

  const updateItemAnswer = useCallback((index: number, answer: string) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, editedAnswer: answer } : item))
    );
  }, []);

  const setItemStatus = useCallback(
    (index: number, status: "approved" | "dismissed") => {
      setItems((prev) =>
        prev.map((item, i) => (i === index ? { ...item, status } : item))
      );
    },
    []
  );

  const approveAll = useCallback(() => {
    setItems((prev) =>
      prev.map((item) =>
        item.status === "pending" && item.answer
          ? { ...item, status: "approved" }
          : item
      )
    );
  }, []);

  const dismissAll = useCallback(() => {
    setItems((prev) =>
      prev.map((item) =>
        item.status === "pending" ? { ...item, status: "dismissed" } : item
      )
    );
  }, []);

  const postAnswer = useCallback(
    async (index: number) => {
      const item = items[index];
      if (!item || item.status !== "approved") return;

      setPosting((prev) => new Set(prev).add(index));
      try {
        if (token === DEMO_TOKEN) {
          addDemoComment(item.threadId, item.editedAnswer, "answer");
        } else {
          const res = await fetch("/api/ed/comment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              token,
              threadId: item.threadId,
              content: item.editedAnswer,
              document: `<paragraph>${item.editedAnswer}</paragraph>`,
            }),
          });
          if (!res.ok) throw new Error("Failed to post");
        }
        setPosted((prev) => new Set(prev).add(index));
      } catch (err) {
        setError(`Failed to post answer for "${item.threadTitle}"`);
      } finally {
        setPosting((prev) => {
          const next = new Set(prev);
          next.delete(index);
          return next;
        });
      }
    },
    [items, token]
  );

  const postAllApproved = useCallback(async () => {
    const approved = items
      .map((item, i) => ({ item, i }))
      .filter(({ item, i }) => item.status === "approved" && !posted.has(i));

    for (const { i } of approved) {
      await postAnswer(i);
    }
  }, [items, posted, postAnswer]);

  const approvedCount = items.filter((i) => i.status === "approved").length;
  const postedCount = posted.size;
  const pendingCount = items.filter((i) => i.status === "pending").length;

  return (
    <div className="bg-white rounded-2xl border border-primary/20 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Answer Review
          </h2>
          <p className="text-sm text-muted-foreground">
            {threads.length} unanswered question{threads.length !== 1 && "s"}{" "}
            found
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-3">
          {threads.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <MessageSquare className="w-10 h-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                No unanswered questions match your filters.
              </p>
            </div>
          )}

          {threads.length > 0 && !generationDone && !generating && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <p className="text-sm text-muted-foreground text-center max-w-md">
                Ready to generate AI answers for {threads.length} unanswered
                question{threads.length !== 1 && "s"}. The agent will use your
                configured instructions and context.
              </p>
              <button
                onClick={generateAnswers}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                Generate Answers
              </button>
            </div>
          )}

          {generating && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/5 border border-primary/20">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <p className="text-sm text-primary font-medium">
                Generating answer {generatingIndex + 1} of {threads.length}...
              </p>
            </div>
          )}

          {items.map((item, i) => {
            const isExpanded = expandedItem === i;
            const isPosted = posted.has(i);
            const isPosting = posting.has(i);

            return (
              <div
                key={item.threadId}
                className={`rounded-xl border overflow-hidden transition-colors ${
                  item.status === "approved"
                    ? "border-emerald-200 bg-emerald-50/30"
                    : item.status === "dismissed"
                      ? "border-border/30 bg-muted/20 opacity-60"
                      : "border-border/60 bg-white"
                }`}
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setExpandedItem(isExpanded ? null : i)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpandedItem(isExpanded ? null : i); } }}
                  className="w-full px-4 py-3 flex items-center gap-3 text-left cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {item.threadTitle}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.category}
                      {isPosted && (
                        <span className="ml-2 text-emerald-600 font-medium">
                          Posted
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {item.status === "pending" && !isPosted && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setItemStatus(i, "approved");
                          }}
                          className="p-1.5 rounded-lg hover:bg-emerald-100 text-muted-foreground hover:text-emerald-600 transition-colors"
                          title="Approve"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setItemStatus(i, "dismissed");
                          }}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-destructive transition-colors"
                          title="Dismiss"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {item.status === "approved" && !isPosted && (
                      <span className="text-xs font-medium text-emerald-600 px-2 py-0.5 rounded-full bg-emerald-100">
                        Approved
                      </span>
                    )}
                    {item.status === "dismissed" && (
                      <span className="text-xs font-medium text-muted-foreground px-2 py-0.5 rounded-full bg-muted">
                        Dismissed
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t border-border/30 pt-3">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        Question
                      </p>
                      <p className="text-sm text-foreground bg-muted/40 rounded-lg px-3 py-2 max-h-24 overflow-y-auto">
                        {item.threadContent.slice(0, 500)}
                        {item.threadContent.length > 500 && "..."}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        Draft Answer
                      </p>
                      <textarea
                        value={item.editedAnswer}
                        onChange={(e) => updateItemAnswer(i, e.target.value)}
                        disabled={isPosted}
                        className="w-full h-32 px-3 py-2 rounded-lg border border-border bg-white text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
                      />
                    </div>
                    {item.status === "approved" && !isPosted && (
                      <button
                        onClick={() => postAnswer(i)}
                        disabled={isPosting}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                      >
                        {isPosting ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        Post to Ed
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

      {/* Footer */}
      {generationDone && items.length > 0 && (
        <div className="px-5 py-4 border-t border-border/40 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            {approvedCount} approved · {postedCount} posted · {pendingCount}{" "}
            pending
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={dismissAll}
              disabled={pendingCount === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-40 transition-colors"
            >
              <XOctagon className="w-3.5 h-3.5" />
              Dismiss All
            </button>
            <button
              onClick={approveAll}
              disabled={pendingCount === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 text-sm text-emerald-700 hover:bg-emerald-50 disabled:opacity-40 transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Approve All
            </button>
            <button
              onClick={postAllApproved}
              disabled={
                approvedCount === 0 || approvedCount === postedCount
              }
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              Post All Approved
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
