"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { AgentConfig } from "@/lib/types";
import {
  getAgentConfig,
  saveAgentConfig,
  clearAgentConfig,
} from "@/lib/agent-storage";

const DEFAULT_CONFIG: AgentConfig = {
  instructions: "",
  contextChunks: [],
  allowedCategories: [],
  blockedCategories: [],
  autoAnswerEnabled: false,
};

export function useAgentConfig(courseId: number, edUserId: number | null) {
  const [config, setConfig] = useState<AgentConfig>(() =>
    edUserId ? { ...DEFAULT_CONFIG } : getAgentConfig(courseId)
  );
  const [loading, setLoading] = useState(!!edUserId);
  const hasFetched = useRef(false);

  useEffect(() => {
    hasFetched.current = false;
  }, [courseId, edUserId]);

  useEffect(() => {
    if (!edUserId) {
      setConfig(getAgentConfig(courseId));
      setLoading(false);
      return;
    }

    if (hasFetched.current) return;
    hasFetched.current = true;

    let cancelled = false;
    setLoading(true);

    fetch(`/api/agent-config?courseId=${courseId}&edUserId=${edUserId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data?.config) {
          setConfig({
            ...DEFAULT_CONFIG,
            instructions: data.config.instructions ?? "",
            allowedCategories: data.config.allowedCategories ?? [],
            blockedCategories: data.config.blockedCategories ?? [],
            autoAnswerEnabled: data.config.autoAnswerEnabled ?? false,
          });
        } else {
          setConfig({ ...DEFAULT_CONFIG });
        }
      })
      .catch(() => {
        if (!cancelled) setConfig({ ...DEFAULT_CONFIG });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [courseId, edUserId]);

  const saveConfig = useCallback(
    async (cfg: AgentConfig) => {
      if (!edUserId) {
        saveAgentConfig(courseId, cfg);
        return;
      }

      await fetch("/api/agent-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          edUserId,
          courseId,
          instructions: cfg.instructions,
          allowedCategories: cfg.allowedCategories,
          blockedCategories: cfg.blockedCategories,
          autoAnswerEnabled: cfg.autoAnswerEnabled,
        }),
      });
    },
    [courseId, edUserId]
  );

  const resetConfig = useCallback(async () => {
    if (!edUserId) {
      clearAgentConfig(courseId);
      setConfig(getAgentConfig(courseId));
      return;
    }

    await fetch("/api/agent-config", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ edUserId, courseId }),
    });
    setConfig({ ...DEFAULT_CONFIG });
  }, [courseId, edUserId]);

  return { config, loading, setConfig, saveConfig, resetConfig };
}
