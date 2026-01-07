/**
 * Fetcher for BME Alternatives (Growth/ScaleUp) product details
 * Orchestrates fetching from multiple pages per product
 */

import type {
  BmeAlternativesDetails,
  BmeAlternativesListingItem,
  BmeDailyPrice,
  BmePriceHistory,
  DetailProgressCallback,
} from "../../../markets/bme/types";
import { buildFormData, CookieJar, extractAspxTokens, fetchHtml } from "../../clients/http";
import { delay } from "../../clients/browser";
import { parseProductDetailsPage } from "../../parsers/bme/details";
import {
  deduplicatePrices,
  parsePriceHistoryPage,
  sortPricesByDate,
} from "../../parsers/bme/price-history";
import { daysAgo, formatSpanishDate } from "../../../helpers/parsing";
import { BME_ALTERNATIVES_REQUIRED_FIELDS } from "../../../markets/bme/types";

/**
 * Result of fetching details for a single product
 */
export interface BmeAlternativesDetailResult {
  data?: BmeAlternativesDetails;
  error?: string;
  /** Errors encountered while fetching price history or corporate actions */
  fetchErrors?: string[];
  missingFields?: string[];
  success: boolean;
}

/**
 * Fetch complete details for a BME Alternatives product
 */
export async function fetchBmeAlternativesDetails(
  listing: BmeAlternativesListingItem,
  onProgress?: DetailProgressCallback,
): Promise<BmeAlternativesDetailResult> {
  const errors: string[] = [];

  try {
    // Phase 1: Fetch product page
    onProgress?.("Fetching product page...");

    const productPageResult = await fetchProductPage(listing.url);

    if (productPageResult.error || !productPageResult.data) {
      return {
        error: productPageResult.error ?? "No data returned",
        success: false,
      };
    }

    const productData = productPageResult.data;
    errors.push(...productData.errors);

    // Phase 2: Fetch price history
    onProgress?.("Fetching price history...");

    const priceHistoryUrl = listing.url.replace("/Ficha/", "/InfHistorica/");
    const priceHistoryResult = await fetchPriceHistory(priceHistoryUrl, listing.url, onProgress);

    if (priceHistoryResult.error) {
      errors.push(`Price history: ${priceHistoryResult.error}`);
    }

    // Build the complete details object
    const details: BmeAlternativesDetails = {
      // From product page
      address: productData.address,
      auditor: productData.auditor,

      contact: productData.contact,
      // Yearly history and documents
      documents: productData.documents,
      // Metadata
      errors: errors.length > 0 ? errors : undefined,
      fetchedAt: new Date().toISOString(),
      isin: productData.isin ?? "",
      lastPrice: productData.lastPrice ?? 0,
      liquidityProvider: productData.liquidityProvider,
      marketCap: productData.marketCap ?? 0,
      // From listing
      name: listing.name,
      nif: productData.nif,
      nominal: productData.nominal,
      // Price history
      priceHistory: priceHistoryResult.data ?? {
        marketDays: 0,
        periodEnd: formatSpanishDate(new Date()),
        periodStart: formatSpanishDate(daysAgo(365)),
        prices: [],
      },
      registeredAdvisor: productData.registeredAdvisor,
      sector: listing.sector,

      sharesOutstanding: productData.sharesOutstanding ?? 0,
      status: "success",

      suspendedDate: productData.suspendedDate,

      ticker: productData.ticker ?? "",

      tradingType: productData.tradingType,
      url: listing.url,
      website: productData.website,
      yearlyHistory: productData.yearlyHistory,
    };

    // Calculate marketCap if not present but we have price and shares
    if (details.marketCap === 0 && details.lastPrice > 0 && details.sharesOutstanding > 0) {
      details.marketCap = details.lastPrice * details.sharesOutstanding;
    }

    // Determine status based on missing required fields
    const missingFields = getMissingRequiredFields(details);

    if (missingFields.length > 0) {
      if (missingFields.some((field) => ["isin", "ticker"].includes(field))) {
        details.status = "error";
        return {
          data: details,
          error: `Missing critical fields: ${missingFields.join(", ")}`,
          missingFields,
          success: false,
        };
      }
      details.status = "warning";
    }

    return {
      data: details,
      fetchErrors: errors.length > 0 ? errors : undefined,
      missingFields: missingFields.length > 0 ? missingFields : undefined,
      success: true,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error",
      success: false,
    };
  }
}

/** Max retries for server errors */
const MAX_RETRIES = 3;

/** Delay between retries in ms */
const RETRY_DELAY = 2000;

/**
 * Fetch and parse the product page with retry logic for server errors
 */
async function fetchProductPage(
  url: string,
): Promise<{ data?: ReturnType<typeof parseProductDetailsPage>; error?: string }> {
  let lastError = "";

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const result = await fetchHtml(url);

    // If server error (5xx), retry with delay
    if (result.status >= 500 && result.status < 600 && attempt < MAX_RETRIES - 1) {
      lastError = result.error ?? `HTTP ${String(result.status)}`;
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY * (attempt + 1)));
      continue;
    }

    if (result.error || !result.html) {
      return { error: result.error ?? "Empty response" };
    }

    // Check for BME error page (returns "No disponible" when server blocks requests)
    if (
      result.html.includes("No disponible") &&
      result.html.includes("La consulta no está disponible")
    ) {
      // Retry if we haven't exhausted attempts
      if (attempt < MAX_RETRIES - 1) {
        lastError = "Page temporarily unavailable";
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY * (attempt + 1)));
        continue;
      }
      return { error: "Page temporarily unavailable (server returned error page)" };
    }

    // Extract base URL for resolving relative links
    const baseUrl = new URL(url).origin;
    const data = parseProductDetailsPage(result.html, baseUrl);
    return { data };
  }

  return { error: lastError || "Max retries exceeded" };
}

/**
 * Fetch price history with pagination
 */
async function fetchPriceHistory(
  url: string,
  refererUrl: string,
  onProgress?: DetailProgressCallback,
): Promise<{ data?: BmePriceHistory; error?: string }> {
  try {
    // Extract origin from URL for headers
    const origin = new URL(url).origin;

    // Common headers for BME requests
    const bmeHeaders = {
      Origin: origin,
      Referer: refererUrl,
    };

    // Create cookie jar to maintain session
    const cookieJar = new CookieJar();

    // 1. GET initial page to get tokens and establish session
    const initialResult = await fetchHtml(url, { headers: bmeHeaders }, cookieJar);

    if (initialResult.error || !initialResult.html) {
      return { error: initialResult.error ?? "Empty response" };
    }

    const tokens = extractAspxTokens(initialResult.html);

    // Validate we got the required tokens
    if (!tokens.__VIEWSTATE || !tokens.__EVENTVALIDATION) {
      return { error: "Failed to extract ASPX tokens from initial page" };
    }

    // Prepare date range (last 365 days)
    const endDate = new Date();
    const startDate = daysAgo(365);

    // 2. Build form data for POST - CORRECTED
    const formData: Record<string, string> = {
      __EVENTARGUMENT: "",
      __EVENTTARGET: "", // ← VACÍO, como en el original
      __EVENTVALIDATION: tokens.__EVENTVALIDATION,
      __VIEWSTATE: tokens.__VIEWSTATE,
      __VIEWSTATEGENERATOR: tokens.__VIEWSTATEGENERATOR ?? "",
      ctl00$Contenido$Buscar: " Buscar ", // ← INCLUIR EL BOTÓN CON SU VALOR
      ctl00$Contenido$Desde$cFecha: formatSpanishDate(startDate),
      ctl00$Contenido$Hasta$cFecha: formatSpanishDate(endDate),
    };

    // Add delay before POST
    await delay(500);

    // 3. POST to get first page of results
    const firstPageResult = await fetchHtml(
      url,
      {
        body: buildFormData(formData),
        headers: bmeHeaders,
        method: "POST",
      },
      cookieJar,
    );

    if (firstPageResult.error || !firstPageResult.html) {
      return { error: firstPageResult.error ?? "Empty response" };
    }

    const allPrices: BmeDailyPrice[] = [];
    let totalMarketDays = 0;
    let currentHtml = firstPageResult.html;
    let pageNumber = 1;

    // Parse first page
    let pageResult = parsePriceHistoryPage(currentHtml);
    allPrices.push(...pageResult.prices);
    totalMarketDays += pageResult.totalRows;

    // 4. Paginate if needed
    while (pageResult.hasNextPage && pageNumber < 50) {
      // Safety limit
      pageNumber++;
      onProgress?.("Fetching price history", `page ${String(pageNumber)}`);

      // Add delay between pages (important!)
      await delay(800 + Math.random() * 400); // 800-1200ms random delay

      // Get fresh tokens from current page
      const pageTokens = extractAspxTokens(currentHtml);

      if (!pageTokens.__VIEWSTATE || !pageTokens.__EVENTVALIDATION) {
        console.warn(`Failed to extract tokens on page ${String(pageNumber)}, stopping pagination`);
        break;
      }

      // Build pagination request - Check the actual button name!
      // It might be "ctl00$Contenido$Siguiente" or similar
      const paginationData: Record<string, string> = {
        __EVENTARGUMENT: "",
        __EVENTTARGET: "ctl00$Contenido$Siguiente", // For LinkButton pagination
        __EVENTVALIDATION: pageTokens.__EVENTVALIDATION,
        __VIEWSTATE: pageTokens.__VIEWSTATE,
        __VIEWSTATEGENERATOR: pageTokens.__VIEWSTATEGENERATOR ?? "",
        // Keep the date fields in case the server needs them
        ctl00$Contenido$Desde$cFecha: formatSpanishDate(startDate),
        ctl00$Contenido$Hasta$cFecha: formatSpanishDate(endDate),
      };

      const nextPageResult = await fetchHtml(
        url,
        {
          body: buildFormData(paginationData),
          headers: bmeHeaders,
          method: "POST",
        },
        cookieJar,
      );

      if (nextPageResult.error || !nextPageResult.html) {
        console.warn(
          `Failed to fetch page ${String(pageNumber)}: ${nextPageResult.error ?? "Unknown error"}`,
        );
        break;
      }

      // Check if we got a valid response (not an error page)
      if (nextPageResult.html.includes("error") || nextPageResult.html.length < 1000) {
        console.warn(`Possible error response on page ${String(pageNumber)}`);
        break;
      }

      currentHtml = nextPageResult.html;
      pageResult = parsePriceHistoryPage(currentHtml);
      allPrices.push(...pageResult.prices);
      totalMarketDays += pageResult.totalRows;
    }

    // Deduplicate and sort
    const uniquePrices = deduplicatePrices(allPrices);
    const sortedPrices = sortPricesByDate(uniquePrices, false);

    return {
      data: {
        marketDays: totalMarketDays,
        periodEnd: formatSpanishDate(endDate),
        periodStart: formatSpanishDate(startDate),
        prices: sortedPrices,
      },
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get list of missing required fields
 */
function getMissingRequiredFields(details: BmeAlternativesDetails): string[] {
  const missing: string[] = [];

  for (const field of BME_ALTERNATIVES_REQUIRED_FIELDS) {
    const value = details[field as keyof BmeAlternativesDetails];

    // Check if value is empty/missing
    const isEmpty = value === undefined || value === "" || value === 0;
    if (isEmpty) {
      // Allow 0 for lastPrice if suspended
      if (field === "lastPrice" && details.suspendedDate) {
        continue;
      }
      // Allow 0 for marketCap if suspended or no price
      if (field === "marketCap" && (details.suspendedDate || details.lastPrice === 0)) {
        continue;
      }
      missing.push(field);
    }
  }

  return missing;
}

/**
 * Fetch details for multiple products
 */
export async function fetchBmeAlternativesDetailsBatch(
  listings: BmeAlternativesListingItem[],
  onProgress?: (current: number, total: number, name: string, phase: string) => void,
): Promise<BmeAlternativesDetailResult[]> {
  const results: BmeAlternativesDetailResult[] = [];

  for (let index = 0; index < listings.length; index++) {
    const listing = listings[index];
    if (!listing) continue;

    // Create a progress callback that includes the product context
    const productProgress: DetailProgressCallback = (phase, detail) => {
      const fullPhase = detail ? `${phase} (${detail})` : phase;
      onProgress?.(index + 1, listings.length, listing.name, fullPhase);
    };

    const result = await fetchBmeAlternativesDetails(listing, productProgress);
    results.push(result);
  }

  return results;
}
