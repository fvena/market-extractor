import type { ProcessedProduct } from "../markets/types";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "../config";

/**
 * Get path for listings file
 */
export function getListingsPath(slug: string): string {
  return path.join(config.outputDir, config.dirs.listings, `${slug}.json`);
}

/**
 * Get path for details file
 */
export function getDetailsPath(slug: string): string {
  return path.join(config.outputDir, config.dirs.details, `${slug}.json`);
}

/**
 * Get path for processed file
 */
export function getProcessedPath(slug: string): string {
  return path.join(config.outputDir, config.dirs.processed, `${slug}.json`);
}

/**
 * Get path for report file
 */
export function getReportPath(): string {
  return path.join(config.outputDir, config.reportFile);
}

/**
 * Ensure output directories exist
 */
export async function ensureOutputDirectories(): Promise<void> {
  const directories = [
    config.outputDir,
    path.join(config.outputDir, config.dirs.listings),
    path.join(config.outputDir, config.dirs.details),
    path.join(config.outputDir, config.dirs.processed),
  ];

  for (const direction of directories) {
    await mkdir(direction, { recursive: true });
  }
}

/**
 * Check if a file exists
 */
async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Save listings to JSON file
 */
export async function saveListings(slug: string, data: unknown[]): Promise<void> {
  await ensureOutputDirectories();
  const path = getListingsPath(slug);
  // eslint-disable-next-line security/detect-non-literal-fs-filename, unicorn/no-null -- File path is safe
  await writeFile(path, JSON.stringify(data, null, 2), "utf8");
}

/**
 * Load listings from JSON file
 */
export async function loadListings<T>(slug: string): Promise<T[] | undefined> {
  const path = getListingsPath(slug);
  if (!(await fileExists(path))) {
    return;
  }
  const content = await readFile(path, "utf8");
  return JSON.parse(content) as T[];
}

/**
 * Save details to JSON file
 */
export async function saveDetails(slug: string, data: unknown[]): Promise<void> {
  await ensureOutputDirectories();
  const path = getDetailsPath(slug);
  // eslint-disable-next-line security/detect-non-literal-fs-filename , unicorn/no-null -- File path is safe
  await writeFile(path, JSON.stringify(data, null, 2), "utf8");
}

/**
 * Load details from JSON file
 */
export async function loadDetails<T>(slug: string): Promise<T[] | undefined> {
  const path = getDetailsPath(slug);
  if (!(await fileExists(path))) {
    return;
  }
  const content = await readFile(path, "utf8");
  return JSON.parse(content) as T[];
}

/**
 * Save processed products to JSON file
 */
export async function saveProcessed(slug: string, data: ProcessedProduct[]): Promise<void> {
  await ensureOutputDirectories();
  const path = getProcessedPath(slug);
  // eslint-disable-next-line security/detect-non-literal-fs-filename, unicorn/no-null -- File path is safe
  await writeFile(path, JSON.stringify(data, null, 2), "utf8");
}

/**
 * Load processed products from JSON file
 */
export async function loadProcessed(slug: string): Promise<ProcessedProduct[] | undefined> {
  const path = getProcessedPath(slug);
  if (!(await fileExists(path))) {
    return;
  }
  const content = await readFile(path, "utf8");
  return JSON.parse(content) as ProcessedProduct[];
}

/**
 * Check if listings file exists for a market
 */
export async function hasListings(slug: string): Promise<boolean> {
  return fileExists(getListingsPath(slug));
}

/**
 * Check if details file exists for a market
 */
export async function hasDetails(slug: string): Promise<boolean> {
  return fileExists(getDetailsPath(slug));
}

/**
 * Check if processed file exists for a market
 */
export async function hasProcessed(slug: string): Promise<boolean> {
  return fileExists(getProcessedPath(slug));
}

/**
 * Clean all output files for a specific market
 */
export async function cleanMarket(slug: string): Promise<void> {
  const paths = [getListingsPath(slug), getDetailsPath(slug), getProcessedPath(slug)];

  for (const path of paths) {
    try {
      await rm(path, { force: true });
    } catch {
      // Ignore errors for non-existent files
    }
  }
}

/**
 * Clean all output directory contents
 */
export async function cleanAll(): Promise<void> {
  try {
    // Remove all subdirectories
    await rm(path.join(config.outputDir, config.dirs.listings), { force: true, recursive: true });
    await rm(path.join(config.outputDir, config.dirs.details), { force: true, recursive: true });
    await rm(path.join(config.outputDir, config.dirs.processed), { force: true, recursive: true });

    // Remove report file
    await rm(getReportPath(), { force: true });

    // Recreate empty directories
    await ensureOutputDirectories();
  } catch {
    // Ignore errors
  }
}
