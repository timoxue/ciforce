/**
 * Auth store — cookie-based session, server is source of truth.
 *
 * The session lives in an HttpOnly cookie set by the backend, so this store
 * holds only the cached `user` and a "bootstrapped" flag (have we asked
 * /me yet?). On first app load we call `bootstrap()` to populate either the
 * user or a "not logged in" state.
 */
import { create } from 'zustand';

export interface User {
  id: number;
  email: string;
  verified: boolean;
  onboarding_done: boolean;
  created_at: number;
}

const BACKEND = (import.meta as any).env?.VITE_BACKEND_URL ?? '';
const api = (path: string) => `${BACKEND}${path}`;

const j = async (path: string, init: RequestInit = {}) => {
  const r = await fetch(api(path), {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    ...init,
  });
  const text = await r.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!r.ok) {
    // FastAPI HTTPException shape: { detail: "string" } (or a list for 422)
    const detail = body?.detail ?? body ?? r.statusText;
    const err: any = new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
    err.status = r.status;
    err.code = typeof detail === 'string' ? detail : undefined;
    throw err;
  }
  return body;
};

interface AuthState {
  user: User | null;
  bootstrapped: boolean;
  loading: boolean;
  error: string | null;

  bootstrap: () => Promise<void>;
  signup: (email: string) => Promise<{ cooldown: number }>;
  resend: (email: string) => Promise<{ cooldown: number }>;
  verify: (email: string, code: string, password: string) => Promise<User>;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  markOnboardingDone: () => Promise<void>;

  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  bootstrapped: false,
  loading: false,
  error: null,

  bootstrap: async () => {
    if (get().bootstrapped) return;
    try {
      const r = await j('/api/auth/me');
      set({ user: r.user, bootstrapped: true });
    } catch (e: any) {
      // 401 is expected if not logged in
      set({ user: null, bootstrapped: true });
    }
  },

  signup: async (email) => {
    set({ loading: true, error: null });
    try {
      const r = await j('/api/auth/signup', { method: 'POST', body: JSON.stringify({ email }) });
      return { cooldown: r.cooldown ?? 60 };
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    } finally {
      set({ loading: false });
    }
  },

  resend: async (email) => {
    set({ loading: true, error: null });
    try {
      const r = await j('/api/auth/resend', { method: 'POST', body: JSON.stringify({ email }) });
      return { cooldown: r.cooldown ?? 60 };
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    } finally {
      set({ loading: false });
    }
  },

  verify: async (email, code, password) => {
    set({ loading: true, error: null });
    try {
      const r = await j('/api/auth/verify', {
        method: 'POST',
        body: JSON.stringify({ email, code, password }),
      });
      set({ user: r.user });
      return r.user;
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    } finally {
      set({ loading: false });
    }
  },

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const r = await j('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      set({ user: r.user });
      return r.user;
    } catch (e: any) {
      set({ error: e.message });
      throw e;
    } finally {
      set({ loading: false });
    }
  },

  logout: async () => {
    try { await j('/api/auth/logout', { method: 'POST' }); } catch {}
    set({ user: null });
  },

  markOnboardingDone: async () => {
    try {
      await j('/api/auth/onboarding-done', { method: 'POST' });
      const u = get().user;
      if (u) set({ user: { ...u, onboarding_done: true } });
    } catch {
      // non-fatal; the next /me will reconcile
    }
  },

  clearError: () => set({ error: null }),
}));
