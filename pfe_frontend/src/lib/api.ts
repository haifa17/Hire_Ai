import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/store/useAuthStore";
import { humanizeApiError } from "@/lib/api-error";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

/**
 * Axios instance pre-configured with the backend base URL.
 * Interceptors handle access-token injection, silent refresh on 401, and
 * turning failures into user-friendly messages.
 */
const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
  timeout: 10_000,
});

// ─── Request interceptor ─────────────────────────────────────────────────────
// Attach the current access token (if any) to every outgoing request.
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const accessToken = useAuthStore.getState().accessToken;
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// ─── Response interceptor ────────────────────────────────────────────────────
// On 401, transparently refresh the token and replay the failed request.
// Concurrent requests that get a 401 during a refresh are queued.

// A 401 from these means "wrong credentials or link", not "session expired":
// refreshing would discard the real error and bounce the user to /login.
const PUBLIC_AUTH_PATHS = [
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/verify-email",
  "/auth/refresh",
];

const isPublicAuthRequest = (url?: string): boolean =>
  PUBLIC_AUTH_PATHS.some((path) => url?.includes(path));

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null): void => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token!);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !isPublicAuthRequest(original.url)
    ) {
      // Queue concurrent requests while a refresh is in-flight
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      const { setTokens, logout } = useAuthStore.getState();

      try {
        // Use a plain axios call (not the instance) to avoid a refresh loop
        const { data } = await axios.post<{
          data: { accessToken: string };
        }>(
          `${BASE_URL}/api/v1/auth/refresh`,
          {},
          {
            withCredentials: true,
          },
        );

        const { accessToken: newAccess } = data.data;
        setTokens(newAccess);
        processQueue(null, newAccess);
        original.headers.Authorization = `Bearer ${newAccess}`;
        return api(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        logout();
        if (globalThis.window !== undefined) {
          globalThis.window.location.href = "/login";
        }
        throw refreshError;
      } finally {
        isRefreshing = false;
      }
    }

    // Every failure that reaches the UI carries a message fit for display.
    humanizeApiError(error);
    throw error;
  },
);

export default api;
