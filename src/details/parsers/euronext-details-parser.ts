/**
 * Parsers for Euronext product detail endpoints
 * Each function parses HTML from a specific AJAX endpoint
 */

import type {
  EuronextAddress,
  EuronextContact,
  EuronextDailyPrice,
  EuronextIcbClassification,
  EuronextIpoEntry,
  EuronextNotice,
  EuronextPriceHistory,
  EuronextRelatedInstrument,
  EuronextTradingInfo,
} from "../../types/euronext.types";
import { JSDOM } from "jsdom";
import { cleanText } from "../../helpers/html";

/**
 * Parse a number from Euronext format (e.g., "1,234,567.89")
 */
function parseEuronextNumber(text: string): number | undefined {
  if (!text) return undefined;

  // Clean the text - remove currency symbols and extra spaces
  const cleaned = text
    .replaceAll(/[€$£\s]/g, "")
    .replaceAll(",", "")
    .replaceAll(" ", "")
    .trim();

  const value = Number.parseFloat(cleaned);
  return Number.isNaN(value) ? undefined : value;
}

/**
 * Parse date from Euronext format (DD/MM/YYYY or YYYY-MM-DD)
 */
function parseEuronextDate(text: string): string | undefined {
  if (!text) return undefined;

  const cleaned = cleanText(text);

  // Try DD/MM/YYYY format
  const ddmmyyyy = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(cleaned);
  if (ddmmyyyy?.[1] && ddmmyyyy[2] && ddmmyyyy[3]) {
    const day = ddmmyyyy[1].padStart(2, "0");
    const month = ddmmyyyy[2].padStart(2, "0");
    const year = ddmmyyyy[3];
    return `${year}-${month}-${day}`;
  }

  // Try YYYY-MM-DD format (already ISO)
  const iso = /(\d{4})-(\d{2})-(\d{2})/.exec(cleaned);
  if (iso?.[1] && iso[2] && iso[3]) {
    return `${iso[1]}-${iso[2]}-${iso[3]}`;
  }

  // Try DD MMM YYYY or DD Month YYYY format
  const months: Record<string, string> = {
    apr: "04",
    aug: "08",
    dec: "12",
    feb: "02",
    jan: "01",
    jul: "07",
    jun: "06",
    mar: "03",
    may: "05",
    nov: "11",
    oct: "10",
    sep: "09",
  };

  const monthMatch = /(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})/.exec(cleaned);
  if (monthMatch?.[1] && monthMatch[2] && monthMatch[3]) {
    const day = monthMatch[1].padStart(2, "0");
    const monthString = monthMatch[2].toLowerCase().slice(0, 3);
    const month = months[monthString];
    const year = monthMatch[3];
    if (month) {
      return `${year}-${month}-${day}`;
    }
  }

  return undefined;
}

/**
 * Parse trading info from fs_tradinginfo_block
 * Extracts: Admitted shares, trading type, trading currency, nominal value
 */
export function parseTradingInfoBlock(html: string): EuronextTradingInfo {
  const result: EuronextTradingInfo = {};

  if (!html) return result;

  const dom = new JSDOM(html);
  const document_ = dom.window.document;

  // Look for table rows with label-value pairs
  const rows = document_.querySelectorAll("tr");

  for (const row of rows) {
    const cells = row.querySelectorAll("td");
    if (cells.length < 2) continue;

    const label = cleanText(cells[0]?.textContent).toLowerCase();
    const value = cleanText(cells[1]?.textContent);

    if (label.includes("admitted shares")) {
      result.admittedShares = parseEuronextNumber(value);
    } else if (label.includes("trading type")) {
      result.tradingType = value || undefined;
    } else if (label.includes("trading currency")) {
      result.tradingCurrency = value || undefined;
    } else if (label.includes("nominal value")) {
      result.nominalValue = parseEuronextNumber(value);
    }
  }

  return result;
}

/**
 * Parse IPO date from fs_tradinginfo_pea_block
 */
export function parseIpoDateBlock(html: string): string | undefined {
  if (!html) return undefined;

  const dom = new JSDOM(html);
  const document_ = dom.window.document;

  // Look for "IPO date" in various formats
  const text = document_.body.textContent || "";

  // Try to find date after "IPO date" text
  const ipoMatch =
    /IPO\s+date[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{4}|\d{4}[/-]\d{1,2}[/-]\d{1,2}|\d{1,2}\s+[A-Za-z]+\s+\d{4})/i.exec(
      text,
    );
  if (ipoMatch?.[1]) {
    return parseEuronextDate(ipoMatch[1]);
  }

  return undefined;
}

/**
 * Parse ICB classification from fs_icb_block
 * Extracts: SuperSector, Sector, Subsector
 */
export function parseIcbBlock(html: string): EuronextIcbClassification {
  const result: EuronextIcbClassification = {};

  if (!html) return result;

  const dom = new JSDOM(html);
  const document_ = dom.window.document;

  // Try table format
  const rows = document_.querySelectorAll("tr");
  for (const row of rows) {
    const cells = row.querySelectorAll("td");
    if (cells.length < 2) continue;

    const label = cleanText(cells[0]?.textContent).toLowerCase();
    const value = cleanText(cells[1]?.textContent);

    if (label.includes("supersector")) {
      result.supersector = value.split(",")[1]?.trim();
    } else if (label.includes("subsector")) {
      result.subsector = value.split(",")[1]?.trim();
    } else if (label.includes("sector")) {
      result.sector = value.split(",")[1]?.trim();
    }
  }

  return result;
}

/**
 * Parse address from cofisem-public-address endpoint
 */
export function parseAddressBlock(html: string): EuronextAddress {
  const result: EuronextAddress = {};

  if (!html) return result;

  const dom = new JSDOM(html);
  const document_ = dom.window.document;

  const addressElement =
    document_.querySelector("address") ?? document_.querySelector(".address") ?? document_.body;

  // Extract website (http link that's not tel: or mailto:)
  const websiteLink = addressElement.querySelector(
    'a[href^="http"]:not([href*="tel"]):not([href*="mailto"])',
  );
  if (websiteLink) {
    result.website = websiteLink.getAttribute("href") ?? undefined;
  }

  // Get all field-wrapper divs, excluding those with special content
  const fieldWrappers = addressElement.querySelectorAll(".field-wrapper");

  const addressParts: string[] = [];
  let country: string | undefined;

  for (const wrapper of fieldWrappers) {
    // Skip if contains h3 (company name), phone link, or http link
    if (
      wrapper.querySelector("h3") ||
      wrapper.querySelector('a[href^="tel"]') ||
      wrapper.querySelector('a[href^="http"]')
    ) {
      continue;
    }

    const text = cleanText(wrapper.textContent);
    if (!text) continue;

    // Skip if it's a label like "Phone number:"
    if (text.includes(":")) continue;

    // Heuristic: if it looks like just a country name (no digits, short-ish)
    // and we already have address parts, treat it as country
    const looksLikeCountry = !/\d/.test(text) && text.split(/\s+/).length <= 3;

    if (looksLikeCountry && addressParts.length > 0) {
      country = text;
    } else {
      addressParts.push(text);
    }
  }

  if (addressParts.length > 0) {
    result.address = addressParts.join(", ");
  }

  if (country) {
    result.country = country;
  }

  return result;
}

/**
 * Parse contact from cofisem-public-contact endpoint
 */
export function parseContactBlock(html: string): EuronextContact {
  const result: EuronextContact = {};

  if (!html) return result;

  const dom = new JSDOM(html);
  const document_ = dom.window.document;

  // Look for email links
  const emailLink = document_.querySelector('a[href^="mailto:"]');
  if (emailLink) {
    const href = emailLink.getAttribute("href");
    if (href) {
      result.email = href.replace("mailto:", "").split("?")[0];
    }
  }

  // Look for phone links
  const phoneLink = document_.querySelector('a[href^="tel:"]');
  if (phoneLink) {
    const href = phoneLink.getAttribute("href");
    if (href) {
      result.phone = href.replace("tel:", "");
    }
  }

  // Also try to extract from text patterns
  const text = document_.body.textContent || "";

  if (!result.email) {
    const emailMatch = /[\w.-]+@[\w.-]+\.\w+/.exec(text);
    if (emailMatch?.[0]) {
      result.email = emailMatch[0];
    }
  }

  return result;
}

/**
 * Parse price history from getHistoricalPricePopup endpoint
 * This is the HTML table response from the POST endpoint
 *
 * Columns: date (1st), volume (7th - Number of shares), closePrice (6th)
 * turnover = closePrice * volume
 */
export function parsePriceHistoryTable(html: string): EuronextDailyPrice[] {
  const prices: EuronextDailyPrice[] = [];

  if (!html) return prices;

  const dom = new JSDOM(html);
  const document_ = dom.window.document;

  // Find the data table
  const table = document_.querySelector("table");
  if (!table) return prices;

  const rows = table.querySelectorAll("tbody tr");

  for (const row of rows) {
    const cells = row.querySelectorAll("td");
    if (cells.length < 7) continue;

    // Column indices (0-based):
    // 0: Date, 5: Close Price, 6: Number of shares (volume), 7: Turnover
    const dateText = cleanText(cells[0]?.textContent);
    const closePriceText = cleanText(cells[5]?.textContent);
    const turnoverText = cleanText(cells[7]?.textContent);
    const volumeText = cleanText(cells[6]?.textContent);

    const date = parseEuronextDate(dateText);
    const closePrice = parseEuronextNumber(closePriceText);
    const turnover = parseEuronextNumber(turnoverText);
    const volume = parseEuronextNumber(volumeText);

    if (date && closePrice !== undefined && turnover !== undefined) {
      const actualVolume = volume ?? 0;
      prices.push({
        closePrice,
        date,
        turnover: turnover,
        volume: actualVolume,
      });
    }
  }

  return prices;
}

/**
 * Build price history object from parsed prices
 */
export function buildPriceHistory(prices: EuronextDailyPrice[]): EuronextPriceHistory {
  if (prices.length === 0) {
    const today = new Date().toISOString().split("T")[0] ?? "";
    const yearAgo =
      new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] ?? "";
    return {
      periodEnd: today,
      periodStart: yearAgo,
      prices: [],
      tradingDays: 0,
    };
  }

  // Sort by date descending
  const sorted = [...prices].sort((a, b) => b.date.localeCompare(a.date));

  return {
    periodEnd: sorted[0]?.date ?? "",
    periodStart: sorted.at(-1)?.date ?? "",
    prices: sorted,
    tradingDays: sorted.length,
  };
}

/**
 * Parse notices from getNoticePublicData endpoint
 */
export function parseNoticesData(html: string): { notices: EuronextNotice[]; total: number } {
  if (!html) return { notices: [], total: 0 };

  const dom = new JSDOM(html);
  const document_ = dom.window.document;
  const notices: EuronextNotice[] = [];

  // Extract total count from "Showing X-Y of Z" text
  const showingText = document_.querySelector(".icons__column p span")?.textContent ?? "";
  const totalMatch = /of\s+(\d+)/.exec(showingText);
  const total = totalMatch?.[1] ? Number.parseInt(totalMatch[1], 10) : 0;

  // Notices are typically in a table or list format
  const tbodies = document_.querySelectorAll("tbody[id^='row_ecap_']");

  for (const tbody of tbodies) {
    const mainRow = tbody.querySelector("tr");
    if (!mainRow) continue;

    const noticeNumber = cleanText(mainRow.querySelector("td.noticenumber")?.textContent ?? "");
    // const issuedDate = cleanText(mainRow.querySelector("td.noticedate")?.textContent ?? "");
    const effectiveDate = cleanText(mainRow.querySelector("td.effect")?.textContent ?? "");
    const eventType = cleanText(mainRow.querySelector("td.noticename")?.textContent ?? "");
    // const symbol = cleanText(mainRow.querySelector("td.instruments")?.textContent ?? "");
    const pdfLink = tbody.querySelector<HTMLAnchorElement>('a[href*="notice-download"]')?.href;

    if (noticeNumber && eventType) {
      notices.push({
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- effectiveDate is guaranteed to be a valid date
        date: parseEuronextDate(effectiveDate)!,
        noticeNumber,
        title: eventType,
        url: pdfLink,
      });
    }
  }

  return { notices, total };
}

/**
 * Parse market migrations from ipo-new-issue/showcase endpoint
 */
export function parseIpoShowcase(html: string): EuronextIpoEntry[] {
  if (!html) return [];

  const dom = new JSDOM(html);
  const document_ = dom.window.document;

  const entries: EuronextIpoEntry[] = [];

  // ==========================================================================
  // 1. Latest IPO (nav-tab1)
  // ==========================================================================
  const latestPane = document_.querySelector("#nav-tab1 > .row");
  if (latestPane) {
    const entry = extractIpoEntry(latestPane);
    if (entry) entries.push(entry);
  }

  // ==========================================================================
  // 2. Past IPOs (nav-tab2 collapsed panels)
  // ==========================================================================
  const pastPanels = document_.querySelectorAll("#nav-tab2 .panels--collapse");
  for (const panel of pastPanels) {
    const collapseContent = panel.querySelector("[id^='collapsePanelCompactGroupcollapseitem--']");
    if (collapseContent) {
      const entry = extractIpoEntry(collapseContent);
      if (entry) entries.push(entry);
    }
  }

  // Sort by IPO date (oldest first)
  entries.sort((a, b) => {
    if (!a.ipoDate) return 1;
    if (!b.ipoDate) return -1;
    return a.ipoDate.localeCompare(b.ipoDate);
  });

  return entries;
}

/**
 * Extract IPO entry from a pane/panel element
 */
function extractIpoEntry(container: Element): EuronextIpoEntry | undefined {
  const entry: EuronextIpoEntry = {
    ipoTypes: [],
  };

  // ==========================================================================
  // Identification section
  // ==========================================================================
  entry.exchangeMarket = getFieldValue(container, "field--name-field-exchange__market");
  entry.marketOrganization = getFieldValue(container, "field--name-field-market-organization");
  entry.tradingLocation = getFieldValue(container, "field--name-field-trading-location");

  // ==========================================================================
  // Operation section
  // ==========================================================================
  entry.ipoDate = getFieldValue(container, "field--name-field-iponi-ipo-date");
  entry.transferDetails = getFieldValue(container, "field--name-field-iponi-transfer");

  // IPO type can have multiple values
  const ipoTypeField = container.querySelector(".field--name-field-issue-type");
  if (ipoTypeField) {
    const items = ipoTypeField.querySelectorAll(".field__item");
    for (const item of items) {
      const value = cleanText(item.textContent);
      if (value) entry.ipoTypes.push(value);
    }
  }

  // Only return if we have at least some data
  if (entry.ipoDate || entry.exchangeMarket || entry.ipoTypes.length > 0) {
    return entry;
  }

  return undefined;
}

/**
 * Get single field value by class name
 */
function getFieldValue(container: Element, fieldClass: string): string | undefined {
  const field = container.querySelector(`.${fieldClass}`);
  if (!field) return undefined;

  const item = field.querySelector(".field__item");
  const value = cleanText(item?.textContent);

  return value || undefined;
}

/**
 * Deduplicate prices by date (keep first occurrence)
 */
export function deduplicatePrices(prices: EuronextDailyPrice[]): EuronextDailyPrice[] {
  const seen = new Set<string>();
  return prices.filter((price) => {
    if (seen.has(price.date)) return false;
    seen.add(price.date);
    return true;
  });
}

/**
 * Sort prices by date
 */
export function sortPricesByDate(
  prices: EuronextDailyPrice[],
  ascending = true,
): EuronextDailyPrice[] {
  return [...prices].sort((a, b) => {
    const cmp = a.date.localeCompare(b.date);
    return ascending ? cmp : -cmp;
  });
}

/**
 * Parse related instruments from related-instruments-off-canvas-content endpoint
 * Extracts: Symbol, Name, Isin, Instrument Type, Mic
 *
 * Table columns:
 * 0: Symbol (with link)
 * 1: Name (with link)
 * 2: Isin
 * 3: Instrument Type
 * 4: Mic
 */
export function parseRelatedInstruments(html: string): EuronextRelatedInstrument[] {
  const instruments: EuronextRelatedInstrument[] = [];

  if (!html) return instruments;

  const dom = new JSDOM(html);
  const document_ = dom.window.document;

  // Find the table
  const table = document_.querySelector("#ewl-related-instruments-off-canvas-table");
  if (!table) return instruments;

  const rows = table.querySelectorAll("tbody tr");

  for (const row of rows) {
    const cells = row.querySelectorAll("td");
    if (cells.length < 5) continue;

    // Extract symbol and URL from first column
    const symbolLink = cells[0]?.querySelector("a");
    const symbol = cleanText(symbolLink?.textContent);
    const url = symbolLink?.getAttribute("href") ?? "";

    // Extract name from second column
    const name = cleanText(cells[1]?.querySelector("a")?.textContent ?? cells[1]?.textContent);

    // Extract other fields
    const isin = cleanText(cells[2]?.textContent);
    const instrumentType = cleanText(cells[3]?.textContent);
    const mic = cleanText(cells[4]?.textContent);

    if (isin && instrumentType && mic) {
      instruments.push({
        instrumentType,
        isin,
        mic,
        name: name || symbol || "",
        symbol: symbol || "",
        url,
      });
    }
  }

  return instruments;
}
