import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const config = {
  // Subdirectories for each data type
  dirs: {
    details: "details",
    listings: "listings",
    processed: "processed",
  },

  // Output directory for generated files (relative to project root)
  outputDir: path.join(__dirname, "..", "output"),

  // Report file name (in output root)
  reportFile: "report.xlsx",

  // Request settings (for future scraping implementation)
  request: {
    delayBetweenRequests: 1000,
    retries: 3,
    timeout: 30_000,
  },

  // Number of products to fetch in test mode
  testModeLimit: 5,
} as const;

export type Config = typeof config;
