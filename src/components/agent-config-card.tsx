"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { EdCourse, EdCategory, AgentConfig, EdThread } from "@/lib/types";
import { getAgentConfig, saveAgentConfig, clearAgentConfig } from "@/lib/agent-storage";
import { getDemoFileChunks } from "@/lib/file-context";
import { DEMO_TOKEN } from "@/lib/mock-data";
import { getDemoThreads } from "@/lib/demo-storage";
import { useToken } from "@/lib/context";
import { useCourseFiles } from "@/hooks/use-course-files";
import {
  Settings,
  Upload,
  FileText,
  X,
  Loader2,
  Zap,
  ChevronDown,
  ChevronUp,
  Save,
  RotateCcw,
  CheckCircle2,
  Filter,
  Cloud,
  CloudOff,
} from "lucide-react";

function stripXml(xml: string): string {
  return xml.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function flattenCategories(cats: EdCategory[]): string[] {
  const result: string[] = [];
  for (const cat of cats) {
    result.push(cat.name);
    if (cat.subcategories) {
      for (const sub of cat.subcategories) {
        if (typeof sub === "string") {
          result.push(`${cat.name} > ${sub}`);
        } else {
          result.push(`${cat.name} > ${sub.name}`);
        }
      }
    }
  }
  return result;
}

interface Props {
  course: EdCourse;
  roleLabel: string;
  token: string;
  onStartAnswering: (threads: EdThread[], config: AgentConfig) => void;
}

export function AgentConfigCard({ course, roleLabel, token, onStartAnswering }: Props) {
  const { user, isDemo } = useToken();
  const [expanded, setExpanded] = useState(false);
  const [config, setConfig] = useState<AgentConfig>(() => getAgentConfig(course.id));
  const [saved, setSaved] = useState(false);
  const [fetchingThreads, setFetchingThreads] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { files: cloudFiles, uploadFile, deleteFile, loading: filesLoading } = useCourseFiles(
    course.id,
    isDemo ? null : user?.id ?? null
  );

  const categories = course.settings?.discussion?.categories
    ? flattenCategories(course.settings.discussion.categories as EdCategory[])
    : [];

  useEffect(() => {
    setConfig(getAgentConfig(course.id));
  }, [course.id]);

  const handleSave = useCallback(() => {
    saveAgentConfig(course.id, config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [course.id, config]);

  const handleReset = useCallback(() => {
    clearAgentConfig(course.id);
    setConfig(getAgentConfig(course.id));
  }, [course.id]);

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputFiles = e.target.files;
      if (!inputFiles) return;
      setUploading(true);
      try {
        for (const file of Array.from(inputFiles)) {
          const text = await file.text();
          if (!isDemo && user) {
            await uploadFile(file.name, text);
          } else {
            setConfig((prev) => ({
              ...prev,
              contextChunks: [
                ...prev.contextChunks,
                { name: file.name, content: text },
              ],
            }));
          }
        }
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [isDemo, user, uploadFile]
  );

  const removeContext = useCallback((index: number) => {
    setConfig((prev) => ({
      ...prev,
      contextChunks: prev.contextChunks.filter((_, i) => i !== index),
    }));
  }, []);

  const toggleCategory = useCallback((cat: string) => {
    setConfig((prev) => {
      const isAllowed = prev.allowedCategories.includes(cat);
      return {
        ...prev,
        allowedCategories: isAllowed
          ? prev.allowedCategories.filter((c) => c !== cat)
          : [...prev.allowedCategories, cat],
      };
    });
  }, []);

  const handleAnswerPending = useCallback(async () => {
    setFetchingThreads(true);
    try {
      let allThreads: EdThread[];

      if (token === DEMO_TOKEN) {
        allThreads = getDemoThreads().filter((t) => t.course_id === course.id);
      } else {
        const res = await fetch("/api/ed/threads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, courseId: course.id, limit: 100 }),
        });
        if (!res.ok) throw new Error("Failed to fetch threads");
        const data = await res.json();
        allThreads = data.threads || data;
      }

      const unanswered = allThreads.filter((t) => {
        if (t.type !== "question") return false;
        if (t.is_answered || t.is_staff_answered) return false;
        if (
          config.allowedCategories.length > 0 &&
          !config.allowedCategories.some(
            (cat) => t.category === cat || cat.startsWith(`${t.category} >`)
          )
        ) {
          return false;
        }
        if (config.blockedCategories.includes(t.category)) return false;
        return true;
      });

      // Merge course file contents into agent context
      const mergedConfig = { ...config };
      if (isDemo) {
        const demoChunks = getDemoFileChunks(course.id);
        if (demoChunks.length > 0) {
          mergedConfig.contextChunks = [
            ...mergedConfig.contextChunks,
            ...demoChunks,
          ];
        }
      } else if (cloudFiles.length > 0 && user) {
        const cloudChunks = await Promise.all(
          cloudFiles.map(async (f) => {
            try {
              const res = await fetch(
                `/api/course-files/content?fileId=${f.id}&edUserId=${user.id}`
              );
              if (!res.ok) return null;
              const data = await res.json();
              return { name: data.file_name, content: data.file_content };
            } catch {
              return null;
            }
          })
        );
        const validChunks = cloudChunks.filter(
          (c): c is { name: string; content: string } => c !== null
        );
        mergedConfig.contextChunks = [
          ...mergedConfig.contextChunks,
          ...validChunks,
        ];
      }

      saveAgentConfig(course.id, config);
      onStartAnswering(unanswered, mergedConfig);
    } catch (err) {
      console.error("Failed to fetch threads:", err);
    } finally {
      setFetchingThreads(false);
    }
  }, [token, course.id, config, onStartAnswering, cloudFiles, user, isDemo]);

  const hasConfig = config.instructions.trim().length > 0;

  return (
    <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-center gap-4 hover:bg-muted/30 transition-colors"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <Settings className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">
              {course.code}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              {roleLabel}
            </span>
            {hasConfig && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Configured
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{course.name}</p>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-5 border-t border-border/40 pt-5">
          {/* Instructions */}
          <div>
            <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
              <Settings className="w-3.5 h-3.5" />
              Agent Instructions
            </label>
            <textarea
              value={config.instructions}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, instructions: e.target.value }))
              }
              placeholder="Tell the agent how to behave. E.g.: 'Only answer questions about homework deadlines. Be concise. Refer students to office hours for complex conceptual questions.'"
              className="w-full h-32 px-3 py-2.5 rounded-xl border border-border bg-muted/30 text-sm text-foreground placeholder:text-muted-foreground/50 resize-y focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-colors"
            />
          </div>

          {/* Context Upload */}
          <div>
            <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
              <Upload className="w-3.5 h-3.5" />
              Course Context
              {!isDemo && (
                <span className="flex items-center gap-1 text-xs font-normal text-emerald-600">
                  <Cloud className="w-3 h-3" />
                  Cloud synced
                </span>
              )}
              {isDemo && (
                <span className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
                  <CloudOff className="w-3 h-3" />
                  Local only
                </span>
              )}
            </label>
            <p className="text-xs text-muted-foreground mb-2">
              Upload syllabi, notes, or reference material the agent can use when
              answering questions.
            </p>
            <div className="flex gap-2 mb-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.pdf,.csv,.json"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                {uploading ? "Uploading..." : "Upload Files"}
              </button>
            </div>

            {/* Cloud files (Supabase) */}
            {!isDemo && cloudFiles.length > 0 && (
              <div className="space-y-1.5 mb-2">
                {cloudFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50/50 border border-emerald-200/40"
                  >
                    <Cloud className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="text-sm text-foreground truncate flex-1">
                      {file.file_name}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {(file.file_size / 1024).toFixed(1)}KB
                    </span>
                    <button
                      onClick={() => deleteFile(file.id)}
                      className="p-0.5 rounded hover:bg-red-50 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {!isDemo && filesLoading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                Loading saved files...
              </div>
            )}

            {/* Local context chunks (demo mode fallback) */}
            {config.contextChunks.length > 0 && (
              <div className="space-y-1.5">
                {config.contextChunks.map((chunk, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 border border-border/40"
                  >
                    <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="text-sm text-foreground truncate flex-1">
                      {chunk.name}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {(chunk.content.length / 1024).toFixed(1)}KB
                    </span>
                    <button
                      onClick={() => removeContext(i)}
                      className="p-0.5 rounded hover:bg-red-50 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Category Filters */}
          {categories.length > 0 && (
            <div>
              <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                <Filter className="w-3.5 h-3.5" />
                Allowed Categories
              </label>
              <p className="text-xs text-muted-foreground mb-2">
                Select which categories the agent should answer. Leave all
                unchecked to allow all categories.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {categories.map((cat) => {
                  const isChecked = config.allowedCategories.includes(cat);
                  return (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors border ${
                        isChecked
                          ? "bg-primary/10 text-primary border-primary/30"
                          : "bg-muted/40 text-muted-foreground border-border/40 hover:bg-muted"
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2 border-t border-border/40">
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-foreground text-white text-sm font-medium hover:bg-foreground/90 transition-colors"
            >
              {saved ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              {saved ? "Saved" : "Save Config"}
            </button>
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
            <div className="flex-1" />
            <button
              onClick={handleAnswerPending}
              disabled={fetchingThreads || !hasConfig}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {fetchingThreads ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Zap className="w-3.5 h-3.5" />
              )}
              Answer Pending Questions
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
