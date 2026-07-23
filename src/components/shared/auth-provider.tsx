"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  DEMO_USERS,
  clearSession,
  loadSession,
  loginAsUser,
  loginWithPassword,
  navItemsForRole,
} from "@/data/auth-session";
import type { User, UserSession } from "@/data/auth-types";
import { setNotificationActor } from "@/data/email-delivery";
import { getDataService } from "@/data/app-service";

type AuthContextValue = {
  ready: boolean;
  session: UserSession | null;
  login: (
    email: string,
    password: string
  ) => { ok: true } | { ok: false; error: string };
  quickLogin: (user: User) => void;
  logout: () => void;
  navItems: Array<{ href: string; label: string }>;
  demoUsers: User[];
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<UserSession | null>(null);

  useEffect(() => {
    const s = loadSession();
    setSession(s);
    setNotificationActor(s);
    try {
      getDataService().setNotificationSession(s);
    } catch {
      /* service may not be ready in edge cases */
    }
    setReady(true);
  }, []);

  const login = useCallback((email: string, password: string) => {
    const result = loginWithPassword(email, password);
    if (!result.ok) return result;
    setSession(result.session);
    setNotificationActor(result.session);
    getDataService().setNotificationSession(result.session);
    return { ok: true as const };
  }, []);

  const quickLogin = useCallback((user: User) => {
    const s = loginAsUser(user);
    setSession(s);
    setNotificationActor(s);
    getDataService().setNotificationSession(s);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
    setNotificationActor(null);
    getDataService().setNotificationSession(null);
  }, []);

  const navItems = useMemo(
    () => (session ? navItemsForRole(session.role) : []),
    [session]
  );

  const value: AuthContextValue = {
    ready,
    session,
    login,
    quickLogin,
    logout,
    navItems,
    demoUsers: DEMO_USERS,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
