export interface FileSummary {
  id: number;
  file_name: string;
  file_size: number;
  file_summary: string | null;
}

const LOCAL_KEY_PREFIX = "edswarm_materials_";

interface LocalFile {
  id: number;
  file_name: string;
  file_content: string;
  file_size: number;
  created_at: string;
}

function loadLocalFiles(courseId: number): LocalFile[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`${LOCAL_KEY_PREFIX}${courseId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Builds file context from demo localStorage files.
 * Always inlines full content since local files are small.
 */
export function buildDemoFileContext(courseId: number): string {
  const files = loadLocalFiles(courseId);
  if (files.length === 0) return "";
  return (
    "\nCourse files:\n" +
    files
      .map((f) => `--- ${f.file_name} ---\n${f.file_content}`)
      .join("\n\n")
  );
}

/**
 * Fetches file name + summary catalog for a course (cloud mode).
 * Returns a formatted string suitable for inclusion in AI system prompts,
 * plus the raw file list for tool-calling flows.
 */
export async function fetchFileCatalog(
  courseId: number,
  edUserId: number
): Promise<{ files: FileSummary[]; catalogText: string }> {
  try {
    const res = await fetch(
      `/api/course-files/summaries?courseId=${courseId}&edUserId=${edUserId}`
    );
    if (!res.ok) return { files: [], catalogText: "" };
    const data = await res.json();
    const files: FileSummary[] = data.files ?? [];
    if (files.length === 0) return { files, catalogText: "" };

    const lines = files.map((f) => {
      const summary = f.file_summary || "(summary pending)";
      return `- [${f.id}] ${f.file_name}: ${summary}`;
    });

    const catalogText = `\nAvailable course files (use file ID to retrieve full content):\n${lines.join("\n")}`;
    return { files, catalogText };
  } catch {
    return { files: [], catalogText: "" };
  }
}

/**
 * Fetches full content for a single file by ID (cloud mode).
 */
export async function fetchFileContent(
  fileId: number,
  edUserId: number
): Promise<{ file_name: string; file_content: string } | null> {
  try {
    const res = await fetch(
      `/api/course-files/content?fileId=${fileId}&edUserId=${edUserId}`
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Fetches full content for multiple files (cloud mode).
 */
export async function fetchAllFileContents(
  files: FileSummary[],
  edUserId: number
): Promise<{ name: string; content: string }[]> {
  const results = await Promise.all(
    files.map(async (f) => {
      const data = await fetchFileContent(f.id, edUserId);
      if (!data) return null;
      return { name: data.file_name, content: data.file_content };
    })
  );
  return results.filter((r): r is { name: string; content: string } => r !== null);
}

const SMALL_TOTAL_SIZE = 50 * 1024; // 50KB

/**
 * Builds the best file context for an AI prompt.
 * In demo mode, reads directly from localStorage.
 * In cloud mode, uses the API with summary + selective loading.
 */
export async function buildFileContext(
  courseId: number,
  edUserId: number,
  isDemo?: boolean
): Promise<string> {
  if (isDemo) return buildDemoFileContext(courseId);

  const { files, catalogText } = await fetchFileCatalog(courseId, edUserId);
  if (files.length === 0) return "";

  const totalSize = files.reduce((sum, f) => sum + f.file_size, 0);

  if (totalSize <= SMALL_TOTAL_SIZE) {
    const contents = await fetchAllFileContents(files, edUserId);
    if (contents.length === 0) return catalogText;
    return (
      "\nCourse files:\n" +
      contents
        .map((c) => `--- ${c.name} ---\n${c.content}`)
        .join("\n\n")
    );
  }

  return catalogText;
}
