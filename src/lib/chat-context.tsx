"use client";

import {
  createContext,
  useContext,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import type { UIMessage } from "ai";

type ChatKey = string; // "main" or courseId as string

interface ChatContextValue {
  getMessages: (key: ChatKey) => UIMessage[];
  saveMessages: (key: ChatKey, messages: UIMessage[]) => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const messagesByKey = useRef<Map<ChatKey, UIMessage[]>>(new Map());

  const getMessages = useCallback((key: ChatKey): UIMessage[] => {
    return messagesByKey.current.get(key) ?? [];
  }, []);

  const saveMessages = useCallback((key: ChatKey, messages: UIMessage[]) => {
    messagesByKey.current.set(key, messages);
  }, []);

  return (
    <ChatContext.Provider value={{ getMessages, saveMessages }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChatContext must be used within ChatProvider");
  return ctx;
}
