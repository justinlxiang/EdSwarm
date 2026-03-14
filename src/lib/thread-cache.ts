import fs from "fs";
import path from "path";
import type { CachedThread, ThreadCacheFile, EdThread } from "./types";
import { SEED_THREADS } from "./mock-data";

const IS_VERCEL = !!process.env.VERCEL;
const CACHE_DIR = IS_VERCEL
  ? path.join("/tmp", "thread-cache")
  : path.join(process.cwd(), "data", "threads");

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function getCacheFilePath(courseId: number): string {
  return path.join(CACHE_DIR, `${courseId}.json`);
}

export function stripEdXml(xml: string): string {
  return xml
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const DEMO_COURSE_IDS = new Set([99999, 99998, 99997, 99996, 99995]);

function seedThreadToCached(t: EdThread): CachedThread {
  const answers = (t.answers ?? []).map((a) => ({
    userId: a.user_id,
    text: stripEdXml(a.document || a.content).slice(0, 500),
    isEndorsed: a.is_endorsed,
  }));
  return {
    id: t.id,
    number: t.number,
    title: t.title,
    contentText: stripEdXml(t.document || t.content).slice(0, 500),
    category: t.category,
    type: t.type,
    isAnswered: t.is_answered,
    createdAt: t.created_at,
    answers,
  };
}

function buildDemoCacheForCourse(courseId: number): ThreadCacheFile | null {
  if (!DEMO_COURSE_IDS.has(courseId)) return null;

  const threads = SEED_THREADS
    .filter((t) => t.course_id === courseId)
    .map(seedThreadToCached);

  return {
    courseId,
    syncedAt: new Date().toISOString(),
    threadCount: threads.length,
    threads,
  };
}

export function readCache(courseId: number): ThreadCacheFile | null {
  const filePath = getCacheFilePath(courseId);
  if (fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(raw) as ThreadCacheFile;
    } catch {
      // fall through to demo fallback
    }
  }

  return buildDemoCacheForCourse(courseId);
}

export function writeCache(courseId: number, data: ThreadCacheFile): void {
  try {
    ensureCacheDir();
    const filePath = getCacheFilePath(courseId);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch {
    // On Vercel or read-only filesystems, swallow the error.
    // readCache will fall back to in-memory demo data.
  }
}

export function isCacheFresh(courseId: number, maxAgeMs = 30 * 60 * 1000): boolean {
  const filePath = getCacheFilePath(courseId);
  if (!fs.existsSync(filePath)) return false;
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const cache = JSON.parse(raw) as ThreadCacheFile;
    return Date.now() - new Date(cache.syncedAt).getTime() < maxAgeMs;
  } catch {
    return false;
  }
}

export function searchCache(
  courseId: number,
  query: string
): { id: number; number: number; title: string; snippet: string; isAnswered: boolean; category: string }[] {
  const cache = readCache(courseId);
  if (!cache) return [];

  const keywords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);

  if (keywords.length === 0) return [];

  const scored = cache.threads.map((t) => {
    const haystack = `${t.title} ${t.contentText}`.toLowerCase();
    let score = 0;
    for (const kw of keywords) {
      if (haystack.includes(kw)) score++;
    }
    if (t.title.toLowerCase().includes(query.toLowerCase())) score += 3;
    return { thread: t, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
    .map((s) => ({
      id: s.thread.id,
      number: s.thread.number,
      title: s.thread.title,
      snippet: s.thread.contentText.slice(0, 200),
      isAnswered: s.thread.isAnswered,
      category: s.thread.category,
    }));
}

export function getThreadFromCache(
  courseId: number,
  threadId: number
): CachedThread | null {
  const cache = readCache(courseId);
  if (!cache) return null;
  return cache.threads.find((t) => t.id === threadId) ?? null;
}
