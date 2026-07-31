/**
 * api.ts
 * ---------------------------------------------------------------------------
 * Typed client for the Let's Save Our Planet API.
 * Every network failure is normalised into an `ApiError` so the UI can render
 * one predictable error state.
 */

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface AskResponse {
  answer: string;
  sources: string[];
  model: string;
  offTopic: boolean;
}

export interface HealthResponse {
  status: string;
  model: string;
  geminiConfigured: boolean;
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;

  constructor(message: string, status = 0, code = "network_error") {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

const DEFAULT_BASE_URL = "http://localhost:4000/api";

export const API_BASE_URL = (import.meta.env.VITE_API_URL ?? DEFAULT_BASE_URL).replace(
  /\/+$/,
  ""
);

const REQUEST_TIMEOUT_MS = 30_000;

interface ErrorPayload {
  error?: { code?: string; message?: string };
}

const friendlyMessage = (status: number, fallback: string): string => {
  if (status === 429) return "Too many questions at once. Wait a minute and try again.";
  if (status === 503) return "Planet AI is not configured on the server yet (missing API key).";
  if (status === 504) return "Planet AI took too long to answer. Try again.";
  if (status >= 500) return "Planet AI is having a rough moment. Try again shortly.";
  return fallback;
};

async function request<T>(path: string, init: RequestInit, signal?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const forwardAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", forwardAbort, { once: true });
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", Accept: "application/json", ...init.headers },
      signal: controller.signal,
    });

    const raw = await response.text();
    let payload: unknown = null;
    if (raw) {
      try {
        payload = JSON.parse(raw);
      } catch {
        throw new ApiError("The server sent a malformed response.", response.status, "bad_response");
      }
    }

    if (!response.ok) {
      const errorPayload = (payload ?? {}) as ErrorPayload;
      throw new ApiError(
        friendlyMessage(
          response.status,
          errorPayload.error?.message ?? `Request failed with status ${response.status}.`
        ),
        response.status,
        errorPayload.error?.code ?? "http_error"
      );
    }

    return payload as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if ((error as Error)?.name === "AbortError") {
      if (signal?.aborted) throw new ApiError("Request cancelled.", 0, "cancelled");
      throw new ApiError("The request timed out. Check your connection and retry.", 0, "timeout");
    }
    throw new ApiError(
      `Cannot reach the API at ${API_BASE_URL}. Is the backend running?`,
      0,
      "network_error"
    );
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener("abort", forwardAbort);
  }
}

/** POST /api/ask */
export const askPlanetAI = (
  question: string,
  history: ChatTurn[] = [],
  signal?: AbortSignal
): Promise<AskResponse> =>
  request<AskResponse>(
    "/ask",
    { method: "POST", body: JSON.stringify({ question, history }) },
    signal
  );

/** GET /api/health */
export const checkHealth = (signal?: AbortSignal): Promise<HealthResponse> =>
  request<HealthResponse>("/health", { method: "GET" }, signal);
