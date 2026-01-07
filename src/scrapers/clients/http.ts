import { config } from "../../config";

/**
 * HTTP client for REST API calls and HTML fetching
 */

export interface FetchOptions {
  body?: string;
  headers?: Record<string, string>;
  method?: "GET" | "POST";
  timeout?: number;
}

export interface FetchResult<T> {
  data: T | undefined;
  error: string | undefined;
  status: number;
}

export interface HtmlFetchResult {
  error: string | undefined;
  html: string | undefined;
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

/**
 * Fetch HTML content from a URL
 */
export async function fetchHtml(
  url: string,
  options: FetchOptions = {},
  cookieJar?: CookieJar,
): Promise<HtmlFetchResult & { cookieJar?: CookieJar }> {
  const { body, headers = {}, method = "GET", timeout = config.request.timeout } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);

  try {
    const fetchOptions: RequestInit = {
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        ...headers,
      },
      method,
      signal: controller.signal,
    };

    // Add cookies if we have them
    if (cookieJar) {
      (fetchOptions.headers as Record<string, string>).Cookie = cookieJar.toString();
    }

    if (body && method === "POST") {
      fetchOptions.body = body;
      (fetchOptions.headers as Record<string, string>)["Content-Type"] =
        "application/x-www-form-urlencoded";
    }

    const response = await fetch(url, fetchOptions);

    clearTimeout(timeoutId);

    // Update cookies from response
    if (cookieJar) {
      const setCookie = response.headers.get("set-cookie");
      cookieJar.update(setCookie);
    }

    // Handle redirects
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (location) {
        const redirectUrl = new URL(location, url).href;
        return await fetchHtml(
          redirectUrl,
          { ...options, body: undefined, method: "GET" },
          cookieJar,
        );
      }
    }

    if (!response.ok) {
      return {
        error: `HTTP error: ${String(response.status)} ${response.statusText}`,
        html: undefined,
        status: response.status,
      };
    }

    const html = await response.text();

    return {
      cookieJar,
      error: undefined,
      html,
      status: response.status,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === "AbortError") {
      return {
        error: `Request timeout after ${String(timeout)}ms`,
        html: undefined,
        status: 0,
      };
    }

    return {
      error: error instanceof Error ? error.message : "Unknown error",
      html: undefined,
      status: 0,
    };
  }
}

/**
 * Retry HTML fetch with exponential backoff
 */
export async function fetchHtmlWithRetry(
  url: string,
  options: FetchOptions = {},
  retries: number = config.request.retries,
): Promise<HtmlFetchResult> {
  let lastError: HtmlFetchResult = { error: "No attempts made", html: undefined, status: 0 };

  for (let attempt = 0; attempt < retries; attempt++) {
    const result = await fetchHtml(url, options);

    if (result.html !== undefined) {
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

/**
 * Extract ASPX form tokens from HTML
 */
export function extractAspxTokens(html: string): Record<string, string> {
  const tokens: Record<string, string> = {};

  const tokenNames = ["__VIEWSTATE", "__VIEWSTATEGENERATOR", "__EVENTVALIDATION"];

  for (const name of tokenNames) {
    const regex = new RegExp(`id="${name}"\\s+value="([^"]*)"`, "i");
    const match = regex.exec(html);
    if (match?.[1]) {
      tokens[name] = match[1];
    }
  }

  return tokens;
}

/**
 * Build form data string from object
 */
export function buildFormData(data: Record<string, string>): string {
  return Object.entries(data)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
}

/**
 * Simple cookie jar for maintaining session
 */
export class CookieJar {
  private cookies = new Map<string, string>();

  update(setCookieHeaders: null | string | string[]): void {
    if (!setCookieHeaders) return;

    const headers = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];

    for (const header of headers) {
      const match = /^([^=]+)=([^;]*)/.exec(header);
      if (match?.[1] && match[2]) {
        this.cookies.set(match[1], match[2]);
      }
    }
  }

  toString(): string {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }
}
