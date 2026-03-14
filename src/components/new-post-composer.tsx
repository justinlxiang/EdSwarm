"use client";

import { useState, useRef } from "react";
import type { EdCourse, DuplicateMatch } from "@/lib/types";
import { DEMO_TOKEN } from "@/lib/mock-data";
import { addDemoThread } from "@/lib/demo-storage";
import {
  X,
  Send,
  Loader2,
  Sparkles,
  HelpCircle,
  FileText,
  Lock,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Search,
  ExternalLink,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { RichEditor, htmlToEdXml } from "./rich-editor";

interface Props {
  open: boolean;
  onClose: () => void;
  course: EdCourse;
  token: string;
}

type PostType = "question" | "post";

export function NewPostComposer({ open, onClose, course, token }: Props) {
  const [postType, setPostType] = useState<PostType>("question");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("General");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [result, setResult] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateMatch[] | null>(null);
  const [expandedMatch, setExpandedMatch] = useState<number | null>(null);

  const editorRef = useRef<HTMLDivElement>(null);

  const categories =
    course.settings?.discussion?.categories?.map((c) => c.name) ?? ["General"];

  function getEditorHtml(): string {
    return editorRef.current?.innerHTML?.trim() || "";
  }

  function isEditorEmpty(): boolean {
    const text = editorRef.current?.textContent?.trim() || "";
    const hasImages = !!editorRef.current?.querySelector("img");
    return !text && !hasImages;
  }

  async function handleAiDraft() {
    if (!aiPrompt.trim() || aiLoading) return;
    setAiLoading(true);
    setDuplicateMatches(null);

    const currentTitle = title.trim();
    const currentBody = editorRef.current?.textContent?.trim() || "";

    const contextParts: string[] = [];
    if (currentTitle) contextParts.push(`Current title: "${currentTitle}"`);
    if (currentBody) contextParts.push(`Current body: "${currentBody.slice(0, 500)}"`);
    const contextStr = contextParts.length > 0
      ? `\n\nThe student has already written the following (take it into account and build on it):\n${contextParts.join("\n")}`
      : "";

    const draftPromise = fetch("/api/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system: `You are helping a student draft a ${postType} for Ed Discussion in the course "${course.code} - ${course.name}". Output a JSON object with "title" and "body" keys. Generate a concise, descriptive "title". The "body" should be clear, well-structured HTML suitable for a rich text editor (use <p>, <strong>, <em>, <ul>/<li>, <h2>, <code> tags as appropriate). Output ONLY valid JSON, nothing else.`,
        prompt: `Draft a ${postType} about: ${aiPrompt}${contextStr}`,
      }),
    });

    const dupPromise = fetch("/api/agent/check-duplicate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseId: course.id,
        questionTitle: currentTitle || aiPrompt,
        questionContent: currentBody || aiPrompt,
      }),
    }).catch(() => null);

    try {
      const [draftRes, dupRes] = await Promise.all([draftPromise, dupPromise]);

      if (draftRes.ok) {
        const data = await draftRes.json();
        const raw = (data.summary as string).trim();
        const cleaned = raw.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/, "");
        try {
          const parsed = JSON.parse(cleaned);
          if (parsed.title) setTitle(parsed.title);
          if (parsed.body && editorRef.current) {
            editorRef.current.innerHTML = parsed.body;
          }
        } catch {
          if (editorRef.current) {
            editorRef.current.innerHTML = `<p>${raw}</p>`;
          }
        }
      }

      if (dupRes?.ok) {
        const dupData = await dupRes.json();
        if (dupData.hasDuplicates && dupData.matches?.length > 0) {
          setDuplicateMatches(dupData.matches);
        }
      }
    } finally {
      setAiLoading(false);
    }
  }

  async function doPost() {
    setPosting(true);
    setResult(null);

    const contentXml = htmlToEdXml(getEditorHtml());

    try {
      if (token === DEMO_TOKEN) {
        addDemoThread({
          type: postType,
          title,
          category,
          content: contentXml,
          is_private: isPrivate,
          is_anonymous: isAnonymous,
          courseId: course.id,
        });
        setResult({ type: "success", message: "Posted successfully!" });
        setTimeout(() => {
          setTitle("");
          setAiPrompt("");
          setDuplicateMatches(null);
          if (editorRef.current) editorRef.current.innerHTML = "";
          setResult(null);
          onClose();
        }, 1500);
      } else {
        const res = await fetch("/api/ed/post", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            courseId: course.id,
            params: {
              type: postType,
              title,
              category,
              subcategory: "",
              subsubcategory: "",
              content: contentXml,
              is_pinned: false,
              is_private: isPrivate,
              is_anonymous: isAnonymous,
              is_megathread: false,
              anonymous_comments: false,
            },
          }),
        });

        if (res.ok) {
          setResult({ type: "success", message: "Posted successfully!" });
          setTimeout(() => {
            setTitle("");
            setAiPrompt("");
            setDuplicateMatches(null);
            if (editorRef.current) editorRef.current.innerHTML = "";
            setResult(null);
            onClose();
          }, 1500);
        } else {
          const data = await res.json().catch(() => ({}));
          setResult({
            type: "error",
            message: data.error || "Failed to post. Please try again.",
          });
        }
      }
    } catch {
      setResult({ type: "error", message: "Network error. Please try again." });
    } finally {
      setPosting(false);
    }
  }

  async function handleSubmit() {
    if (!title.trim() || isEditorEmpty() || posting || checkingDuplicates) return;

    if (duplicateMatches !== null) {
      await doPost();
      return;
    }

    setCheckingDuplicates(true);
    setResult(null);

    try {
      const questionContent = editorRef.current?.textContent?.trim() || "";
      const res = await fetch("/api/agent/check-duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: course.id,
          questionTitle: title,
          questionContent,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.hasDuplicates && data.matches?.length > 0) {
          setDuplicateMatches(data.matches);
          setCheckingDuplicates(false);
          return;
        }
      }
    } catch {
      // If duplicate check fails, proceed with posting anyway
    }

    setCheckingDuplicates(false);
    await doPost();
  }

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      <div className="fixed inset-x-4 top-[5%] bottom-[5%] mx-auto max-w-2xl bg-white rounded-2xl border border-border/60 shadow-2xl z-50 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border/40">
          <h2 className="font-semibold text-foreground">
            New {postType === "question" ? "Question" : "Post"} in{" "}
            {course.code}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Type toggle */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Type
            </label>
            <div className="flex items-center bg-muted rounded-lg p-0.5 w-fit">
              <button
                onClick={() => setPostType("question")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  postType === "question"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <HelpCircle className="w-4 h-4" />
                Question
              </button>
              <button
                onClick={() => setPostType("post")}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  postType === "post"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <FileText className="w-4 h-4" />
                Post
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label
              htmlFor="post-title"
              className="block text-xs font-medium text-muted-foreground mb-1.5"
            >
              Title
            </label>
            <input
              id="post-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a descriptive title..."
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-muted/30 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary transition-all"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Category
            </label>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    category === cat
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-white text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Rich Editor */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Content
            </label>
            <RichEditor
              token={token}
              editorRef={editorRef}
              placeholder="Write your question or post content..."
            />
          </div>

          {/* AI Draft Helper */}
          <div className="p-3 rounded-xl bg-accent/50 border border-primary/10">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary">
                AI Draft Helper
              </span>
            </div>
            <div className="flex gap-2">
              <input
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Describe what you want to ask or post about..."
                className="flex-1 px-3 py-2 rounded-lg border border-border bg-white text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary transition-all"
                onKeyDown={(e) => e.key === "Enter" && handleAiDraft()}
              />
              <button
                onClick={handleAiDraft}
                disabled={aiLoading || !aiPrompt.trim()}
                className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors shrink-0"
              >
                {aiLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Draft"
                )}
              </button>
            </div>
          </div>

          {/* Privacy options */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-ring/30"
              />
              <Lock className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-sm text-foreground">Private</span>
              <span className="text-[10px] text-muted-foreground">
                Visible to you and staff only
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary focus:ring-ring/30"
              />
              <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-sm text-foreground">Anonymous</span>
              <span className="text-[10px] text-muted-foreground">
                Hide your name from students
              </span>
            </label>
          </div>

          {/* Duplicate matches panel */}
          {duplicateMatches && duplicateMatches.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-amber-200/60">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="text-sm font-semibold text-amber-800">
                  Similar questions already asked
                </span>
                <span className="text-xs text-amber-600 ml-auto">
                  {duplicateMatches.length} match{duplicateMatches.length !== 1 && "es"}
                </span>
              </div>
              <div className="divide-y divide-amber-200/40">
                {duplicateMatches.map((match) => {
                  const isExpanded = expandedMatch === match.threadId;
                  const badge =
                    match.relevance === "exact_duplicate"
                      ? { label: "Exact duplicate", cls: "bg-red-100 text-red-700" }
                      : match.relevance === "likely_answered"
                        ? { label: "Likely answered", cls: "bg-amber-100 text-amber-700" }
                        : { label: "Related", cls: "bg-blue-100 text-blue-700" };
                  return (
                    <div key={match.threadId} className="px-4 py-3">
                      <button
                        onClick={() =>
                          setExpandedMatch(isExpanded ? null : match.threadId)
                        }
                        className="w-full text-left"
                      >
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${badge.cls}`}
                              >
                                {badge.label}
                              </span>
                              <span className="text-xs text-amber-600/80">
                                #{match.threadNumber}
                              </span>
                            </div>
                            <p className="text-sm font-medium text-amber-900 leading-snug">
                              {match.title}
                            </p>
                            <p className="text-xs text-amber-700/70 mt-0.5">
                              {match.explanation}
                            </p>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                          )}
                        </div>
                      </button>
                      {isExpanded && match.answerSnippet && (
                        <div className="mt-2 p-3 rounded-lg bg-white/80 border border-amber-200/40">
                          <p className="text-xs font-medium text-amber-700 mb-1">
                            Existing answer:
                          </p>
                          <p className="text-sm text-foreground/80 leading-relaxed">
                            {match.answerSnippet}
                          </p>
                          <a
                            href={`https://edstem.org/us/courses/${course.id}/discussion/${match.threadNumber}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                            View on Ed
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 px-4 py-3 border-t border-amber-200/60 bg-amber-50">
                <button
                  onClick={() => {
                    setDuplicateMatches(null);
                    setExpandedMatch(null);
                  }}
                  className="px-4 py-2 rounded-lg border border-amber-300 text-sm font-medium text-amber-800 hover:bg-amber-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={posting}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors"
                >
                  {posting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {posting ? "Posting..." : "Post Anyway"}
                </button>
              </div>
            </div>
          )}

          {/* Result message */}
          {result && (
            <div
              className={`flex items-center gap-2 p-3 rounded-xl text-sm ${
                result.type === "success"
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {result.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              {result.message}
            </div>
          )}
        </div>

        {/* Submit bar */}
        <div className="border-t border-border/40 px-5 py-3 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Posting as {postType} to {course.code} &middot; {category}
            {isPrivate && " · Private"}
            {isAnonymous && " · Anonymous"}
          </p>
          {!duplicateMatches && (
            <button
              onClick={handleSubmit}
              disabled={posting || checkingDuplicates || !title.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {checkingDuplicates ? (
                <>
                  <Search className="w-4 h-4 animate-pulse" />
                  Checking for similar questions...
                </>
              ) : posting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Posting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Post to Ed
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
