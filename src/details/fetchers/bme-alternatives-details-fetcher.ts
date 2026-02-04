/**
 * Fetcher for BME Alternatives (Growth/ScaleUp) product details
 * Orchestrates fetching from multiple pages per product
 */

import type { BmeDailyPrice, BmePriceHistory } from "../../types/bme.types";
import type {
  BmeAlternativesDetails,
  BmeAlternativesListing,
  ProductResult,
} from "../../types/types";
import {
  buildFormData,
  CookieJar,
  extractAspxTokens,
  fetchHtmlWithRetry,
} from "../../helpers/http";
import { delay } from "../../helpers/browser";
import { parseProductDetailsPage } from "../parsers/bme-details-parser";
import {
  deduplicatePrices,
  parsePriceHistoryPage,
  sortPricesByDate,
} from "../parsers/bme-price-history-parser";
import { daysAgo, formatSpanishDate } from "../../helpers/parsing";
import { getMissingRequiredFields } from "../../helpers/missing-fields";

/**
 * Fetch and parse the product page with retry logic for server errors
 */
async function fetchProductPage(
  url: string,
): Promise<{ data?: ReturnType<typeof parseProductDetailsPage>; error?: string }> {
  const result = await fetchHtmlWithRetry(url);

  if (result.error || !result.html) {
    return { error: result.error ?? "Empty response" };
  }

  // Extract base URL for resolving relative links
  const baseUrl = new URL(url).origin;
  const data = parseProductDetailsPage(result.html, baseUrl);
  return { data };
}

/**
 * Fetch price history with pagination
 */
async function fetchPriceHistory(
  url: string,
  refererUrl: string,
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
    const initialResult = await fetchHtmlWithRetry(url, { headers: bmeHeaders }, cookieJar);

    if (initialResult.error || !initialResult.html) {
      return { error: `Failed to fetch initial page: ${initialResult.error ?? "Empty response"}` };
    }

    const tokens = extractAspxTokens(initialResult.html);

    // Validate we got the required tokens
    if (!tokens.__VIEWSTATE || !tokens.__EVENTVALIDATION) {
      return { error: `Failed to extract tokens on page 1, stopping pagination` };
    }

    // Prepare date range (last 365 days)
    const endDate = new Date();
    const startDate = daysAgo(365);

    // 2. Build form data for POST - CORRECTED
    const formData: Record<string, string> = {
      __EVENTARGUMENT: "",
      __EVENTTARGET: "", // ← Empty, as in the original
      __EVENTVALIDATION: tokens.__EVENTVALIDATION,
      __VIEWSTATE: tokens.__VIEWSTATE,
      __VIEWSTATEGENERATOR: tokens.__VIEWSTATEGENERATOR ?? "",
      ctl00$Contenido$Buscar: " Buscar ", // ← Include the button with its value
      ctl00$Contenido$Desde$cFecha: formatSpanishDate(startDate),
      ctl00$Contenido$Hasta$cFecha: formatSpanishDate(endDate),
    };

    // Add delay before POST
    await delay(500);

    // 3. POST to get first page of results
    const firstPageResult = await fetchHtmlWithRetry(
      url,
      {
        body: buildFormData(formData),
        headers: bmeHeaders,
        method: "POST",
      },
      cookieJar,
    );

    if (firstPageResult.error || !firstPageResult.html) {
      return { error: `Failed to fetch page 1: ${firstPageResult.error ?? "Empty response"}` };
    }

    const allPrices: BmeDailyPrice[] = [];
    let totalMarketDays = 0;
    let pageNumber = 1;

    // Parse first page
    let currentHtml = firstPageResult.html;
    let pageResult = parsePriceHistoryPage(currentHtml);
    allPrices.push(...pageResult.prices);
    totalMarketDays += pageResult.totalRows;

    // 4. Paginate if needed
    while (pageResult.hasNextPage && pageNumber < 50) {
      // Safety limit
      pageNumber++;

      // Add delay between pages (important!)
      await delay(800 + Math.random() * 400); // 800-1200ms random delay

      // Get fresh tokens from current page
      const pageTokens = extractAspxTokens(currentHtml);

      if (!pageTokens.__VIEWSTATE || !pageTokens.__EVENTVALIDATION) {
        return {
          error: `Failed to extract tokens on page ${String(pageNumber)}, stopping pagination`,
        };
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

      const nextPageResult = await fetchHtmlWithRetry(
        url,
        {
          body: buildFormData(paginationData),
          headers: bmeHeaders,
          method: "POST",
        },
        cookieJar,
      );

      if (nextPageResult.error || !nextPageResult.html) {
        return {
          error: `Failed to fetch page ${String(pageNumber)}: ${nextPageResult.error ?? "Unknown error"}`,
        };
      }

      // Parse the next page
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
 * Fetch complete details for a BME Alternatives product
 */
export async function fetchBmeAlternativesDetails(
  listing: BmeAlternativesListing,
  requiredFields: readonly string[],
): Promise<ProductResult<BmeAlternativesDetails>> {
  const errors: string[] = [];

  try {
    // Phase 1: Fetch product page
    const productPageResult = await fetchProductPage(listing.url);

    if (productPageResult.error || !productPageResult.data) {
      errors.push(`Product page: ${productPageResult.error ?? "No data returned"}`);
    }

    // Phase 2: Fetch price history
    const priceHistoryUrl = listing.url.replace("/Ficha/", "/InfHistorica/");
    const priceHistoryResult = await fetchPriceHistory(priceHistoryUrl, listing.url);

    if (priceHistoryResult.error || !priceHistoryResult.data) {
      errors.push(`Price history: ${priceHistoryResult.error ?? "No data returned"}`);
    }

    // If there are errors, return an error result
    if (errors.length > 0) {
      return {
        error: errors.join(", "),
      };
    }

    /* eslint-disable @typescript-eslint/no-non-null-assertion -- we know that the fields are not undefined */
    const productData = productPageResult.data!;
    const priceHistory = priceHistoryResult.data!;
    /* eslint-enable @typescript-eslint/no-non-null-assertion */

    // Build the complete details object
    const details: BmeAlternativesDetails = {
      address: productData.address,
      auditor: productData.auditor,
      contact: productData.contact,
      documents: productData.documents,
      fetchedAt: new Date().toISOString(),
      isin: productData.isin ?? "",
      lastPrice: productData.lastPrice ?? 0,
      liquidityProvider: productData.liquidityProvider,
      marketCap: productData.marketCap ?? 0,
      name: listing.name,
      nif: productData.nif,
      nominal: productData.nominal,
      priceHistory,
      registeredAdvisor: productData.registeredAdvisor,
      sector: listing.sector,
      sharesOutstanding: productData.sharesOutstanding ?? 0,
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

    return {
      data: details,
      missingFields: getMissingRequiredFields(details, requiredFields),
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
