import fs from "fs";
import path from "path";
import type { CachedThread, ThreadCacheFile } from "./types";

const CACHE_DIR = path.join(process.cwd(), "data", "threads");

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

export function readCache(courseId: number): ThreadCacheFile | null {
  const filePath = getCacheFilePath(courseId);
  if (!fs.existsSync(filePath)) return null;
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as ThreadCacheFile;
  } catch {
    return null;
  }
}

export function writeCache(courseId: number, data: ThreadCacheFile): void {
  ensureCacheDir();
  const filePath = getCacheFilePath(courseId);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export function isCacheFresh(courseId: number, maxAgeMs = 30 * 60 * 1000): boolean {
  const cache = readCache(courseId);
  if (!cache) return false;
  return Date.now() - new Date(cache.syncedAt).getTime() < maxAgeMs;
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
