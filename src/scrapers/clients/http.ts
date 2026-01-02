import { config } from "../../config";

/**
 * HTTP client for REST API calls (Portfolio market)
 */

export interface FetchOptions {
  headers?: Record<string, string>;
  timeout?: number;
}

export interface FetchResult<T> {
  data: T | undefined;
  error: string | undefined;
  status: number;
}

/**
 * Fetch JSON data from an API endpoint
 */
export async function fetchJson<T>(
  url: string,
  options: FetchOptions = {},
): Promise<FetchResult<T>> {
  const { headers = {}, timeout = config.request.timeout } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        ...headers,
      },
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        data: undefined,
        error: `HTTP error: ${String(response.status)} ${response.statusText}`,
        status: response.status,
      };
    }

    const data = (await response.json()) as T;

    return {
      data,
      error: undefined,
      status: response.status,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === "AbortError") {
      return {
        data: undefined,
        error: `Request timeout after ${String(timeout)}ms`,
        status: 0,
      };
    }

    return {
      data: undefined,
      error: error instanceof Error ? error.message : "Unknown error",
      status: 0,
    };
  }
}

/**
 * Retry a fetch operation with exponential backoff
 */
export async function fetchWithRetry<T>(
  url: string,
  options: FetchOptions = {},
  retries: number = config.request.retries,
): Promise<FetchResult<T>> {
  let lastError: FetchResult<T> = { data: undefined, error: "No attempts made", status: 0 };

  for (let attempt = 0; attempt < retries; attempt++) {
    const result = await fetchJson<T>(url, options);

    if (result.data !== undefined) {
      return result;
    }

    lastError = result;

    // Exponential backoff: 1s, 2s, 4s, etc.
    if (attempt < retries - 1) {
      const backoffMs = Math.pow(2, attempt) * 1000;
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }

  return lastError;
}
