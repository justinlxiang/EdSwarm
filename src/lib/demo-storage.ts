import type { EdThread, EdComment, EdThreadDetail } from "./types";
import { SEED_THREADS, DEMO_USERS, DEMO_COURSE_ID, DEMO_USER_ID } from "./mock-data";

const THREADS_KEY = "edswarm_demo_threads";

const SEED_IDS = new Set(SEED_THREADS.map((t) => t.id));

function sortByNewestFirst(threads: EdThread[]): EdThread[] {
  return [...threads].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

function loadThreads(): EdThread[] {
  if (typeof window === "undefined") return sortByNewestFirst(SEED_THREADS);
  try {
    const raw = localStorage.getItem(THREADS_KEY);
    if (!raw) {
      const sorted = sortByNewestFirst(SEED_THREADS);
      localStorage.setItem(THREADS_KEY, JSON.stringify(sorted));
      return sorted;
    }
    const stored: EdThread[] = JSON.parse(raw);
    const userThreads = stored.filter((t) => !SEED_IDS.has(t.id));
    const merged = sortByNewestFirst([...userThreads, ...SEED_THREADS]);
    localStorage.setItem(THREADS_KEY, JSON.stringify(merged));
    return merged;
  } catch {
    return sortByNewestFirst(SEED_THREADS);
  }
}

function saveThreads(threads: EdThread[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(THREADS_KEY, JSON.stringify(threads));
}

export function getDemoThreads(): EdThread[] {
  return loadThreads();
}

export function getDemoThreadDetail(threadId: number): EdThreadDetail | null {
  const threads = loadThreads();
  const thread = threads.find((t) => t.id === threadId);
  if (!thread) return null;
  return { thread, users: DEMO_USERS };
}

export function addDemoThread(params: {
  type: string;
  title: string;
  category: string;
  content: string;
  is_private: boolean;
  is_anonymous: boolean;
  courseId?: number;
}): EdThread {
  const threads = loadThreads();
  const courseId = params.courseId ?? DEMO_COURSE_ID;
  const courseThreads = threads.filter((t) => t.course_id === courseId);
  const maxId = threads.reduce((m, t) => Math.max(m, t.id), 90000);
  const maxNum = courseThreads.reduce((m, t) => Math.max(m, t.number), 0);
  const now = new Date().toISOString();

  const newThread: EdThread = {
    id: maxId + 1,
    user_id: DEMO_USER_ID,
    course_id: courseId,
    number: maxNum + 1,
    type: params.type,
    title: params.title,
    content: params.content,
    document: params.content,
    category: params.category,
    subcategory: "",
    subsubcategory: "",
    flag_count: 0,
    star_count: 0,
    view_count: 1,
    unique_view_count: 1,
    vote_count: 0,
    reply_count: 0,
    unresolved_count: 0,
    is_locked: false,
    is_pinned: false,
    is_private: params.is_private,
    is_endorsed: false,
    is_answered: false,
    is_staff_answered: false,
    is_student_answered: false,
    is_archived: false,
    is_anonymous: params.is_anonymous,
    is_megathread: false,
    anonymous_comments: false,
    approved_status: "approved",
    created_at: now,
    updated_at: now,
    deleted_at: null,
    pinned_at: null,
    answers: [],
    comments: [],
  };

  threads.unshift(newThread);
  saveThreads(threads);
  return newThread;
}

export function addDemoComment(
  threadId: number,
  content: string,
  type: "comment" | "answer" = "answer"
): EdComment | null {
  const threads = loadThreads();
  const thread = threads.find((t) => t.id === threadId);
  if (!thread) return null;

  const allComments = [
    ...(thread.answers ?? []),
    ...(thread.comments ?? []),
  ];
  const maxCommentId = allComments.reduce((m, c) => Math.max(m, c.id), 80100);
  const now = new Date().toISOString();

  const newComment: EdComment = {
    id: maxCommentId + 1,
    user_id: DEMO_USER_ID,
    course_id: thread.course_id,
    thread_id: threadId,
    parent_id: null,
    type,
    content,
    document: `<paragraph>${content}</paragraph>`,
    is_endorsed: false,
    is_anonymous: false,
    is_private: false,
    is_resolved: false,
    created_at: now,
    updated_at: null,
    vote_count: 0,
    comments: [],
  };

  if (type === "answer") {
    if (!thread.answers) thread.answers = [];
    thread.answers.push(newComment);
    thread.is_answered = true;
    thread.is_staff_answered = true;
  } else {
    if (!thread.comments) thread.comments = [];
    thread.comments.push(newComment);
  }
  thread.reply_count += 1;
  thread.updated_at = now;

  saveThreads(threads);
  return newComment;
}

export function resetDemoData(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(THREADS_KEY);
}
