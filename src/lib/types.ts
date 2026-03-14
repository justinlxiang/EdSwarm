export interface EdUser {
  id: number;
  role: string;
  name: string;
  email: string;
  username: string | null;
  avatar: string | null;
  activated: boolean;
  created_at: string;
}

export interface EdCategory {
  name: string;
  subcategories: string[] | EdCategory[];
  thread_template: string | null;
}

export interface EdCourse {
  id: number;
  code: string;
  name: string;
  year: string;
  session: string;
  status: "active" | "archived";
  features: {
    discussion: boolean;
    messages: boolean;
    [key: string]: boolean;
  };
  settings?: {
    discussion?: {
      anonymous?: boolean;
      private?: boolean;
      categories?: EdCategory[];
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  created_at: string;
}

export interface EdCourseRole {
  course: EdCourse;
  role: {
    role: string;
    user_id: number;
    course_id: number;
  };
}

export interface EdUserInfo {
  user: EdUser;
  courses: EdCourseRole[];
}

export interface EdComment {
  id: number;
  user_id: number;
  course_id: number;
  thread_id: number;
  parent_id: number | null;
  type: "comment" | "answer";
  content: string;
  document: string;
  is_endorsed: boolean;
  is_anonymous: boolean;
  is_private: boolean;
  is_resolved: boolean;
  created_at: string;
  updated_at: string | null;
  vote_count: number;
  comments: EdComment[];
}

export interface EdThread {
  id: number;
  user_id: number;
  course_id: number;
  number: number;
  type: string;
  title: string;
  content: string;
  document: string;
  category: string;
  subcategory: string;
  subsubcategory: string;
  flag_count: number;
  star_count: number;
  view_count: number;
  unique_view_count: number;
  vote_count: number;
  reply_count: number;
  unresolved_count: number;
  is_locked: boolean;
  is_pinned: boolean;
  is_private: boolean;
  is_endorsed: boolean;
  is_answered: boolean;
  is_staff_answered: boolean;
  is_student_answered: boolean;
  is_archived: boolean;
  is_anonymous: boolean;
  is_megathread: boolean;
  anonymous_comments: boolean;
  approved_status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  pinned_at: string | null;
  answers?: EdComment[];
  comments?: EdComment[];
}

export interface EdThreadDetail {
  thread: EdThread;
  users: {
    id: number;
    name: string;
    role: string;
    course_role: string;
    avatar: string;
  }[];
}

export interface CourseDigest {
  course: EdCourse;
  threads: EdThread[];
  summary?: string;
}

export type TimeRange = "day" | "week";

export interface AgentContextChunk {
  name: string;
  content: string;
}

export interface AgentConfig {
  instructions: string;
  contextChunks: AgentContextChunk[];
  allowedCategories: string[];
  blockedCategories: string[];
  autoAnswerEnabled: boolean;
}

export interface DraftAnswer {
  threadId: number;
  threadTitle: string;
  threadContent: string;
  category: string;
  answer: string;
}

export interface AnswerReviewItem extends DraftAnswer {
  status: "pending" | "approved" | "dismissed";
  editedAnswer: string;
}

export interface CachedThreadAnswer {
  userId: number;
  text: string;
  isEndorsed: boolean;
}

export interface CachedThread {
  id: number;
  number: number;
  title: string;
  contentText: string;
  category: string;
  type: string;
  isAnswered: boolean;
  createdAt: string;
  answers: CachedThreadAnswer[];
}

export interface ThreadCacheFile {
  courseId: number;
  syncedAt: string;
  threadCount: number;
  threads: CachedThread[];
}

export interface DuplicateMatch {
  threadId: number;
  threadNumber: number;
  title: string;
  relevance: "exact_duplicate" | "likely_answered" | "related";
  answerSnippet: string;
  explanation: string;
}

export interface DuplicateCheckResult {
  hasDuplicates: boolean;
  matches: DuplicateMatch[];
}
