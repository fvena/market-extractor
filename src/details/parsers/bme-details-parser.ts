/**
 * Parser for BME Alternatives (Growth/ScaleUp) product detail pages
 */

import type { BmeDocument, BmeYearlyData } from "../../types/bme.types";
import { JSDOM } from "jsdom";
import {
  cleanText,
  parseSpanishDate,
  parseSpanishNumber,
  parseSuspendedDate,
  parseValueOrUndefined,
} from "../../helpers/parsing";

export interface ParsedProductDetails {
  address?: string;
  auditor?: string;
  contact?: string;
  documents: BmeDocument[];
  errors: string[];
  isin?: string;
  lastPrice?: number;
  liquidityProvider?: string;
  marketCap?: number;
  nif?: string;
  nominal?: number;
  registeredAdvisor?: string;
  sharesOutstanding?: number;
  suspendedDate?: string;
  ticker?: string;
  tradingType?: string;
  website?: string;
  yearlyHistory: BmeYearlyData[];
}

/**
 * Parse the product details page HTML
 */
export function parseProductDetailsPage(html: string, baseUrl: string): ParsedProductDetails {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const errors: string[] = [];

  // Parse header section for price and suspension status
  const { lastPrice, suspendedDate } = parseHeaderSection(document, errors);

  // Parse valor section for main product details
  const valorData = parseValorSection(document, errors);

  // Parse website link
  const website = parseWebsiteLink(document);

  // Parse yearly history table
  const yearlyHistory = parseYearlyHistoryTable(document, errors);

  // Parse documents from documentation and notices sections
  const documents = parseDocumentsSections(document, baseUrl);

  return {
    ...valorData,
    documents,
    errors,
    lastPrice,
    suspendedDate,
    website,
    yearlyHistory,
  };
}

/**
 * Parse header section (#Contenido_fCab) for price and suspension info
 */
function parseHeaderSection(
  document: Document,
  errors: string[],
): { lastPrice?: number; suspendedDate?: string } {
  let lastPrice: number | undefined;
  let suspendedDate: string | undefined;

  // Try to find price in header - look for "Cierre" label
  const headerElement = document.querySelector("#Contenido_fCab, .datos-cabecera, .cotizacion");

  if (headerElement) {
    const headerText = headerElement.textContent || "";

    // Check for suspension
    suspendedDate = parseSuspendedDate(headerText);

    // Look for close price - various possible patterns
    const priceMatch = /[Cc]ierre[:\s]*([0-9.,]+)/i.exec(headerText);
    if (priceMatch?.[1]) {
      lastPrice = parseSpanishNumber(priceMatch[1]);
    }
  }

  // Try alternative selectors if not found
  if (lastPrice === undefined) {
    // Look for specific price elements
    const priceElements = document.querySelectorAll(".precio, .cotizacion-valor, [class*='price']");
    for (const element of priceElements) {
      const text = element.textContent || "";
      const parsed = parseSpanishNumber(text);
      if (parsed !== undefined && parsed > 0) {
        lastPrice = parsed;
        break;
      }
    }
  }

  // Look for price in data tables
  if (lastPrice === undefined) {
    const tables = document.querySelectorAll("table");
    for (const table of tables) {
      const cells = table.querySelectorAll("td");
      for (let index = 0; index < cells.length; index++) {
        const cell = cells[index];
        const text = cleanText(cell?.textContent ?? "");
        if (text.toLowerCase().includes("cierre")) {
          const nextCell = cells[index + 1];
          if (nextCell) {
            const parsed = parseSpanishNumber(nextCell.textContent || "");
            if (parsed !== undefined) {
              lastPrice = parsed;
              break;
            }
          }
        }
      }
      if (lastPrice !== undefined) break;
    }
  }

  if (lastPrice === undefined) {
    errors.push("Could not parse lastPrice from header");
  }

  return { lastPrice, suspendedDate };
}

/**
 * Parse valor section (#ss_valor) for main product details
 * BME Growth pages use h3/p structure: <h3>Label</h3><p>Value</p>
 */
function parseValorSection(
  document: Document,
  errors: string[],
): Omit<
  ParsedProductDetails,
  "documents" | "errors" | "lastPrice" | "suspendedDate" | "website" | "yearlyHistory"
> {
  const result: Omit<
    ParsedProductDetails,
    "documents" | "errors" | "lastPrice" | "suspendedDate" | "website" | "yearlyHistory"
  > = {};

  // Try to find valor section
  const valorSection = document.querySelector("#ss_valor, .seccion-valor, .datos-valor");

  if (!valorSection) {
    // Fall back to searching the whole document
    parseValorFromDocument(document, result, errors);
    return result;
  }

  // BME Growth uses <h3>Label</h3><p>Value</p> pattern
  const h3Elements = valorSection.querySelectorAll("h3");
  for (const h3 of h3Elements) {
    const label = cleanText(h3.textContent || "").toLowerCase();
    // Find the next <p> sibling
    const nextElement = h3.nextElementSibling;
    if (nextElement?.tagName.toLowerCase() === "p") {
      const value = cleanText(nextElement.textContent || "");
      parseValorField(label, value, result);
    }
  }

  // Also try to parse from table rows (fallback)
  const rows = valorSection.querySelectorAll("tr, .fila, .dato");
  for (const row of rows) {
    const cells = row.querySelectorAll("td, .etiqueta, .valor");
    if (cells.length >= 2) {
      const label = cleanText(cells[0]?.textContent ?? "").toLowerCase();
      const value = cleanText(cells[1]?.textContent ?? "");
      parseValorField(label, value, result);
    }
  }

  // Also try to parse from definition lists
  const dlItems = valorSection.querySelectorAll("dt, dd");
  for (let index = 0; index < dlItems.length - 1; index += 2) {
    const label = cleanText(dlItems[index]?.textContent ?? "").toLowerCase();
    const value = cleanText(dlItems[index + 1]?.textContent ?? "");
    parseValorField(label, value, result);
  }

  // Check for required fields
  if (!result.ticker) errors.push("Could not parse ticker");
  if (!result.isin) errors.push("Could not parse isin");
  if (result.sharesOutstanding === undefined) errors.push("Could not parse sharesOutstanding");

  return result;
}

/**
 * Parse valor section from full document when section not found
 */
function parseValorFromDocument(
  document: Document,
  result: Omit<
    ParsedProductDetails,
    "documents" | "errors" | "lastPrice" | "suspendedDate" | "website" | "yearlyHistory"
  >,
  errors: string[],
): void {
  // BME Growth uses <h3>Label</h3><p>Value</p> pattern throughout the page
  const h3Elements = document.querySelectorAll("h3");
  for (const h3 of h3Elements) {
    const label = cleanText(h3.textContent || "").toLowerCase();
    const nextElement = h3.nextElementSibling;
    if (nextElement?.tagName.toLowerCase() === "p") {
      const value = cleanText(nextElement.textContent || "");
      parseValorField(label, value, result);
    }
  }

  // Also search all tables for valor data (fallback)
  const tables = document.querySelectorAll("table");
  for (const table of tables) {
    const rows = table.querySelectorAll("tr");
    for (const row of rows) {
      const cells = row.querySelectorAll("td, th");
      if (cells.length >= 2) {
        const label = cleanText(cells[0]?.textContent ?? "").toLowerCase();
        const value = cleanText(cells[1]?.textContent ?? "");
        parseValorField(label, value, result);
      }
    }
  }

  // Check for required fields
  if (!result.ticker) errors.push("Could not parse ticker");
  if (!result.isin) errors.push("Could not parse isin");
  if (result.sharesOutstanding === undefined) errors.push("Could not parse sharesOutstanding");
}

/**
 * Parse a single valor field based on label
 */
function parseValorField(
  label: string,
  value: string,
  result: Omit<
    ParsedProductDetails,
    "documents" | "errors" | "lastPrice" | "suspendedDate" | "website" | "yearlyHistory"
  >,
): void {
  if (label.includes("ticker") || label.includes("nemotécnico")) {
    result.ticker = parseValueOrUndefined(value);
  } else if (label.includes("isin")) {
    result.isin = parseValueOrUndefined(value);
  } else if (label.includes("nif") || label.includes("cif")) {
    result.nif = parseValueOrUndefined(value);
  } else if (label.includes("acciones en circulación") || label.includes("acciones")) {
    const parsed = parseSpanishNumber(value);
    if (parsed !== undefined) {
      result.sharesOutstanding = parsed;
    }
  } else if (label.includes("nominal")) {
    result.nominal = parseSpanishNumber(value);
  } else if (label.includes("contratación") || label.includes("tipo contrat")) {
    result.tradingType = parseValueOrUndefined(value);
  } else if (label.includes("proveedor de liquidez") || label.includes("liquidez")) {
    result.liquidityProvider = parseValueOrUndefined(value);
  } else if (label.includes("asesor registrado") || label.includes("asesor")) {
    result.registeredAdvisor = parseValueOrUndefined(value);
  } else if (label.includes("auditor")) {
    result.auditor = parseValueOrUndefined(value);
  } else if (label.includes("domicilio") || label.includes("dirección")) {
    result.address = parseValueOrUndefined(value);
  } else if (label.includes("contacto") || label.includes("email") || label.includes("e-mail")) {
    result.contact = parseValueOrUndefined(value);
  } else if (label.includes("capitalización")) {
    result.marketCap = parseSpanishNumber(value);
  }
}

/**
 * Parse website link (#Contenido_lWeb1 or similar)
 */
function parseWebsiteLink(document: Document): string | undefined {
  // Try specific selector first
  const webLink = document.querySelector(
    "#Contenido_lWeb1, a[href*='http']:not([href*='bmegrowth']):not([href*='bolsasymercados'])",
  );

  if (webLink) {
    const href = webLink.getAttribute("href");
    if (
      href &&
      href.startsWith("http") &&
      !href.includes("bmegrowth") &&
      !href.includes("bolsasymercados")
    ) {
      return href;
    }
  }

  // Look for links labeled as "Web"
  const links = document.querySelectorAll("a");
  for (const link of links) {
    const text = cleanText(link.textContent || "").toLowerCase();
    const href = link.getAttribute("href");

    if (
      (text === "web" || text.includes("web")) &&
      href &&
      href.startsWith("http") &&
      !href.includes("bmegrowth") &&
      !href.includes("bolsasymercados")
    ) {
      return href;
    }
  }

  return undefined;
}

/**
 * Row labels for yearly history table (lowercase for matching)
 */
const YEARLY_ROW_LABELS = {
  capital: ["capital admitido", "capital"],
  closePrice: ["precio cierre", "precio de cierre"],
  marketCap: ["capitalización", "capitalizacion"],
  shares: ["nº de acciones", "acciones", "numero de acciones"],
  turnover: ["efectivo"],
  volume: ["volumen"],
};

/**
 * Parse yearly history table - BME uses years as columns, metrics as rows
 * Structure: #ss_historico section contains a table with:
 * - Header row: [empty] | 2024 | 2025 | ...
 * - Data rows: Metric name | value1 | value2 | ...
 */
function parseYearlyHistoryTable(document: Document, errors: string[]): BmeYearlyData[] {
  const yearlyHistory: BmeYearlyData[] = [];

  // Find the history section and table
  const historySection = document.querySelector("#ss_historico");
  const table =
    historySection?.querySelector("table") ?? document.querySelector("#Contenido_tblCapital");

  if (!table) {
    errors.push("Could not find yearly history table");
    return yearlyHistory;
  }

  const rows = table.querySelectorAll("tr");
  if (rows.length < 2) {
    errors.push("Yearly history table has no data rows");
    return yearlyHistory;
  }

  // Parse header row to get years (columns)
  const headerRow = rows[0];
  if (!headerRow) return yearlyHistory;

  const headerCells = headerRow.querySelectorAll("th, td");
  const years: number[] = [];

  // First cell is usually empty or label, years start from index 1
  for (let colIndex = 1; colIndex < headerCells.length; colIndex++) {
    const cellText = cleanText(headerCells[colIndex]?.textContent ?? "");
    const yearMatch = /(\d{4})/.exec(cellText);
    if (yearMatch?.[1]) {
      years.push(Number.parseInt(yearMatch[1], 10));
    }
  }

  if (years.length === 0) {
    errors.push("Could not parse years from yearly history header");
    return yearlyHistory;
  }

  // Initialize data objects for each year
  const yearDataMap = new Map<number, BmeYearlyData>();
  for (const year of years) {
    yearDataMap.set(year, {
      closePrice: 0,
      marketCap: 0,
      shares: 0,
      turnover: 0,
      volume: 0,
      year,
    });
  }

  // Parse data rows
  for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    if (!row) continue;

    const cells = row.querySelectorAll("td, th");
    if (cells.length < 2) continue;

    // First cell is the row label - clone and remove <small> elements to get clean label
    const labelCell = cells[0];
    if (!labelCell) continue;

    const labelClone = labelCell.cloneNode(true) as Element;
    for (const small of labelClone.querySelectorAll("small")) {
      small.remove();
    }
    const rowLabel = cleanText(labelClone.textContent || "").toLowerCase();

    // Determine which metric this row represents
    let metricKey: keyof typeof YEARLY_ROW_LABELS | undefined;
    for (const [key, labels] of Object.entries(YEARLY_ROW_LABELS)) {
      if (labels.some((label) => rowLabel.includes(label))) {
        metricKey = key as keyof typeof YEARLY_ROW_LABELS;
        break;
      }
    }

    if (!metricKey) continue;

    // Parse values for each year column
    for (let colIndex = 1; colIndex < cells.length && colIndex - 1 < years.length; colIndex++) {
      const year = years[colIndex - 1];
      if (year === undefined) continue;

      const yearData = yearDataMap.get(year);
      if (!yearData) continue;

      const cellText = cleanText(cells[colIndex]?.textContent ?? "");
      const value = parseSpanishNumber(cellText);

      if (value === undefined || value === 0) continue;

      switch (metricKey) {
        case "closePrice": {
          yearData.closePrice = value;
          break;
        }
        case "marketCap": {
          yearData.marketCap = value * 1000;
          break;
        }
        case "shares": {
          yearData.shares = value * 1000;
          break;
        }
        case "turnover": {
          yearData.turnover = value * 1000;
          break;
        }
        case "volume": {
          yearData.volume = value * 1000;
          break;
        }
      }
    }
  }

  // Convert map to array and calculate missing marketCap if needed
  for (const yearData of yearDataMap.values()) {
    if (yearData.marketCap === 0 && yearData.shares > 0 && yearData.closePrice > 0) {
      yearData.marketCap = yearData.shares * yearData.closePrice;
    }
    yearlyHistory.push(yearData);
  }

  // Sort by year descending (most recent first)
  yearlyHistory.sort((a, b) => b.year - a.year);

  return yearlyHistory;
}

/**
 * Parse documents from documentation and notices sections
 */
function parseDocumentsSections(document: Document, baseUrl: string): BmeDocument[] {
  const documents: BmeDocument[] = [];

  // Parse documentation section
  const documentSection = document.querySelector("#ss_documentacion, .documentacion");
  if (documentSection) {
    parseDocumentsFromSection(documentSection, baseUrl, "Documentación", documents);
  }

  // Parse notices section
  const noticesSection = document.querySelector("#ss_avisos, .avisos");
  if (noticesSection) {
    parseDocumentsFromSection(noticesSection, baseUrl, "Aviso", documents);
  }

  return documents;
}

/**
 * Parse documents from a single section
 */
function parseDocumentsFromSection(
  section: Element,
  baseUrl: string,
  defaultType: string,
  documents: BmeDocument[],
): void {
  // Look for document entries - they typically have a link and date
  const links = section.querySelectorAll("a[href*='.pdf'], a[href*='/doc/'], a[href*='documento']");

  for (const link of links) {
    const href = link.getAttribute("href");
    if (!href) continue;

    const url = href.startsWith("http") ? href : new URL(href, baseUrl).toString();
    const description = cleanText(link.textContent || "");

    // Try to find date near the link
    const parentElement = link.parentElement;
    const parentText = parentElement?.textContent ?? "";
    const dateMatch = /(\d{1,2}\/\d{1,2}\/\d{4})/.exec(parentText);
    const date = dateMatch?.[1] ? (parseSpanishDate(dateMatch[1]) ?? "") : "";

    if (description) {
      documents.push({
        date,
        description,
        issuer: "", // Would need more context to extract
        type: defaultType,
        url,
      });
    }
  }
}
