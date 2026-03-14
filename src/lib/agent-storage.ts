import type { AgentConfig } from "./types";

const STORAGE_PREFIX = "edswarm_agent_";

const DEFAULT_CONFIG: AgentConfig = {
  instructions: "",
  contextChunks: [],
  allowedCategories: [],
  blockedCategories: [],
  autoAnswerEnabled: false,
};

function key(courseId: number): string {
  return `${STORAGE_PREFIX}${courseId}`;
}

export function getAgentConfig(courseId: number): AgentConfig {
  if (typeof window === "undefined") return { ...DEFAULT_CONFIG };
  try {
    const raw = localStorage.getItem(key(courseId));
    if (!raw) return { ...DEFAULT_CONFIG };
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveAgentConfig(courseId: number, config: AgentConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key(courseId), JSON.stringify(config));
}

export function clearAgentConfig(courseId: number): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(key(courseId));
}
