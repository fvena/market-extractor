import type { Browser, Page } from "playwright";
import { chromium } from "playwright";

/**
 * Shared browser instance for all scraping operations
 * Uses Playwright's chromium browser
 */
let browser: Browser | undefined;

export interface BrowserClientOptions {
  headless?: boolean;
  timeout?: number;
}

/**
 * Create a new page in the browser
 */
export async function initBrowser(): Promise<Page> {
  browser ??= await chromium.launch({ headless: true });

  const page = await browser.newPage();
  await page.setViewportSize({ height: 1080, width: 1920 });

  return page;
}

/**
 * Close the browser and cleanup resources
 */
export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = undefined;
  }
}

/**
 * Wait for a specified delay
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Navigate to a URL and wait for network idle
 */
export async function navigateTo(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: "networkidle" });
}

/**
 * Click an element and wait for navigation or network idle
 */
export async function clickAndWait(
  page: Page,
  selector: string,
  options: { waitForSelector?: string; waitForUrl?: string } = {},
): Promise<void> {
  const { waitForSelector, waitForUrl } = options;

  if (waitForUrl) {
    await Promise.all([page.waitForURL(waitForUrl), page.click(selector)]);
  } else if (waitForSelector) {
    await page.click(selector);
    await page.waitForSelector(waitForSelector);
  } else {
    await page.click(selector);
    await page.waitForLoadState("networkidle");
  }
}
