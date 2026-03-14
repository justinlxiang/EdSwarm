"use client";

import { useState, useCallback, useEffect } from "react";

export interface CourseFile {
  id: number;
  file_name: string;
  file_size: number;
  created_at: string;
}

export function useCourseFiles(courseId: number, edUserId: number | null) {
  const [files, setFiles] = useState<CourseFile[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFiles = useCallback(async () => {
    if (!edUserId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/course-files?courseId=${courseId}&edUserId=${edUserId}`
      );
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files ?? []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [courseId, edUserId]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const uploadFile = useCallback(
    async (fileName: string, fileContent: string) => {
      if (!edUserId) return null;
      const res = await fetch("/api/course-files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          edUserId,
          courseId,
          fileName,
          fileContent,
        }),
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setFiles((prev) => [data.file, ...prev]);
      return data.file as CourseFile;
    },
    [courseId, edUserId]
  );

  const deleteFile = useCallback(
    async (fileId: number) => {
      if (!edUserId) return;
      const res = await fetch("/api/course-files", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId, edUserId }),
      });
      if (!res.ok) throw new Error("Delete failed");
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
    },
    [edUserId]
  );

  return { files, loading, uploadFile, deleteFile, refetch: fetchFiles };
}
