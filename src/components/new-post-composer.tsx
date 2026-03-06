"use client";

import { useState, useRef } from "react";
import type { EdCourse } from "@/lib/types";
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

    const currentTitle = title.trim();
    const currentBody = editorRef.current?.textContent?.trim() || "";
    const hasTitle = currentTitle.length > 0;

    const contextParts: string[] = [];
    if (currentTitle) contextParts.push(`Current title: "${currentTitle}"`);
    if (currentBody) contextParts.push(`Current body: "${currentBody.slice(0, 500)}"`);
    const contextStr = contextParts.length > 0
      ? `\n\nThe student has already written the following (take it into account and build on it):\n${contextParts.join("\n")}`
      : "";

    const titleInstruction = hasTitle
      ? 'The student already has a title, so set "title" to null.'
      : 'The student has no title yet, so generate a concise, descriptive "title".';

    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: `You are helping a student draft a ${postType} for Ed Discussion in the course "${course.code} - ${course.name}". Output a JSON object with "title" and "body" keys. ${titleInstruction} The "body" should be clear, well-structured HTML suitable for a rich text editor (use <p>, <strong>, <em>, <ul>/<li>, <h2>, <code> tags as appropriate). Output ONLY valid JSON, nothing else.`,
          prompt: `Draft a ${postType} about: ${aiPrompt}${contextStr}`,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        try {
          const parsed = JSON.parse(data.summary);
          if (!hasTitle && parsed.title) setTitle(parsed.title);
          if (parsed.body && editorRef.current) {
            editorRef.current.innerHTML = parsed.body;
          }
        } catch {
          if (editorRef.current) {
            editorRef.current.innerHTML = `<p>${data.summary}</p>`;
          }
        }
      }
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSubmit() {
    if (!title.trim() || isEditorEmpty() || posting) return;
    setPosting(true);
    setResult(null);

    const contentXml = htmlToEdXml(getEditorHtml());

    try {
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
    } catch {
      setResult({ type: "error", message: "Network error. Please try again." });
    } finally {
      setPosting(false);
    }
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
          <button
            onClick={handleSubmit}
            disabled={posting || !title.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {posting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {posting ? "Posting..." : "Post to Ed"}
          </button>
        </div>
      </div>
    </>
  );
}
