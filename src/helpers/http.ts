import { config } from "../config";
import { delay } from "./browser";

/**
 * HTTP client for REST API calls and HTML fetching
 * Includes LRU caching and ethical scraping headers
 */

// =============================================================================
// LRU CACHE IMPLEMENTATION
// =============================================================================

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

/**
 * Simple LRU cache for HTTP responses
 * Reduces redundant API calls and improves performance
 */
class LRUCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private readonly maxSize: number;
  private readonly ttlMs: number;

  constructor(maxSize = 100, ttlMs = 5 * 60 * 1000) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.data;
  }

  set(key: string, data: T): void {
    // Remove oldest entries if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

// Cache instances for different content types
const jsonCache = new LRUCache<unknown>(100, 5 * 60 * 1000); // 5 min TTL
const htmlCache = new LRUCache<string>(200, 10 * 60 * 1000); // 10 min TTL

/**
 * Clear all HTTP caches
 */
export function clearHttpCache(): void {
  jsonCache.clear();
  htmlCache.clear();
}

/**
 * Get current cache statistics
 */
export function getHttpCacheStats(): { htmlCacheSize: number; jsonCacheSize: number } {
  return {
    htmlCacheSize: htmlCache.size,
    jsonCacheSize: jsonCache.size,
  };
}

// =============================================================================
// ETHICAL SCRAPING HEADERS
// =============================================================================

/**
 * Common headers for ethical web scraping
 * Includes identification and contact information
 */
const ETHICAL_HEADERS = {
  // Standard browser-like headers for compatibility
  "Accept-Encoding": "gzip, deflate, br",
  Connection: "keep-alive",
  "X-Bot-Contact": "https://github.com/fvena/market-extractor",
  // Identify as a bot for transparency
  "X-Bot-Name": "market-extractor",
} as const;

/**
 * User agent string identifying the scraper
 */
const USER_AGENT =
  "market-extractor/1.0 (Stock market data aggregator; +https://github.com/fvena/market-extractor) Mozilla/5.0 (compatible)";

// =============================================================================
// TYPES
// =============================================================================

interface FetchOptions {
  body?: string;
  headers?: Record<string, string>;
  method?: "GET" | "POST";
  /** Skip cache lookup and storage */
  skipCache?: boolean;
  timeout?: number;
}

interface FetchJsonResult<T> {
  /** Whether result came from cache */
  cached?: boolean;
  data?: T;
  error?: string;
  status: number;
}

interface HtmlFetchResult {
  /** Whether result came from cache */
  cached?: boolean;
  error?: string;
  html?: string;
  status: number;
}

/**
 * Build cache key for requests
 */
function buildCacheKey(url: string, options: FetchOptions = {}): string {
  const { body, method = "GET" } = options;
  return `${method}:${url}:${body ?? ""}`;
}

/**
 * Fetch JSON data from an API endpoint
 * Supports caching for GET requests
 */
export async function fetchJson<T>(
  url: string,
  options: FetchOptions = {},
): Promise<FetchJsonResult<T>> {
  const { headers = {}, skipCache = false, timeout = config.request.timeout } = options;

  // Check cache for GET requests
  const cacheKey = buildCacheKey(url, options);
  if (!skipCache && options.method !== "POST") {
    const cached = jsonCache.get(cacheKey) as T | undefined;
    if (cached) {
      return {
        cached: true,
        data: cached,
        error: undefined,
        status: 200,
      };
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": USER_AGENT,
        ...ETHICAL_HEADERS,
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

    // Cache successful responses
    if (!skipCache && options.method !== "POST") {
      jsonCache.set(cacheKey, data);
    }

    return {
      cached: false,
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
export async function fetchJsonWithRetry<T>(
  url: string,
  options: FetchOptions = {},
): Promise<FetchJsonResult<T>> {
  const retries = config.request.retries;
  let result: FetchJsonResult<T>;

  for (let attempt = 0; attempt < retries; attempt++) {
    result = await fetchJson<T>(url, options);

    // If we got a result, return it
    if (result.data) {
      return result;
    }

    // Don't retry on 404 or client errors
    if (result.status >= 400 && result.status < 500) {
      return result;
    }

    // Wait before retry
    if (attempt < retries - 1) {
      await delay(1000 * (attempt + 1));
    }
  }

  /* eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- we know that result is not undefined */
  return result!;
}

/**
 * Fetch HTML content from a URL
 * Supports caching for GET requests without cookies
 */
export async function fetchHtml(
  url: string,
  options: FetchOptions = {},
  cookieJar?: CookieJar,
): Promise<HtmlFetchResult & { cookieJar?: CookieJar }> {
  const {
    body,
    headers = {},
    method = "GET",
    skipCache = false,
    timeout = config.request.timeout,
  } = options;

  // Check cache for GET requests without cookies or body
  const cacheKey = buildCacheKey(url, options);
  const canCache = !skipCache && method === "GET" && !cookieJar && !body;

  if (canCache) {
    const cached = htmlCache.get(cacheKey);
    if (cached) {
      return {
        cached: true,
        cookieJar,
        error: undefined,
        html: cached,
        status: 200,
      };
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);

  try {
    const fetchOptions: RequestInit = {
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
        "User-Agent": USER_AGENT,
        ...ETHICAL_HEADERS,
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

    // Cache successful GET responses without cookies
    if (canCache) {
      htmlCache.set(cacheKey, html);
    }

    return {
      cached: false,
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
  cookieJar?: CookieJar,
): Promise<HtmlFetchResult> {
  const retries = config.request.retries;
  let result: HtmlFetchResult;

  for (let attempt = 0; attempt < retries; attempt++) {
    result = await fetchHtml(url, options, cookieJar);

    // If we got a result, return it
    if (result.html) {
      return result;
    }

    // Don't retry on 404 or client errors
    if (result.status >= 400 && result.status < 500) {
      return result;
    }

    // Wait before retry
    if (attempt < retries - 1) {
      await delay(1000 * (attempt + 1));
    }
  }

  /* eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- we know that lastError is not undefined */
  return result!;
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
