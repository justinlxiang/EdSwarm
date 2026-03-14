import { NextRequest, NextResponse } from "next/server";
import { listThreads } from "@/lib/ed-api";
import { stripEdXml, writeCache, isCacheFresh } from "@/lib/thread-cache";
import { DEMO_TOKEN, SEED_THREADS } from "@/lib/mock-data";
import type { CachedThread, ThreadCacheFile, EdThread } from "@/lib/types";

export const maxDuration = 120;

function threadToCached(t: EdThread): CachedThread {
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

export async function POST(req: NextRequest) {
  try {
    const { token, courseId } = await req.json();

    if (!token || !courseId) {
      return NextResponse.json(
        { error: "Token and courseId are required" },
        { status: 400 }
      );
    }

    if (isCacheFresh(courseId)) {
      return NextResponse.json({ threadCount: 0, syncedAt: null, cached: true });
    }

    let allThreads: CachedThread[];

    if (token === DEMO_TOKEN) {
      allThreads = SEED_THREADS.map(threadToCached);
    } else {
      allThreads = [];
      let offset = 0;
      const limit = 100;

      while (true) {
        const data = await listThreads(token, courseId, limit, offset);
        const threads: EdThread[] = data.threads ?? [];
        if (threads.length === 0) break;

        for (const t of threads) {
          allThreads.push(threadToCached(t));
        }

        if (threads.length < limit) break;
        offset += limit;
      }
    }

    const cacheData: ThreadCacheFile = {
      courseId,
      syncedAt: new Date().toISOString(),
      threadCount: allThreads.length,
      threads: allThreads,
    };

    writeCache(courseId, cacheData);

    return NextResponse.json({
      threadCount: allThreads.length,
      syncedAt: cacheData.syncedAt,
      cached: false,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to sync threads";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
