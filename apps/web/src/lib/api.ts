import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { ApiError } from './types';

export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3101/api').trim().replace(/\/+$/, '');
export const SOCKET_URL = (process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:3101').trim().replace(/\/+$/, '');

const ACCESS_TOKEN_KEY = 'tms_access_token';

export const tokenStore = {
  get(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },
  set(token: string | null) {
    if (typeof window === 'undefined') return;
    if (token) localStorage.setItem(ACCESS_TOKEN_KEY, token);
    else localStorage.removeItem(ACCESS_TOKEN_KEY);
  },
};

export function setRoleCookie(role: string | null) {
  if (typeof document === 'undefined') return;
  if (role) {
    document.cookie = `tms_role=${role}; path=/; max-age=${7 * 24 * 3600}; samesite=lax`;
  } else {
    document.cookie = 'tms_role=; path=/; max-age=0';
  }
}

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post<{ accessToken: string }>(`${API_URL}/auth/refresh`, {}, { withCredentials: true })
      .then((res) => {
        tokenStore.set(res.data.accessToken);
        return res.data.accessToken;
      })
      .catch(() => {
        tokenStore.set(null);
        setRoleCookie(null);
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    const isAuthCall =
      original?.url?.includes('/auth/login') ||
      original?.url?.includes('/auth/refresh') ||
      original?.url?.includes('/auth/me'); // don't retry /auth/me — it's the hydration probe
    if (error.response?.status === 401 && original && !original._retried && !isAuthCall) {
      original._retried = true;
      const token = await refreshAccessToken();
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export function errorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ApiError | undefined;
    const msg = data?.message;
    if (Array.isArray(msg)) return msg.join(', ');
    if (typeof msg === 'string') return msg;
    if (err.response?.status === 429) return 'Too many attempts — please wait a minute';
    if (err.message === 'Network Error') return 'Cannot reach the server';
  }
  return fallback;
}
