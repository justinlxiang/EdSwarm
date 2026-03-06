"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, X, FileText, Image } from "lucide-react";

interface FileItem {
  name: string;
  type: string;
  size: number;
  dataUrl: string;
}

interface Props {
  files: FileItem[];
  onFilesChange: (files: FileItem[]) => void;
}

export type { FileItem };

export function FileDropZone({ files, onFilesChange }: Props) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(
    (fileList: FileList) => {
      const newFiles: FileItem[] = [];
      const promises = Array.from(fileList).map(
        (file) =>
          new Promise<void>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
              newFiles.push({
                name: file.name,
                type: file.type,
                size: file.size,
                dataUrl: reader.result as string,
              });
              resolve();
            };
            reader.readAsDataURL(file);
          })
      );
      Promise.all(promises).then(() => {
        onFilesChange([...files, ...newFiles]);
      });
    },
    [files, onFilesChange]
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragging(true);
  }

  function removeFile(index: number) {
    onFilesChange(files.filter((_, i) => i !== index));
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }

  return (
    <div>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={() => setDragging(false)}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-colors ${
          dragging
            ? "border-primary bg-accent"
            : "border-border/60 hover:border-primary/40 hover:bg-muted/30"
        }`}
      >
        <Upload className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
        <p className="text-xs text-muted-foreground">
          Drop files here or click to browse
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && processFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {files.map((file, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-muted/50 text-xs"
            >
              {file.type.startsWith("image/") ? (
                <Image className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              ) : (
                <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              )}
              <span className="truncate flex-1 text-foreground">
                {file.name}
              </span>
              <span className="text-muted-foreground shrink-0">
                {formatSize(file.size)}
              </span>
              <button
                onClick={() => removeFile(i)}
                className="text-muted-foreground hover:text-destructive shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
