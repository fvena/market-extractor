/**
 * Market scrapers
 *
 * Architecture:
 * - clients/  : Browser and HTTP utilities
 * - parsers/  : HTML/DOM data extraction
 * - fetchers/ : Navigation, pagination, and orchestration
 */

// Client utilities
export { closeBrowser, delay, initBrowser, navigateTo } from "./clients/browser";
export type { FetchOptions, FetchResult } from "./clients/http";
export { fetchJson, fetchWithRetry } from "./clients/http";

// BME fetchers
export type { BmeScrapingResult } from "./fetchers/bme/listings";
export {
  fetchBmeAlternativesListings,
  fetchBmeContinuoListings,
} from "./fetchers/bme/listings";

// Euronext fetchers
export type { EuronextScrapingResult } from "./fetchers/euronext/listings";
export { fetchEuronextListings } from "./fetchers/euronext/listings";

// Portfolio fetchers
export type { PortfolioScrapingResult } from "./fetchers/portfolio/listings";
export { fetchPortfolioListings } from "./fetchers/portfolio/listings";
