import { create } from "zustand";
import type { User } from "@/lib/types";
import { api, setAccessToken, setRoleCookie, type LoginResponse } from "@/lib/api";

interface AuthState {
  user: User | null;
  status: "loading" | "authenticated" | "anonymous";
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  loadSession: () => Promise<User | null>;
  setUser: (user: User | null) => void;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  status: "loading",
  isAdmin: false,

  setUser: (user) => set({ user, isAdmin: user?.role === "ADMIN" }),

  login: async (email, password) => {
    const res = await api.post<LoginResponse>("/auth/login", { email, password });
    setAccessToken(res.data.accessToken);
    setRoleCookie(res.data.user.role);
    set({ user: res.data.user, status: "authenticated", isAdmin: res.data.user.role === "ADMIN" });
    return res.data.user;
  },

  logout: async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // best effort
    }
    setAccessToken(null);
    setRoleCookie(null);
    set({ user: null, status: "anonymous", isAdmin: false });
  },

  // Restore a session from httpOnly cookies after a page reload.
  loadSession: async () => {
    if (get().status === "authenticated") return get().user;
    try {
      const res = await api.get<User>("/auth/me");
      setRoleCookie(res.data.role);
      set({ user: res.data, status: "authenticated", isAdmin: res.data.role === "ADMIN" });
      return res.data;
    } catch {
      set({ user: null, status: "anonymous", isAdmin: false });
      return null;
    }
  },
}));
