/** Base API URL without trailing slash (avoids `//api/...` URLs) */
import { clearAuthToken, getAuthToken } from "./auth-token";

const API_URL = String(import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return API_URL ? `${API_URL}${normalizedPath}` : normalizedPath;
}

export interface FetchOptions extends RequestInit {
  timeout?: number;
  retries?: number;
}

let serverWarmed = false;
let wakingUpCallback: ((isWaking: boolean) => void) | null = null;

export function setWakingUpCallback(cb: (isWaking: boolean) => void) {
  wakingUpCallback = cb;
}

export function isServerWarmed(): boolean {
  return serverWarmed;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch wrapper with timeout, retry/backoff, and cold-start UX.
 * Shows "waking up" state after 3s on first load when server is cold.
 */
export async function apiFetch<T>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { timeout = 60000, retries = 3, ...fetchOptions } = options;
  const url = buildApiUrl(path);

  let attempt = 0;
  let showWaking = false;
  const wakeTimer = setTimeout(() => {
    if (!serverWarmed) {
      showWaking = true;
      wakingUpCallback?.(true);
    }
  }, 3000);

  while (attempt < retries) {
    attempt++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const token = getAuthToken();
      const response = await fetch(url, {
        ...fetchOptions,
        credentials: "include",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...fetchOptions.headers,
        },
      });

      clearTimeout(timeoutId);
      clearTimeout(wakeTimer);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Request failed" }));
        const apiError = new ApiError(
          error.error || "Request failed",
          response.status,
          error.details
        );

        if (response.status === 401) {
          clearAuthToken();
        }

        throw apiError;
      }

      serverWarmed = true;
      wakingUpCallback?.(false);
      return response.json() as Promise<T>;
    } catch (err) {
      clearTimeout(timeoutId);

      if (attempt >= retries || err instanceof ApiError) {
        clearTimeout(wakeTimer);
        wakingUpCallback?.(false);
        if (err instanceof ApiError) throw err;
        if (showWaking) {
          throw new ApiError(
            "Server is waking up — please wait a moment and try again",
            0
          );
        }
        throw err instanceof Error ? err : new Error("Network error");
      }

      // Exponential backoff: 2s, 4s, 8s
      await sleep(Math.pow(2, attempt) * 1000);
    }
  }

  throw new Error("Request failed after retries");
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
};
