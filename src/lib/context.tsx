"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { EdUser, EdCourseRole } from "./types";
import { DEMO_TOKEN } from "./mock-data";

interface TokenContextValue {
  token: string | null;
  user: EdUser | null;
  courses: EdCourseRole[];
  isDemo: boolean;
  setSession: (token: string, user: EdUser, courses: EdCourseRole[]) => void;
  clearSession: () => void;
}

const TokenContext = createContext<TokenContextValue | null>(null);

export function TokenProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<EdUser | null>(null);
  const [courses, setCourses] = useState<EdCourseRole[]>([]);

  const setSession = useCallback(
    (t: string, u: EdUser, c: EdCourseRole[]) => {
      setToken(t);
      setUser(u);
      setCourses(c);
    },
    []
  );

  const clearSession = useCallback(() => {
    setToken(null);
    setUser(null);
    setCourses([]);
  }, []);

  return (
    <TokenContext.Provider
      value={{ token, user, courses, isDemo: token === DEMO_TOKEN, setSession, clearSession }}
    >
      {children}
    </TokenContext.Provider>
  );
}

export function useToken() {
  const ctx = useContext(TokenContext);
  if (!ctx) throw new Error("useToken must be used within TokenProvider");
  return ctx;
}
