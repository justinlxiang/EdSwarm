"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Sparkles,
  MessageSquareText,
  GraduationCap,
  Users,
  Zap,
  Search,
  PenTool,
  FileText,
  Bot,
  CheckCircle2,
  ArrowRight,
  Layers,
  Shield,
  Clock,
  BarChart3,
  Copy,
  Inbox,
  Brain,
} from "lucide-react";

interface LandingPageProps {
  onEnterDashboard: () => void;
  userName?: string;
}

function useInView(threshold = 0.15): [(node: HTMLElement | null) => void, boolean] {
  const [el, setEl] = useState<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [el, threshold]);
  const ref = useCallback((node: HTMLElement | null) => setEl(node), []);
  return [ref, visible];
}

const FEATURES = [
  {
    icon: Sparkles,
    title: "AI Course Digests",
    description:
      "Get instant, AI-generated summaries of what's happening across all your courses. Know exactly what needs your attention — deadlines, announcements, unanswered questions — at a glance.",
    color: "from-blue-500 to-indigo-600",
    bg: "bg-blue-50",
    text: "text-blue-600",
    border: "border-blue-100",
  },
  {
    icon: MessageSquareText,
    title: "Smart AI Chat",
    description:
      "Ask anything about your courses and get instant, context-aware answers — without posting a single thread. The AI reads all your threads and materials, so students find what they need without adding noise to the forum.",
    color: "from-violet-500 to-purple-600",
    bg: "bg-violet-50",
    text: "text-violet-600",
    border: "border-violet-100",
  },
  {
    icon: Copy,
    title: "Duplicate Detection",
    description:
      "Keep your forum clean. Before any new question is posted, AI scans all existing threads to surface exact matches and likely answers. Students get help faster, and the discussion board stays free of redundant posts.",
    color: "from-amber-500 to-orange-600",
    bg: "bg-amber-50",
    text: "text-amber-600",
    border: "border-amber-100",
  },
  {
    icon: PenTool,
    title: "Rich Post Composer",
    description:
      "Write beautiful posts with a full markdown editor. Format with headings, lists, code blocks, images, and links. Let AI draft your post and refine it before publishing.",
    color: "from-emerald-500 to-teal-600",
    bg: "bg-emerald-50",
    text: "text-emerald-600",
    border: "border-emerald-100",
  },
  {
    icon: Bot,
    title: "AI Agent Configuration",
    description:
      "Teachers can configure custom AI agents per course — set instructions, upload context materials, filter by category, and let the agent help answer student questions automatically.",
    color: "from-rose-500 to-pink-600",
    bg: "bg-rose-50",
    text: "text-rose-600",
    border: "border-rose-100",
  },
  {
    icon: CheckCircle2,
    title: "Batch AI Answers",
    description:
      "Review AI-generated answers for all pending questions at once. Approve, edit, or dismiss each answer before posting. Scale your teaching without losing quality.",
    color: "from-cyan-500 to-sky-600",
    bg: "bg-cyan-50",
    text: "text-cyan-600",
    border: "border-cyan-100",
  },
];

const CAPABILITIES = [
  {
    icon: Brain,
    label: "AI Summaries",
    desc: "Auto-generated digests for every course",
  },
  {
    icon: Search,
    label: "Smart Search",
    desc: "Find answers across all threads — no need to re-ask",
  },
  {
    icon: FileText,
    label: "Course Materials",
    desc: "Upload syllabi, notes & resources for AI context",
  },
  {
    icon: Inbox,
    label: "Thread Management",
    desc: "Browse, filter, and reply to threads in-app",
  },
  {
    icon: Clock,
    label: "Time Filtering",
    desc: "Toggle between Today and This Week views",
  },
  {
    icon: Layers,
    label: "Multi-Course",
    desc: "Manage all courses from a single dashboard",
  },
  {
    icon: Shield,
    label: "Privacy Controls",
    desc: "Post anonymously or privately with full control",
  },
  {
    icon: BarChart3,
    label: "Activity Tracking",
    desc: "Thread counts, reply stats, and engagement metrics",
  },
];

export function LandingPage({ onEnterDashboard, userName }: LandingPageProps) {
  const [heroRef, heroVisible] = useInView(0.1);
  const [featuresRef, featuresVisible] = useInView(0.1);
  const [capabilitiesRef, capabilitiesVisible] = useInView(0.1);
  const [rolesRef, rolesVisible] = useInView(0.1);
  const [ctaRef, ctaVisible] = useInView(0.1);

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, []);

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Hero */}
      <section
        ref={heroRef}
        className="relative min-h-[85vh] flex items-center justify-center overflow-hidden"
      >
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50/30" />
        <div
          className="absolute w-[800px] h-[800px] rounded-full opacity-20 blur-3xl transition-transform duration-[3000ms] ease-out"
          style={{
            background:
              "radial-gradient(circle, rgba(37,99,235,0.3) 0%, rgba(99,102,241,0.15) 50%, transparent 70%)",
            transform: `translate(${mousePos.x * 0.02 - 20}px, ${mousePos.y * 0.02 - 20}px)`,
            top: "10%",
            left: "20%",
          }}
        />
        <div
          className="absolute w-[600px] h-[600px] rounded-full opacity-15 blur-3xl transition-transform duration-[3000ms] ease-out"
          style={{
            background:
              "radial-gradient(circle, rgba(139,92,246,0.3) 0%, rgba(236,72,153,0.1) 50%, transparent 70%)",
            transform: `translate(${-mousePos.x * 0.015 + 10}px, ${-mousePos.y * 0.015 + 10}px)`,
            bottom: "10%",
            right: "15%",
          }}
        />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />

        <div
          className={`relative z-10 max-w-4xl mx-auto px-6 text-center transition-all duration-1000 ${heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur border border-border/60 shadow-sm mb-8">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-medium text-muted-foreground">
              {userName ? `Welcome back, ${userName}` : "AI-Powered Course Intelligence"}
            </span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground leading-[1.1] mb-6">
            Your courses,{" "}
            <span className="relative">
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">
                supercharged
              </span>
              <svg
                className="absolute -bottom-2 left-0 w-full"
                viewBox="0 0 300 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M2 8C50 3 100 2 150 5C200 8 250 4 298 6"
                  stroke="url(#underline-gradient)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  className={`transition-all duration-1000 delay-500 ${heroVisible ? "opacity-100" : "opacity-0"}`}
                  style={{
                    strokeDasharray: 300,
                    strokeDashoffset: heroVisible ? 0 : 300,
                    transition: "stroke-dashoffset 1.2s ease-out 0.5s, opacity 0.3s ease-out 0.5s",
                  }}
                />
                <defs>
                  <linearGradient
                    id="underline-gradient"
                    x1="0"
                    y1="0"
                    x2="300"
                    y2="0"
                  >
                    <stop stopColor="#2563eb" />
                    <stop offset="0.5" stopColor="#6366f1" />
                    <stop offset="1" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
              </svg>
            </span>
            <br />
            with AI
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-2 leading-relaxed">
            EdSwarm brings AI swarm intelligence to your Ed Discussion courses.
          </p>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            <span className="font-semibold text-foreground">Get instant answers</span> with context-aware retrieval, <span className="font-semibold text-foreground">catch duplicates</span> before
            they&apos;re posted, and let teachers{" "}
            <span className="font-semibold text-foreground">answer at scale</span> — all in
            one beautiful interface.
          </p>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Save teaching staff <span className="font-semibold text-foreground">5–10 hours per week</span> by automating repetitive Q&A, reducing duplicate posts, and letting AI handle the first pass — so instructors can focus on what matters most. Students save <span className="font-semibold text-foreground">2–3 hours per week</span> by getting instant, accurate answers instead of waiting hours for a reply.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onEnterDashboard}
              className="group relative inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-lg shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300 hover:-translate-y-0.5"
            >
              Go to Dashboard
              <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
            </button>
          </div>

          {/* Floating feature pills */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-14 max-w-2xl mx-auto">
            {[
              { icon: Sparkles, label: "AI Digests" },
              { icon: MessageSquareText, label: "Smart Chat" },
              { icon: Copy, label: "Duplicate Check" },
              { icon: Bot, label: "Auto-Answers" },
              { icon: FileText, label: "Materials" },
              { icon: GraduationCap, label: "Teacher Tools" },
            ].map(({ icon: Icon, label }, i) => (
              <div
                key={label}
                className={`flex items-center gap-2 px-4 py-2 rounded-full bg-white/70 backdrop-blur border border-border/50 shadow-sm text-sm text-muted-foreground transition-all duration-700 ${heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
                style={{ transitionDelay: `${800 + i * 100}ms` }}
              >
                <Icon className="w-3.5 h-3.5 text-primary" />
                {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section ref={featuresRef} className="py-24 px-6 bg-white relative">
        <div className="max-w-6xl mx-auto">
          <div
            className={`text-center mb-16 transition-all duration-700 ${featuresVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
          >
            <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-primary mb-3">
              Features
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-4">
              Everything you need, intelligently connected
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-lg">
              Powerful AI tools that work together to transform how you interact
              with Ed Discussion.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className={`group relative p-6 rounded-2xl border ${feature.border} bg-white hover:shadow-lg transition-all duration-500 ${featuresVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                  style={{ transitionDelay: `${200 + i * 100}ms` }}
                >
                  <div
                    className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}
                  >
                    <Icon className={`w-6 h-6 ${feature.text}`} />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                  <div
                    className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-300`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Capabilities strip */}
      <section
        ref={capabilitiesRef}
        className="py-20 px-6 bg-gradient-to-b from-slate-50/80 to-white"
      >
        <div className="max-w-6xl mx-auto">
          <div
            className={`text-center mb-14 transition-all duration-700 ${capabilitiesVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
          >
            <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-primary mb-3">
              Capabilities
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground">
              Built for the way you learn & teach
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {CAPABILITIES.map((cap, i) => {
              const Icon = cap.icon;
              return (
                <div
                  key={cap.label}
                  className={`group p-5 rounded-2xl bg-white border border-border/50 hover:border-primary/20 hover:shadow-md transition-all duration-500 ${capabilitiesVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
                  style={{ transitionDelay: `${150 + i * 80}ms` }}
                >
                  <Icon className="w-5 h-5 text-primary mb-3 group-hover:scale-110 transition-transform duration-300" />
                  <h4 className="text-sm font-bold text-foreground mb-1">
                    {cap.label}
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {cap.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Student vs Teacher */}
      <section ref={rolesRef} className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div
            className={`text-center mb-16 transition-all duration-700 ${rolesVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
          >
            <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-primary mb-3">
              Two Perspectives
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-4">
              Designed for students & teachers alike
            </h2>
          </div>

          <div
            className={`grid md:grid-cols-2 gap-8 transition-all duration-700 ${rolesVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
            style={{ transitionDelay: "200ms" }}
          >
            {/* Student card */}
            <div className="relative p-8 rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50/50 to-indigo-50/30 overflow-hidden group">
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-blue-100/50 to-transparent rounded-bl-full" />
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center mb-6">
                  <Users className="w-7 h-7 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-4">
                  Student View
                </h3>
                <ul className="space-y-3">
                  {[
                    "AI-powered course activity digests",
                    "Smart chat — get answers without posting to the forum",
                    "Duplicate detection keeps the board clutter-free",
                    "AI-assisted post drafting & replies",
                    "Upload course materials for better AI context",
                    "Browse threads with time range filtering",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-foreground/80">
                      <CheckCircle2 className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Teacher card */}
            <div className="relative p-8 rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-50/50 to-purple-50/30 overflow-hidden group">
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-violet-100/50 to-transparent rounded-bl-full" />
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-violet-100 flex items-center justify-center mb-6">
                  <GraduationCap className="w-7 h-7 text-violet-600" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-4">
                  Teacher View
                </h3>
                <ul className="space-y-3">
                  {[
                    "Configure AI agents per course with custom instructions",
                    "Upload context files to guide AI answers",
                    "Filter agent scope by thread categories",
                    "Batch-generate answers for pending questions",
                    "Review, edit & approve before posting",
                    "Everything in Student view, plus admin tools",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-foreground/80">
                      <CheckCircle2 className="w-4 h-4 text-violet-500 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6 bg-gradient-to-b from-slate-50/60 to-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-primary mb-3">
              How It Works
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground">
              Three steps to smarter courses
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Connect",
                desc: "Link your Ed Discussion account with an API token. Or try the full demo — no account needed.",
                icon: Zap,
              },
              {
                step: "02",
                title: "Explore",
                desc: "Browse AI-generated digests, dive into threads, chat with the AI, and manage your course materials.",
                icon: Search,
              },
              {
                step: "03",
                title: "Accelerate",
                desc: "Draft posts with AI, detect duplicates, and — if you're a teacher — batch-answer questions at scale.",
                icon: Sparkles,
              },
            ].map(({ step, title, desc, icon: Icon }, i) => (
              <div key={step} className="relative text-center">
                {i < 2 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-px bg-gradient-to-r from-border to-transparent" />
                )}
                <div className="w-16 h-16 rounded-2xl bg-white border border-border/60 shadow-sm flex items-center justify-center mx-auto mb-5 relative">
                  <Icon className="w-7 h-7 text-primary" />
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                    {step}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">
                  {title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech powered by */}
      <section className="py-16 px-6 bg-white border-t border-border/30">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground/60 mb-6">
            Powered By
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 text-muted-foreground/50">
            {[
              "Next.js",
              "React",
              "Anthropic Claude",
              "Tailwind CSS",
              "Supabase",
              "Ed Discussion API",
            ].map((tech) => (
              <span
                key={tech}
                className="text-sm font-semibold tracking-wide hover:text-muted-foreground transition-colors"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section
        ref={ctaRef}
        className="py-24 px-6 bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 relative overflow-hidden"
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle at 30% 50%, rgba(99,102,241,0.4) 0%, transparent 50%), radial-gradient(circle at 70% 50%, rgba(37,99,235,0.3) 0%, transparent 50%)`,
          }}
        />
        <div
          className={`relative max-w-2xl mx-auto text-center transition-all duration-700 ${ctaVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
        >
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
            Ready to dive in?
          </h2>
          <p className="text-blue-200/70 text-lg mb-10">
            Your courses are waiting. Let AI help you stay on top of everything.
          </p>
          <button
            onClick={onEnterDashboard}
            className="group inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl bg-white text-foreground font-semibold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-0.5"
          >
            Enter Dashboard
            <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 bg-slate-950 text-center">
        <p className="text-sm text-slate-500">
          EdSwarm — AI Swarm Intelligence for Ed Discussion
        </p>
      </footer>
    </div>
  );
}
