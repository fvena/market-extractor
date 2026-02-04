/**
 * MIC (Market Identifier Code) utilities
 * Maps ISO 10383 MIC codes to market names
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Cache for MIC to market name mapping
let micNameCache: Map<string, string> | undefined;
// Cache for MIC to country code mapping
let micCountryCodeCache: Map<string, string> | undefined;
// Cache for country code to country name mapping
let countryNameCache: Map<string, string> | undefined;

/**
 * Load and parse the ISO10383 MIC CSV file
 * Populates both MIC -\> Market Name and MIC -\> Country Code caches
 */
function loadMicData(): void {
  if (micNameCache && micCountryCodeCache) return;

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const csvPath = path.join(__dirname, "..", "data", "ISO10383_MIC.csv");

  const content = readFileSync(csvPath, "utf8");
  const lines = content.split("\n");

  micNameCache = new Map<string, string>();
  micCountryCodeCache = new Map<string, string>();

  // Skip header line
  // Columns: MIC(0), OPERATING MIC(1), OPRT/SGMT(2), MARKET NAME(3), ..., ISO COUNTRY CODE(8)
  for (let index = 1; index < lines.length; index++) {
    const line = lines[index];
    if (!line?.trim()) continue;

    // Parse CSV line (handling quoted fields)
    const fields = parseCSVLine(line);
    if (fields.length < 9) continue;

    const mic = fields[0];
    const marketName = fields[3];
    const countryCode = fields[8];

    if (mic) {
      if (marketName) {
        micNameCache.set(mic, marketName);
      }
      if (countryCode) {
        micCountryCodeCache.set(mic, countryCode);
      }
    }
  }
}

/**
 * Load and parse the ISO3166-1 alpha-2 CSV file
 * Returns a Map of country code -\> country name
 */
function loadCountryData(): Map<string, string> {
  if (countryNameCache) return countryNameCache;

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const csvPath = path.join(__dirname, "..", "data", "ISO3166-1_alpha-2.csv");

  const content = readFileSync(csvPath, "utf8");
  const lines = content.split("\n");

  countryNameCache = new Map<string, string>();

  // Skip header line (country_code,country_name)
  for (let index = 1; index < lines.length; index++) {
    const line = lines[index];
    if (!line?.trim()) continue;

    const [countryCode, countryName] = line.split(",");
    if (countryCode && countryName) {
      countryNameCache.set(countryCode.trim(), countryName.trim());
    }
  }

  return countryNameCache;
}

/**
 * Parse a CSV line, handling quoted fields with commas
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  // Add last field
  fields.push(current.trim());

  return fields;
}

/**
 * Get country name for a MIC code
 * First gets the ISO country code from the MIC, then maps to country name
 * Returns undefined if no mapping found
 */
export function getMicCountryName(mic: string): string | undefined {
  loadMicData();
  const countryCode = micCountryCodeCache?.get(mic);
  if (!countryCode) return undefined;

  const countryData = loadCountryData();
  return countryData.get(countryCode);
}

/**
 * Get market names for multiple MIC codes
 * Returns an array of market names (or MIC codes if no mapping found)
 */
export function getMicMarketNames(mics: string[]): string[] {
  loadMicData();
  return mics.map((mic) => micNameCache?.get(mic) ?? mic);
}
