'use client';

import { create } from 'zustand';
import type { User } from './types';
import { api, tokenStore, setRoleCookie } from './api';

interface AuthState {
  user: User | null;
  hydrated: boolean;
  setUser: (user: User | null) => void;
  hydrate: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  hydrated: false,
  setUser: (user) => set({ user, hydrated: true }),
  hydrate: async () => {
    try {
      const res = await api.get<User>('/auth/me');
      // /auth/me returns AuthUser { id, email, role, name } — keep stored profile when richer.
      set((s) => ({ user: { ...s.user, ...res.data } as User, hydrated: true }));
    } catch {
      tokenStore.set(null);
      setRoleCookie(null);
      set({ user: null, hydrated: true });
    }
  },
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore — clear local state regardless
    }
    tokenStore.set(null);
    setRoleCookie(null);
    set({ user: null });
  },
}));
