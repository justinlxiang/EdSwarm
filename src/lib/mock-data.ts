import type { EdUser, EdCourse, EdCourseRole, EdThread, EdComment } from "./types";

export const DEMO_TOKEN = "demo";
export const DEMO_COURSE_ID = 99999;
export const DEMO_USER_ID = 10001;

const now = Date.now();
const h = (hours: number) => new Date(now - hours * 3600_000).toISOString();

export const DEMO_USER: EdUser = {
  id: DEMO_USER_ID,
  role: "user",
  name: "Jamie Rivera",
  email: "jrivera@demo.edswarm.com",
  username: "jrivera",
  avatar: null,
  activated: true,
  created_at: h(8760),
};

// --------------- Courses ---------------

export const DEMO_COURSE: EdCourse = {
  id: 99999,
  code: "CS 101",
  name: "Introduction to Computer Science",
  year: "2026",
  session: "Spring",
  status: "active",
  features: { discussion: true, messages: true },
  settings: {
    discussion: {
      anonymous: true,
      private: true,
      categories: [
        { name: "General", subcategories: ["Introductions", "Off-topic"], thread_template: null },
        { name: "Homework", subcategories: ["HW1", "HW2", "HW3", "HW4"], thread_template: null },
        { name: "Exams", subcategories: ["Midterm", "Final"], thread_template: null },
        { name: "Lectures", subcategories: ["Week 1-4", "Week 5-8", "Week 9-12"], thread_template: null },
        { name: "Projects", subcategories: ["Project 1", "Project 2"], thread_template: null },
      ],
    },
  },
  created_at: h(8760),
};

const MATH_201: EdCourse = {
  id: 99998,
  code: "MATH 201",
  name: "Linear Algebra",
  year: "2026",
  session: "Spring",
  status: "active",
  features: { discussion: true, messages: true },
  settings: {
    discussion: {
      anonymous: true,
      private: true,
      categories: [
        { name: "General", subcategories: [], thread_template: null },
        { name: "Problem Sets", subcategories: ["PS1", "PS2", "PS3", "PS4", "PS5"], thread_template: null },
        { name: "Exams", subcategories: ["Midterm 1", "Midterm 2", "Final"], thread_template: null },
        { name: "Lectures", subcategories: [], thread_template: null },
      ],
    },
  },
  created_at: h(8760),
};

const PHYS_150: EdCourse = {
  id: 99997,
  code: "PHYS 150",
  name: "Classical Mechanics",
  year: "2026",
  session: "Spring",
  status: "active",
  features: { discussion: true, messages: true },
  settings: {
    discussion: {
      anonymous: true,
      private: true,
      categories: [
        { name: "General", subcategories: [], thread_template: null },
        { name: "Homework", subcategories: ["HW1", "HW2", "HW3", "HW4", "HW5"], thread_template: null },
        { name: "Labs", subcategories: ["Lab 1", "Lab 2", "Lab 3"], thread_template: null },
        { name: "Lectures", subcategories: [], thread_template: null },
        { name: "Exams", subcategories: ["Midterm", "Final"], thread_template: null },
      ],
    },
  },
  created_at: h(8760),
};

const ECON_102: EdCourse = {
  id: 99996,
  code: "ECON 102",
  name: "Principles of Macroeconomics",
  year: "2026",
  session: "Spring",
  status: "active",
  features: { discussion: true, messages: true },
  settings: {
    discussion: {
      anonymous: true,
      private: true,
      categories: [
        { name: "General", subcategories: [], thread_template: null },
        { name: "Problem Sets", subcategories: ["PS1", "PS2", "PS3"], thread_template: null },
        { name: "Lectures", subcategories: [], thread_template: null },
        { name: "Exams", subcategories: ["Midterm", "Final"], thread_template: null },
        { name: "Current Events", subcategories: [], thread_template: null },
      ],
    },
  },
  created_at: h(8760),
};

const HIST_120: EdCourse = {
  id: 99995,
  code: "HIST 120",
  name: "World History Since 1500",
  year: "2025",
  session: "Fall",
  status: "archived",
  features: { discussion: true, messages: true },
  settings: {
    discussion: {
      anonymous: true,
      private: true,
      categories: [
        { name: "General", subcategories: [], thread_template: null },
        { name: "Readings", subcategories: [], thread_template: null },
        { name: "Essays", subcategories: [], thread_template: null },
      ],
    },
  },
  created_at: h(8760),
};

export const DEMO_COURSES = [DEMO_COURSE, MATH_201, PHYS_150, ECON_102, HIST_120];

export const DEMO_COURSE_ROLES: EdCourseRole[] = [
  { course: DEMO_COURSE, role: { role: "admin", user_id: DEMO_USER_ID, course_id: DEMO_COURSE.id } },
  { course: MATH_201, role: { role: "student", user_id: DEMO_USER_ID, course_id: MATH_201.id } },
  { course: PHYS_150, role: { role: "student", user_id: DEMO_USER_ID, course_id: PHYS_150.id } },
  { course: ECON_102, role: { role: "student", user_id: DEMO_USER_ID, course_id: ECON_102.id } },
  { course: HIST_120, role: { role: "student", user_id: DEMO_USER_ID, course_id: HIST_120.id } },
];

/** @deprecated use DEMO_COURSE_ROLES instead */
export const DEMO_COURSE_ROLE: EdCourseRole = DEMO_COURSE_ROLES[0];

// --------------- Helpers ---------------

function makeComment(
  id: number,
  threadId: number,
  courseId: number,
  userId: number,
  type: "comment" | "answer",
  text: string,
  hoursAgo: number,
  extra?: Partial<EdComment>
): EdComment {
  return {
    id,
    user_id: userId,
    course_id: courseId,
    thread_id: threadId,
    parent_id: null,
    type,
    content: text,
    document: `<paragraph>${text}</paragraph>`,
    is_endorsed: false,
    is_anonymous: false,
    is_private: false,
    is_resolved: false,
    created_at: h(hoursAgo),
    updated_at: null,
    vote_count: 0,
    comments: [],
    ...extra,
  };
}

function makeThread(
  id: number,
  courseId: number,
  num: number,
  type: string,
  title: string,
  content: string,
  category: string,
  hoursAgo: number,
  extra?: Partial<EdThread>
): EdThread {
  return {
    id,
    user_id: 10002 + (id % 5),
    course_id: courseId,
    number: num,
    type,
    title,
    content,
    document: `<paragraph>${content}</paragraph>`,
    category,
    subcategory: "",
    subsubcategory: "",
    flag_count: 0,
    star_count: 0,
    view_count: Math.floor(Math.random() * 80) + 5,
    unique_view_count: Math.floor(Math.random() * 50) + 3,
    vote_count: Math.floor(Math.random() * 12),
    reply_count: 0,
    unresolved_count: 0,
    is_locked: false,
    is_pinned: false,
    is_private: false,
    is_endorsed: false,
    is_answered: false,
    is_staff_answered: false,
    is_student_answered: false,
    is_archived: false,
    is_anonymous: false,
    is_megathread: false,
    anonymous_comments: false,
    approved_status: "approved",
    created_at: h(hoursAgo),
    updated_at: h(hoursAgo),
    deleted_at: null,
    pinned_at: null,
    ...extra,
  };
}

// --------------- CS 101 Threads ---------------

const CS = DEMO_COURSE.id;

const CS101_THREADS: EdThread[] = [
  makeThread(90001, CS, 1, "announcement", "Welcome to CS 101 — Spring 2026!", "Welcome everyone! This is the official discussion board for CS 101. Please read the syllabus posted on the course website before our first lecture on Monday. Office hours are Tuesdays 2-4pm and Thursdays 3-5pm in Gates 101. Looking forward to a great semester!", "General", 2, { is_pinned: true, pinned_at: h(2), view_count: 142, unique_view_count: 98 }),

  makeThread(90002, CS, 2, "question", "When is HW1 due?", "I see the homework was posted but I can't find the due date anywhere. Is it next Friday or the Friday after? Also, do we submit on Gradescope or through Ed?", "Homework", 4, {
    is_answered: true,
    is_staff_answered: true,
    reply_count: 2,
    answers: [
      makeComment(80001, 90002, CS, DEMO_USER_ID, "answer", "HW1 is due next Friday (March 21) at 11:59pm. Please submit through Gradescope — the link is on the course website. You get 3 late days for the semester, each worth a 24-hour extension.", 3, { is_endorsed: true }),
    ],
    comments: [
      makeComment(80002, 90002, CS, 10003, "comment", "Thanks! Is there a submission limit on Gradescope?", 2.5),
    ],
  }),

  makeThread(90003, CS, 3, "question", "Confused about recursion vs iteration in Lecture 5", "Professor showed the Fibonacci example using both recursion and iteration. I understand the iterative version but the recursive one is confusing. Why does fib(n-1) + fib(n-2) work? Doesn't it call itself forever?", "Lectures", 6, {
    reply_count: 3,
    is_answered: true,
    is_student_answered: true,
    answers: [
      makeComment(80003, 90003, CS, 10004, "answer", "Great question! The key is the base case: when n <= 1, the function returns n directly without calling itself again. So fib(0) = 0 and fib(1) = 1. Each recursive call moves closer to one of these base cases, so it doesn't recurse forever. Try tracing through fib(4) by hand — it helps a lot!", 5),
    ],
    comments: [
      makeComment(80004, 90003, CS, 10005, "comment", "I found this visualization really helpful: https://visualgo.net/en/recursion", 4.5),
      makeComment(80005, 90003, CS, 10003, "comment", "The recursive version is O(2^n) though right? That seems really slow compared to the O(n) iterative version.", 3),
    ],
  }),

  makeThread(90004, CS, 4, "question", "Python virtual environment not working on Windows", "I followed the setup instructions but when I run `python -m venv env` I get a permission error. I'm on Windows 11. Has anyone else had this issue?", "General", 8, {
    reply_count: 1,
    comments: [
      makeComment(80006, 90004, CS, 10006, "comment", "Try running your terminal as Administrator. Right click on Command Prompt and select 'Run as administrator'. That fixed it for me.", 7),
    ],
  }),

  makeThread(90005, CS, 5, "question", "Can we use numpy for HW2?", "The homework says we can only use standard library modules. Does numpy count as standard library? I want to use it for the matrix operations in Problem 3.", "Homework", 1, {
    vote_count: 8,
    unique_view_count: 34,
  }),

  makeThread(90006, CS, 6, "announcement", "Midterm Study Guide Posted", "The midterm study guide has been posted on the course website under Resources. The exam covers Lectures 1-8 (variables, control flow, functions, recursion, lists, and dictionaries). The exam is closed-book but you may bring one handwritten cheat sheet (letter size, both sides).", "Exams", 3, { is_pinned: true, pinned_at: h(3), view_count: 87 }),

  makeThread(90007, CS, 7, "question", "How to approach Project 1?", "The project description says to build a text-based adventure game but I have no idea where to start. Should we use classes? How complex does it need to be? Any tips for structuring the code?", "Projects", 5, {
    reply_count: 2,
    comments: [
      makeComment(80007, 90007, CS, 10004, "comment", "I'd start by mapping out the rooms/locations and what items exist. Then think about what actions the player can take. Classes are a good idea for Room, Player, Item etc.", 4),
      makeComment(80008, 90007, CS, 10005, "comment", "The rubric says minimum 5 rooms and 3 items. I'd suggest starting with a simple Room class with description and exits, then build from there.", 3.5),
    ],
  }),

  makeThread(90008, CS, 8, "post", "Study Group — Midterm Prep", "Hey everyone! A few of us are forming a study group to prepare for the midterm. We're meeting Saturday at 2pm in the library, Room 204. All are welcome! We'll go through the practice problems from the study guide.", "General", 10, { vote_count: 15 }),

  makeThread(90009, CS, 9, "question", "Difference between list.append() and list.extend()?", "I keep getting confused about when to use append vs extend. Can someone explain the difference with an example?", "Lectures", 0.5, {
    vote_count: 3,
  }),

  makeThread(90010, CS, 10, "question", "Grading policy for late submissions?", "I might need to submit HW2 a day late because of a family emergency. What's the late policy? I can't find it in the syllabus.", "General", 0.3, {
    vote_count: 2,
    is_answered: true,
    is_staff_answered: true,
    reply_count: 1,
    answers: [
      makeComment(80009, 90010, CS, DEMO_USER_ID, "answer", "You get 3 late days total for the entire semester. Each late day gives you a 24-hour extension with no penalty. After your late days are used up, there is a 10% deduction per day, up to 3 days maximum — after that we cannot accept the submission. For documented emergencies (family, medical), email me directly and we can work something out separately. Please attach any documentation you have. Hope everything is okay!", 0.2, { is_endorsed: true }),
    ],
  }),
];

// --------------- MATH 201 Threads ---------------

const MA = MATH_201.id;

const MATH201_THREADS: EdThread[] = [
  makeThread(91001, MA, 1, "announcement", "MATH 201 — Welcome & Logistics", "Welcome to Linear Algebra! Textbook: Strang's 'Introduction to Linear Algebra' (6th ed). Lectures are MWF 10-11am in Science Hall 250. Problem sets are due weekly on Fridays. First PS drops this Wednesday.", "General", 1.5, { is_pinned: true, pinned_at: h(1.5), view_count: 95, unique_view_count: 72 }),

  makeThread(91002, MA, 2, "question", "Row reduction — when do we stop?", "In class we did row echelon form and reduced row echelon form. How do I know when I've done enough row operations? Is it always necessary to go all the way to RREF or is REF sufficient for some problems?", "Lectures", 3, {
    is_answered: true,
    is_student_answered: true,
    reply_count: 2,
    answers: [
      makeComment(81001, 91002, MA, 10004, "answer", "REF is enough to determine rank, check consistency, and do back-substitution. RREF gives you the solution directly without back-sub. For PS problems, go to RREF unless the question specifically says 'use back-substitution.' On exams, read carefully — they sometimes specify which form.", 2),
    ],
    comments: [
      makeComment(81002, 91002, MA, 10005, "comment", "Prof said in office hours that for PS1, RREF is expected.", 1.5),
    ],
  }),

  makeThread(91003, MA, 3, "question", "PS1 Problem 4 — Span of vectors", "The problem asks whether b = [1, 2, 5] is in the span of v1 = [1, 0, 1] and v2 = [0, 1, 1]. I set up the augmented matrix but I'm getting an inconsistent system. Is that possible or did I make an arithmetic error?", "Problem Sets", 2, {
    vote_count: 6,
    reply_count: 1,
    comments: [
      makeComment(81003, 91003, MA, 10003, "comment", "I got the same result — the system is inconsistent, so b is NOT in the span. The last row gives 0 = 3 which is a contradiction. I think that's the intended answer.", 1.5),
    ],
  }),

  makeThread(91004, MA, 4, "question", "Intuition for linear independence?", "I understand the formal definition (no nontrivial linear combination equals zero) but I don't have a geometric intuition for it. Can someone explain what linear independence 'looks like' in 2D and 3D?", "Lectures", 5, {
    vote_count: 11,
    is_answered: true,
    is_student_answered: true,
    reply_count: 1,
    answers: [
      makeComment(81004, 91004, MA, 10006, "answer", "In 2D: two vectors are linearly independent if they don't point in the same (or opposite) direction — they span the whole plane. In 3D: three vectors are independent if they don't all lie in the same plane — they span all of 3D space. Basically, each new independent vector adds a new 'direction' you can reach.", 4),
    ],
  }),

  makeThread(91005, MA, 5, "post", "Great 3Blue1Brown video on linear transformations", "Just wanted to share this — the 3Blue1Brown 'Essence of Linear Algebra' series is incredible. Chapter 3 on linear transformations made everything click for me. Highly recommend watching alongside the lectures.", "General", 0.8, { vote_count: 14 }),

  makeThread(91006, MA, 6, "question", "PS1 due date extension?", "I heard there might be an extension for PS1 since the textbook shipment was delayed. Can anyone confirm?", "Problem Sets", 0.4, {
    vote_count: 4,
    is_answered: true,
    is_staff_answered: true,
    reply_count: 1,
    answers: [
      makeComment(81005, 91006, MA, DEMO_USER_ID, "answer", "Yes — PS1 has been extended by 3 days due to the textbook shipment delay. The new deadline is Friday, March 20 at 11:59pm. No late days will be deducted for this extension. If you still need the textbook, copies are available on 2-hour reserve at the library.", 0.2, { is_endorsed: true }),
    ],
  }),
];

// --------------- PHYS 150 Threads ---------------

const PH = PHYS_150.id;

const PHYS150_THREADS: EdThread[] = [
  makeThread(92001, PH, 1, "announcement", "PHYS 150 — Course Info & Lab Safety", "Welcome to Classical Mechanics! Labs start Week 2 in Physics Building Room 104. You MUST complete the online lab safety quiz before your first lab session or you will not be admitted. Link is on the course website under 'Labs'. Textbook: Kleppner & Kolenkow.", "General", 2, { is_pinned: true, pinned_at: h(2), view_count: 110, unique_view_count: 85 }),

  makeThread(92002, PH, 2, "question", "Confused about free body diagrams — multiple forces", "When drawing FBDs for an object on an inclined plane with friction, do I need to decompose gravity into parallel and perpendicular components on the diagram itself, or just in my equations?", "Lectures", 4, {
    is_answered: true,
    is_student_answered: true,
    reply_count: 2,
    answers: [
      makeComment(82001, 92002, PH, 10004, "answer", "Best practice is to show the original gravity vector pointing straight down AND the decomposed components along your chosen axes. Label them clearly. Prof. Kim said during lecture that partial credit depends on having a clear FBD, so always show both.", 3),
    ],
    comments: [
      makeComment(82002, 92002, PH, 10003, "comment", "Also make sure your coordinate system is clearly labeled! I lost points on HW1 for not showing which direction I defined as positive.", 2.5),
    ],
  }),

  makeThread(92003, PH, 3, "question", "Lab 1 — uncertainty propagation formula", "The lab manual mentions propagating uncertainties using partial derivatives but doesn't give us the formula. Are we expected to know this already or will the TA explain it?", "Labs", 6, {
    reply_count: 1,
    is_answered: true,
    is_staff_answered: true,
    answers: [
      makeComment(82003, 92003, PH, DEMO_USER_ID, "answer", "The formula for uncertainty propagation is in Appendix B of the lab manual (page 47). Your TA will also go over it briefly in the first 15 minutes of Lab 1. The key formula: if q = f(x,y), then δq = sqrt((∂f/∂x·δx)² + (∂f/∂y·δy)²).", 5, { is_endorsed: true }),
    ],
  }),

  makeThread(92004, PH, 4, "question", "HW2 Problem 3 — block on a spring", "For the block-spring problem, I'm getting a negative velocity at x = 0. That doesn't make physical sense, right? I'm using energy conservation: (1/2)kx² = (1/2)mv².", "Homework", 1.5, {
    vote_count: 5,
    reply_count: 1,
    comments: [
      makeComment(82004, 92004, PH, 10005, "comment", "Check your signs — when you solve for v you get v = ±sqrt(k/m)·x. The negative just means direction. Take the magnitude if the problem asks for speed.", 1),
    ],
  }),

  makeThread(92005, PH, 5, "announcement", "Midterm 1 — Room Change", "Midterm 1 will be held in Lecture Hall 100 (NOT our usual classroom) to give everyone more space. Same date and time: March 25, 7-9pm. Bring your student ID and a calculator (no phones).", "Exams", 0.5, { is_pinned: true, pinned_at: h(0.5), view_count: 68 }),

  makeThread(92006, PH, 6, "question", "Do we need to memorize moment of inertia formulas?", "The formula sheet for the midterm — does it include moment of inertia for common shapes (disk, sphere, rod) or do we need to memorize those?", "Exams", 0.3, {
    vote_count: 7,
  }),
];

// --------------- ECON 102 Threads ---------------

const EC = ECON_102.id;

const ECON102_THREADS: EdThread[] = [
  makeThread(93001, EC, 1, "announcement", "ECON 102 — Syllabus & Reading List", "Welcome to Macroeconomics! Textbook: Mankiw's 'Macroeconomics' (11th ed). Readings are posted weekly on the course website. Problem sets are biweekly, due on alternating Mondays. First PS covers Chapters 1-3.", "General", 3, { is_pinned: true, pinned_at: h(3), view_count: 88, unique_view_count: 65 }),

  makeThread(93002, EC, 2, "question", "GDP vs GNP — when does the distinction matter?", "In lecture we briefly mentioned GNP vs GDP but mostly focused on GDP. For the PS and exams, do we need to know both? When would you use GNP instead?", "Lectures", 5, {
    is_answered: true,
    is_student_answered: true,
    reply_count: 2,
    answers: [
      makeComment(83001, 93002, EC, 10006, "answer", "GDP measures production within a country's borders. GNP measures production by a country's citizens regardless of location. The distinction matters for countries with lots of foreign investment (e.g., Ireland has GDP >> GNP because many multinationals are based there). For this class, focus on GDP unless the question specifically mentions GNP.", 4),
    ],
    comments: [
      makeComment(83002, 93002, EC, 10003, "comment", "The Mankiw textbook has a good box on this in Chapter 2, page 28.", 3),
    ],
  }),

  makeThread(93003, EC, 3, "question", "PS1 Q2 — calculating real GDP growth", "I'm stuck on calculating real GDP growth between Year 1 and Year 2. Do I use the GDP deflator or the CPI to convert? The problem gives both and I'm getting different answers depending on which I use.", "Problem Sets", 1, {
    vote_count: 5,
    reply_count: 1,
    comments: [
      makeComment(83003, 93003, EC, 10005, "comment", "Use the GDP deflator — it's specifically for converting nominal GDP to real GDP. CPI is for consumer prices. The formula is: Real GDP = Nominal GDP / (GDP Deflator / 100).", 0.5),
    ],
  }),

  makeThread(93004, EC, 4, "post", "Interesting article on inflation expectations", "Found this great Fed research piece on how consumer inflation expectations affect actual inflation — ties directly into what we covered in Lecture 4 about the expectations-augmented Phillips curve. Link: https://www.federalreserve.gov/econres.htm", "Current Events", 7, { vote_count: 9 }),

  makeThread(93005, EC, 5, "question", "Office hours this week?", "Are office hours still Tuesday 3-5pm this week? I went last Tuesday and the room was empty.", "General", 0.6, {
    vote_count: 3,
    is_answered: true,
    is_staff_answered: true,
    reply_count: 1,
    answers: [
      makeComment(83004, 93005, EC, 10004, "answer", "Apologies — there was a room conflict last week. Office hours are now in Econ Building 302 (same time, Tuesday 3-5pm). Updated on the syllabus.", 0.3, { is_endorsed: true }),
    ],
  }),
];

// --------------- All seed threads ---------------

export const SEED_THREADS: EdThread[] = [
  ...CS101_THREADS,
  ...MATH201_THREADS,
  ...PHYS150_THREADS,
  ...ECON102_THREADS,
];

export const DEMO_USERS = [
  { id: DEMO_USER_ID, name: "Prof. Rivera", role: "admin", course_role: "admin", avatar: "" },
  { id: 10002, name: "Sarah Chen", role: "user", course_role: "student", avatar: "" },
  { id: 10003, name: "Marcus Johnson", role: "user", course_role: "student", avatar: "" },
  { id: 10004, name: "Emily Zhang", role: "user", course_role: "tutor", avatar: "" },
  { id: 10005, name: "Jordan Williams", role: "user", course_role: "student", avatar: "" },
  { id: 10006, name: "Priya Patel", role: "user", course_role: "student", avatar: "" },
];
