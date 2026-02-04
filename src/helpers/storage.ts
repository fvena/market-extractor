import type { MarketStats } from "../types/market-stats.types";
import type { ProcessedProduct } from "../types/types";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "../config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get path for listings file
 */
function getListingsPath(slug: string): string {
  return path.join(config.outputDir, config.dirs.listings, `${slug}.json`);
}

/**
 * Get path for details file
 */
function getDetailsPath(slug: string): string {
  return path.join(config.outputDir, config.dirs.details, `${slug}.json`);
}

/**
 * Get path for processed file
 */
function getProcessedPath(slug: string): string {
  return path.join(config.outputDir, config.dirs.processed, `${slug}.json`);
}

/**
 * Get path for corporate actions file
 */
function getCorporateActionsPath(slug: string): string {
  return path.join(config.outputDir, config.dirs.details, `${slug}-corporate-actions.json`);
}

/**
 * Get path for market stats file
 */
function getMarketStatsPath(slug: string): string {
  return path.join(config.outputDir, config.dirs.markets, `${slug}.json`);
}

/**
 * Get path for report file
 */
function getReportPath(): string {
  return path.join(config.outputDir, config.reportFile);
}

/**
 * Ensure output directories exist
 */
async function ensureOutputDirectories(): Promise<void> {
  const directories = [
    config.outputDir,
    path.join(config.outputDir, config.dirs.listings),
    path.join(config.outputDir, config.dirs.details),
    path.join(config.outputDir, config.dirs.markets),
    path.join(config.outputDir, config.dirs.processed),
  ];

  for (const direction of directories) {
    await mkdir(direction, { recursive: true });
  }
}

function removeAbsolutePath(filePath: string): string {
  const absolutePath = path.resolve(__dirname, "..", "..");
  return filePath.replace(absolutePath, "");
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
 * Save products listings to JSON file
 */
export async function saveProductsListings(slug: string, data: unknown[]): Promise<string> {
  await ensureOutputDirectories();
  const path = getListingsPath(slug);
  // eslint-disable-next-line unicorn/no-null -- File path is safe
  await writeFile(path, JSON.stringify(data, null, 2), "utf8");
  return removeAbsolutePath(path);
}

/**
 * Load product listings from JSON file
 */
export async function loadProductsListings<T>(slug: string): Promise<T[] | undefined> {
  const path = getListingsPath(slug);
  if (!(await fileExists(path))) {
    return;
  }
  const content = await readFile(path, "utf8");
  return JSON.parse(content) as T[];
}

/**
 * Save products details to JSON file
 */
export async function saveProductsDetails(slug: string, data: unknown[]): Promise<string> {
  await ensureOutputDirectories();
  const path = getDetailsPath(slug);
  // eslint-disable-next-line unicorn/no-null -- File path is safe
  await writeFile(path, JSON.stringify(data, null, 2), "utf8");
  return removeAbsolutePath(path);
}

/**
 * Load products details from JSON file
 */
export async function loadProductsDetails<T>(slug: string): Promise<T[] | undefined> {
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
export async function saveProductsProcessed(
  slug: string,
  data: ProcessedProduct[],
): Promise<string> {
  await ensureOutputDirectories();
  const path = getProcessedPath(slug);
  // eslint-disable-next-line unicorn/no-null -- File path is safe
  await writeFile(path, JSON.stringify(data, null, 2), "utf8");
  return removeAbsolutePath(path);
}

/**
 * Load processed products from JSON file
 */
export async function loadProductsProcessed(slug: string): Promise<ProcessedProduct[] | undefined> {
  const path = getProcessedPath(slug);
  if (!(await fileExists(path))) {
    return;
  }
  const content = await readFile(path, "utf8");
  return JSON.parse(content) as ProcessedProduct[];
}

/**
 * Save corporate actions to JSON file
 */
export async function saveCorporateActions(slug: string, data: unknown): Promise<string> {
  await ensureOutputDirectories();
  const filePath = getCorporateActionsPath(slug);
  // eslint-disable-next-line unicorn/no-null -- File path is safe
  await writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
  return removeAbsolutePath(filePath);
}

/**
 * Load corporate actions from JSON file
 */
export async function loadCorporateActions<T>(slug: string): Promise<T | undefined> {
  const filePath = getCorporateActionsPath(slug);
  if (!(await fileExists(filePath))) {
    return;
  }
  const content = await readFile(filePath, "utf8");
  return JSON.parse(content) as T;
}

/**
 * Save market stats to JSON file
 */
export async function saveMarketStats(slug: string, data: MarketStats): Promise<string> {
  await ensureOutputDirectories();
  const filePath = getMarketStatsPath(slug);
  // eslint-disable-next-line unicorn/no-null -- File path is safe
  await writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
  return removeAbsolutePath(filePath);
}

/**
 * Load market stats from JSON file
 */
export async function loadMarketStats(slug: string): Promise<MarketStats | undefined> {
  const filePath = getMarketStatsPath(slug);
  if (!(await fileExists(filePath))) {
    return;
  }
  const content = await readFile(filePath, "utf8");
  return JSON.parse(content) as MarketStats;
}

/**
 * Clean all output directory contents
 */
export async function cleanAll(): Promise<void> {
  try {
    // Remove all subdirectories
    await rm(path.join(config.outputDir, config.dirs.listings), { force: true, recursive: true });
    await rm(path.join(config.outputDir, config.dirs.details), { force: true, recursive: true });
    await rm(path.join(config.outputDir, config.dirs.markets), { force: true, recursive: true });
    await rm(path.join(config.outputDir, config.dirs.processed), { force: true, recursive: true });

    // Remove report file
    await rm(getReportPath(), { force: true });

    // Recreate empty directories
    await ensureOutputDirectories();
  } catch {
    // Ignore errors
  }
}
