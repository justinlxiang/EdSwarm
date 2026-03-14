"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useToken } from "@/lib/context";
import { useCourseFiles, type CourseFile } from "@/hooks/use-course-files";
import {
  Upload,
  FileText,
  Trash2,
  Loader2,
  FolderOpen,
  Cloud,
  CloudOff,
  Download,
  X,
} from "lucide-react";

interface Props {
  courseId: number;
  open: boolean;
  onClose: () => void;
}

interface LocalFile {
  id: number;
  file_name: string;
  file_content: string;
  file_size: number;
  created_at: string;
}

const LOCAL_KEY_PREFIX = "edswarm_materials_";

function loadLocalFiles(courseId: number): LocalFile[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`${LOCAL_KEY_PREFIX}${courseId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalFiles(courseId: number, files: LocalFile[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${LOCAL_KEY_PREFIX}${courseId}`, JSON.stringify(files));
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function CourseMaterialsDialog({ courseId, open, onClose }: Props) {
  const { user, isDemo } = useToken();
  const cloudHook = useCourseFiles(courseId, isDemo ? null : user?.id ?? null);

  const [localFiles, setLocalFiles] = useState<LocalFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isDemo) {
      setLocalFiles(loadLocalFiles(courseId));
    }
  }, [isDemo, courseId]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const files = isDemo ? localFiles : cloudHook.files;
  const loading = isDemo ? false : cloudHook.loading;

  const processFiles = useCallback(
    async (inputFiles: FileList | File[]) => {
      setUploading(true);
      try {
        for (const file of Array.from(inputFiles)) {
          const text = await file.text();
          if (isDemo) {
            const newFile: LocalFile = {
              id: Date.now() + Math.random(),
              file_name: file.name,
              file_content: text,
              file_size: new Blob([text]).size,
              created_at: new Date().toISOString(),
            };
            setLocalFiles((prev) => {
              const updated = [newFile, ...prev];
              saveLocalFiles(courseId, updated);
              return updated;
            });
          } else {
            await cloudHook.uploadFile(file.name, text);
          }
        }
      } finally {
        setUploading(false);
      }
    },
    [isDemo, courseId, cloudHook]
  );

  const handleFileInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files) return;
      await processFiles(e.target.files);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [processFiles]
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      const droppedFiles = e.dataTransfer.files;
      if (droppedFiles.length > 0) {
        await processFiles(droppedFiles);
      }
    },
    [processFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDelete = useCallback(
    async (fileId: number) => {
      setDeleting(fileId);
      try {
        if (isDemo) {
          setLocalFiles((prev) => {
            const updated = prev.filter((f) => f.id !== fileId);
            saveLocalFiles(courseId, updated);
            return updated;
          });
        } else {
          await cloudHook.deleteFile(fileId);
        }
      } finally {
        setDeleting(null);
      }
    },
    [isDemo, courseId, cloudHook]
  );

  const handleDownload = useCallback(
    async (file: CourseFile | LocalFile) => {
      try {
        let content: string;
        let name: string;

        if (isDemo) {
          const local = localFiles.find((f) => f.id === file.id);
          if (!local) return;
          content = local.file_content;
          name = local.file_name;
        } else {
          if (!user) return;
          const res = await fetch(
            `/api/course-files/content?fileId=${file.id}&edUserId=${user.id}`
          );
          if (!res.ok) return;
          const data = await res.json();
          content = data.file_content;
          name = data.file_name;
        }

        const blob = new Blob([content], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = name;
        a.click();
        URL.revokeObjectURL(url);
      } catch {
        // silent
      }
    },
    [isDemo, localFiles, user]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-border/60 max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <FolderOpen className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Course Materials
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {isDemo ? (
                  <>
                    <CloudOff className="w-3 h-3" />
                    Stored locally
                  </>
                ) : (
                  <>
                    <Cloud className="w-3 h-3 text-emerald-500" />
                    <span className="text-emerald-600">Cloud synced</span>
                  </>
                )}
                {files.length > 0 && (
                  <span className="ml-1">
                    &middot; {files.length} file{files.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Drop zone + content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Drag & drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`relative flex flex-col items-center justify-center gap-2 py-8 px-4 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
              dragOver
                ? "border-primary bg-primary/5 scale-[1.01]"
                : "border-border/60 hover:border-primary/40 hover:bg-muted/30"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.pdf,.csv,.json"
              multiple
              onChange={handleFileInput}
              className="hidden"
            />
            {uploading ? (
              <>
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm font-medium text-primary">Uploading...</p>
              </>
            ) : (
              <>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${dragOver ? "bg-primary/10" : "bg-muted/60"}`}>
                  <Upload className={`w-6 h-6 ${dragOver ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">
                    {dragOver ? "Drop files here" : "Drag & drop files here"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    or click to browse &middot; .txt, .md, .csv, .json
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-4">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Loading files...
            </div>
          )}

          {/* Empty state */}
          {!loading && files.length === 0 && (
            <div className="flex flex-col items-center py-4 gap-1.5 text-muted-foreground">
              <p className="text-sm">No materials uploaded yet</p>
              <p className="text-xs">
                Upload syllabi, lecture notes, or reference materials
              </p>
            </div>
          )}

          {/* File list */}
          {files.length > 0 && (
            <div className="space-y-1">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-muted/30 border border-border/40 group hover:bg-muted/50 transition-colors"
                >
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">
                      {file.file_name}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatSize(file.file_size)} &middot;{" "}
                      {formatDate(file.created_at)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDownload(file)}
                    className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-muted text-muted-foreground hover:text-foreground transition-all shrink-0"
                    title="Download"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(file.id)}
                    disabled={deleting === file.id}
                    className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 text-muted-foreground hover:text-destructive transition-all shrink-0 disabled:opacity-50"
                    title="Delete"
                  >
                    {deleting === file.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
