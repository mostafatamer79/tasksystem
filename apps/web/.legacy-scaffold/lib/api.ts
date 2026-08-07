import axios, { AxiosError, AxiosRequestConfig } from "axios";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const BASE = `${API_URL}/api`;

export const api = axios.create({
  baseURL: BASE,
  withCredentials: true, // httpOnly access_token / refresh_token cookies
  headers: { "Content-Type": "application/json" },
});

export interface ApiError {
  statusCode: number;
  message: string | string[];
  path?: string;
  timestamp?: string;
}

export function errorMessage(err: unknown, fallback = "Something went wrong"): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ApiError | undefined;
    if (data?.message) return Array.isArray(data.message) ? data.message.join(", ") : data.message;
    if (err.code === "ERR_NETWORK") return "Cannot reach the server. Is the API running?";
  }
  return fallback;
}

// ---- access token kept in memory (for Authorization header + socket handshake) ----
let accessToken: string | null = null;
export const setAccessToken = (t: string | null) => {
  accessToken = t;
};
export const getAccessToken = () => accessToken;

api.interceptors.request.use((config) => {
  if (accessToken && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// ---- automatic refresh-token retry on 401 ----
let refreshPromise: Promise<string | null> | null = null;

async function refreshTokens(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post<{ accessToken: string; refreshToken: string }>(
        `${BASE}/auth/refresh`,
        {},
        { withCredentials: true },
      )
      .then((res) => {
        setAccessToken(res.data.accessToken);
        return res.data.accessToken;
      })
      .catch(() => {
        setAccessToken(null);
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
    const original = error.config as (AxiosRequestConfig & { _retried?: boolean }) | undefined;
    const url = original?.url ?? "";
    const isAuthCall = url.includes("/auth/login") || url.includes("/auth/refresh");
    if (error.response?.status === 401 && original && !original._retried && !isAuthCall) {
      original._retried = true;
      const token = await refreshTokens();
      if (token) {
        original.headers = { ...(original.headers ?? {}), Authorization: `Bearer ${token}` };
        return api(original);
      }
      // refresh failed → hard logout to login page
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

/** Ensure we hold a usable access token (used for the socket handshake). */
export async function ensureAccessToken(): Promise<string | null> {
  if (accessToken) return accessToken;
  return refreshTokens();
}

// ---- role cookie for middleware route gating (UI-only; the API enforces RBAC) ----
export function setRoleCookie(role: string | null) {
  if (typeof document === "undefined") return;
  if (role) {
    document.cookie = `role=${role}; path=/; max-age=${7 * 24 * 3600}; samesite=lax`;
  } else {
    document.cookie = "role=; path=/; max-age=0";
  }
}
