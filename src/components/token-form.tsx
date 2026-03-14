"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToken } from "@/lib/context";
import { KeyRound, ArrowRight, Loader2, ExternalLink, Play } from "lucide-react";
import { DEMO_TOKEN, DEMO_USER, DEMO_COURSE_ROLES } from "@/lib/mock-data";

export function TokenForm() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setSession } = useToken();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ed/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Invalid token");
      }

      const data = await res.json();
      setSession(trimmed, data.user, data.courses);
      router.push("/platform");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to validate token");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <KeyRound className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Ed Swarm
          </h1>
          <p className="mt-2 text-muted-foreground">
            AI swarm intelligence for your Ed Discussion courses
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-lg shadow-blue-100/50 border border-border/60 p-6 space-y-5"
        >
          <div>
            <label
              htmlFor="token"
              className="block text-sm font-medium text-foreground mb-2"
            >
              Ed API Token
            </label>
            <input
              id="token"
              type="password"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste your token here..."
              className="w-full px-4 py-3 rounded-xl border border-border bg-muted/30 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-primary transition-all"
              disabled={loading}
              autoFocus
            />
          </div>

          {error && (
            <div className="text-sm text-destructive bg-red-50 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                Continue to Platform
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <a
            href="https://edstem.org/us/settings/api-tokens"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            Get your API token
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </form>

        <button
          onClick={() => {
            setSession(DEMO_TOKEN, DEMO_USER, DEMO_COURSE_ROLES);
            router.push("/platform");
          }}
          className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-primary/30 text-primary font-medium hover:bg-primary/5 hover:border-primary/50 transition-colors"
        >
          <Play className="w-4 h-4" />
          Try Demo (no API token needed)
        </button>
      </div>
    </div>
  );
}
