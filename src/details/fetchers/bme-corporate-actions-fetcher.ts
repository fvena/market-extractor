/**
 * Fetcher for market-wide BME Alternatives corporate actions
 * Fetches ALL corporate actions for the entire market at once
 */

import type { BmeCorporateActions } from "../../types/bme.types";
import type { CorporateActionType } from "../parsers/bme-corporate-actions-parser";
import { buildFormData, CookieJar, extractAspxTokens, fetchHtml } from "../../helpers/http";
import { delay } from "../../helpers/browser";
import {
  ACTION_TYPE_CONFIG,
  parseCorporateActionsPage,
} from "../parsers/bme-corporate-actions-parser";
import { formatSpanishDate } from "../../helpers/parsing";

/** All corporate action types to fetch */
const CORPORATE_ACTION_TYPES: CorporateActionType[] = ["Am", "Sp", "Rn", "Dv", "Da", "Ad", "Ex"];

/** Start date for corporate actions history */
const CORPORATE_ACTIONS_START_DATE = "01/01/1980";

/**
 * Fetch ALL corporate actions for the entire market
 */
export async function fetchBmeAlternativesCorporateActions(
  url: string,
): Promise<{ data?: BmeCorporateActions; error?: string }> {
  try {
    const origin = new URL(url).origin;
    const bmeHeaders = {
      Origin: origin,
      Referer: url,
    };

    const cookieJar = new CookieJar();

    // 1. GET initial page for tokens
    const initialResult = await fetchHtml(url, { headers: bmeHeaders }, cookieJar);

    if (initialResult.error || !initialResult.html) {
      return { error: initialResult.error ?? "Empty response" };
    }

    let pageTokens = extractAspxTokens(initialResult.html);

    if (!pageTokens.__VIEWSTATE || !pageTokens.__EVENTVALIDATION) {
      return { error: "Failed to extract ASPX tokens from initial page" };
    }

    const endDate = formatSpanishDate(new Date());

    // Initialize result with empty arrays
    const result: BmeCorporateActions = {
      capitalIncreases: [],
      consolidations: [],
      delistings: [],
      dividends: [],
      listings: [],
      specialPayments: [],
      splits: [],
    };

    // 2. Fetch each action type
    for (const [index, actionType] of CORPORATE_ACTION_TYPES.entries()) {
      const config = ACTION_TYPE_CONFIG[actionType];

      if (index > 0) {
        await delay(800 + Math.random() * 400);
      }

      let pageNumber = 0;
      let currentHtml = "";
      const maxPages = 200;

      do {
        pageNumber++;
        const isFirstPage = pageNumber === 1;

        if (!isFirstPage) {
          await delay(800 + Math.random() * 400);
        }

        const formData: Record<string, string> = {
          __EVENTARGUMENT: "",
          __EVENTTARGET: isFirstPage ? "" : "ctl00$Contenido$Siguiente",
          __EVENTVALIDATION: pageTokens.__EVENTVALIDATION ?? "",
          __VIEWSTATE: pageTokens.__VIEWSTATE ?? "",
          __VIEWSTATEGENERATOR: pageTokens.__VIEWSTATEGENERATOR ?? "",
          ctl00$Contenido$Desde$cFecha: CORPORATE_ACTIONS_START_DATE,
          ctl00$Contenido$Emisora$Resultado: "",
          ctl00$Contenido$Emisora$Texto: "",
          ctl00$Contenido$Hasta$cFecha: endDate,
          ctl00$Contenido$Tipo: actionType,
        };

        if (isFirstPage) {
          formData.ctl00$Contenido$Buscar = " Buscar ";
        }

        const fetchResult = await fetchHtml(
          url,
          {
            body: buildFormData(formData),
            headers: bmeHeaders,
            method: "POST",
          },
          cookieJar,
        );

        if (fetchResult.error || !fetchResult.html) {
          if (isFirstPage) {
            console.warn(`Failed to fetch ${actionType}: ${fetchResult.error ?? "Unknown error"}`);
          }
          break;
        }

        currentHtml = fetchResult.html;

        // Parse and push to the correct array based on action type
        const parsed = parseCorporateActionsPage(currentHtml, actionType);
        // Type assertion needed because TypeScript can't narrow the generic in loop iteration
        (result[config.key] as unknown[]).push(...parsed);

        // Update tokens
        const newTokens = extractAspxTokens(currentHtml);
        if (newTokens.__VIEWSTATE && newTokens.__EVENTVALIDATION) {
          pageTokens = newTokens;
        } else {
          break;
        }
      } while (hasNextPage(currentHtml) && pageNumber < maxPages);
    }

    return { data: result };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check if there's a next page available
 * BME uses WebForm_DoPostBackWithOptions for active links, void(0) for disabled
 */
function hasNextPage(html: string): boolean {
  // Find the specific "Siguiente" link and extract its href
  const siguienteMatch = /<a[^>]*id="Contenido_Siguiente"[^>]*href="([^"]*)"[^>]*>/i.exec(html);

  if (!siguienteMatch) {
    return false; // No "Siguiente" link found
  }

  const href = siguienteMatch[1];

  // Active:   href contains WebForm_DoPostBackWithOptions
  // Disabled: href contains void(0)
  return (href?.includes("WebForm_DoPostBackWithOptions") && !href.includes("void(0)")) ?? false;
}
