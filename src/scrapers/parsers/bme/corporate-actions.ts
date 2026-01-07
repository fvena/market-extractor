/**
 * Parser for BME Alternatives (Growth/ScaleUp) corporate actions pages
 */

import type {
  BmeCapitalIncrease,
  BmeConsolidation,
  BmeCorporateActions,
  BmeDelisting,
  BmeDividend,
  BmeListing,
  BmeSpecialPayment,
  BmeSplit,
} from "../../../markets/bme/types";
import { JSDOM } from "jsdom";
import {
  cleanText,
  parseSpanishDate,
  parseSpanishNumber,
  parseValueOrUndefined,
} from "../../../helpers/parsing";

//** Corporate action type codes */
export type CorporateActionType = "Ad" | "Am" | "Da" | "Dv" | "Ex" | "Rn" | "Sp";

/** Maps action type to its result type */
interface ActionTypeResultMap {
  Ad: BmeListing;
  Am: BmeCapitalIncrease;
  Da: BmeSpecialPayment;
  Dv: BmeDividend;
  Ex: BmeDelisting;
  Rn: BmeConsolidation;
  Sp: BmeSplit;
}

/** Maps action type to its result key in BmeCorporateActions */
interface ActionTypeKeyMap {
  Ad: "listings";
  Am: "capitalIncreases";
  Da: "specialPayments";
  Dv: "dividends";
  Ex: "delistings";
  Rn: "consolidations";
  Sp: "splits";
}

/** Parser function type */
type RowParser<T extends CorporateActionType> = (
  cells: NodeListOf<HTMLTableCellElement>,
) => ActionTypeResultMap[T] | undefined;

/** Configuration for each action type */
interface ActionTypeConfig<T extends CorporateActionType> {
  key: ActionTypeKeyMap[T];
  name: string;
  parse: RowParser<T>;
}

/** Unified configuration for all action types */
export const ACTION_TYPE_CONFIG: { [K in CorporateActionType]: ActionTypeConfig<K> } = {
  Ad: { key: "listings", name: "Admisiones", parse: parseListing },
  Am: { key: "capitalIncreases", name: "Ampliaciones", parse: parseCapitalIncrease },
  Da: { key: "specialPayments", name: "Pagos Especiales", parse: parseSpecialPayment },
  Dv: { key: "dividends", name: "Dividendos", parse: parseDividend },
  Ex: { key: "delistings", name: "Exclusiones", parse: parseDelisting },
  Rn: { key: "consolidations", name: "Refundiciones", parse: parseConsolidation },
  Sp: { key: "splits", name: "Splits", parse: parseSplit },
};

/**
 * Parse the corporate actions page HTML for a specific action type
 * Returns a typed array based on the action type
 */
export function parseCorporateActionsPage<T extends CorporateActionType>(
  html: string,
  actionType: T,
): ActionTypeResultMap[T][] {
  const config = ACTION_TYPE_CONFIG[actionType];
  const dom = new JSDOM(html);
  const document = dom.window.document;

  const table =
    document.querySelector(`#Contenido_tbl${actionType}`) ??
    document.querySelector("#Contenido_Tbl, .tabla-resultados, table.operaciones") ??
    findTableByCaption(document, config.name);

  if (!table) {
    return [];
  }

  const results: ActionTypeResultMap[T][] = [];
  const rows = table.querySelectorAll("tr");

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    if (!row) continue;

    const cells = row.querySelectorAll("td");
    if (cells.length < 2) continue;

    try {
      const parsed = config.parse(cells);
      if (parsed) results.push(parsed);
    } catch {
      // Skip invalid rows
    }
  }

  return results;
}

/**
 * Parse capital increase (Am - Ampliación) row
 * Market-wide table structure: Periodo | Emisora | Títulos | Natur. | Proporción | Tipo | Precio | Desemb. | Nego. Dchos. | Fecha Benef./Div. | Observaciones
 */
function parseCapitalIncrease(cells: NodeListOf<Element>): BmeCapitalIncrease | undefined {
  if (cells.length < 6) return undefined;

  // Column 0: Periodo (subscription period date range)
  const periodText = cleanText(cells[0]?.textContent ?? "");

  // Parse period (subscription dates)
  let periodStart: string | undefined;
  let periodEnd: string | undefined;
  const periodMatch =
    /(\d{1,2}\/\d{1,2}\/\d{4})(?:\s*(?:<br\s*\/?>|[-–])\s*(\d{1,2}\/\d{1,2}\/\d{4}))?/.exec(
      periodText,
    );

  if (periodMatch?.[1]) {
    periodStart = parseSpanishDate(periodMatch[1]);
    periodEnd = periodMatch[2] ? parseSpanishDate(periodMatch[2]) : periodStart; // Si solo hay una fecha, usar la misma para ambos
  }

  // If no valid period found, skip this row
  if (!periodStart && !periodEnd) return undefined;

  // Column 1: Emisora (issuer for matching)
  const issuer = cleanText(cells[1]?.textContent ?? "");
  // Column 2: Títulos (shares)
  const shares = parseSpanishNumber(cells[2]?.textContent ?? "");
  // Column 3: Natur. (nature)
  const nature = cleanText(cells[3]?.textContent ?? "");
  // Column 4: Proporción (ratio)
  const ratio = cleanText(cells[4]?.textContent ?? "");
  // Column 5: Tipo (type)
  const type = cleanText(cells[5]?.textContent ?? "");
  // Column 6: Precio (price)
  const price = cells.length > 6 ? parseSpanishNumber(cells[6]?.textContent ?? "") : undefined;
  // Column 7: Desemb. (disbursement)
  const disbursement =
    cells.length > 7 ? parseSpanishNumber(cells[7]?.textContent ?? "") : undefined;
  // Column 8: Nego. Dchos. (tradable rights - "Si"/"No")
  const tradableRightsText = cells.length > 8 ? cleanText(cells[8]?.textContent ?? "") : "";
  const tradableRights = tradableRightsText.toLowerCase() === "si";
  // Column 9: Fecha Benef./Div. (dividend benefit date)
  const dividendBenefitDateText = cells.length > 9 ? cleanText(cells[9]?.textContent ?? "") : "";
  const dividendBenefitDate = parseSpanishDate(dividendBenefitDateText);
  // Column 10: Observaciones (notes)
  const notes = cells.length > 10 ? parseValueOrUndefined(cells[10]?.textContent ?? "") : undefined;

  return {
    disbursement,
    dividendBenefitDate,
    issuer: issuer || undefined,
    nature: nature || "Unknown",
    notes,
    periodEnd,
    periodStart,
    price,
    ratio: ratio || "Unknown",
    shares,
    tradableRights,
    type: type || "Unknown",
  };
}

/**
 * Parse split (Sp) row
 * Market-wide table structure: Fecha | Emisora | Valor | ISIN Valor (Ant.) | ISIN Valor (Ult.) | Nominal | Equivalencia
 */
function parseSplit(cells: NodeListOf<Element>): BmeSplit | undefined {
  if (cells.length < 5) return undefined;

  // Column 0: Fecha (date)
  const dateText = cleanText(cells[0]?.textContent ?? "");
  const date = parseSpanishDate(dateText);

  if (!date) return undefined;

  // Column 1: Emisora (issuer for matching)
  const issuer = cleanText(cells[1]?.textContent ?? "");
  // Column 2: Valor (security name)
  const securityName = cleanText(cells[2]?.textContent ?? "");
  // Column 3: ISIN Valor (Ant.) (previous ISIN)
  const previousIsin = cleanText(cells[3]?.textContent ?? "");
  // Column 4: ISIN Valor (Ult.) (new ISIN)
  const newIsin = cleanText(cells[4]?.textContent ?? "") || previousIsin;
  // Column 5: Nominal (nominal value)
  const nominal = cells.length > 5 ? parseSpanishNumber(cells[5]?.textContent ?? "") : undefined;
  // Column 6: Equivalencia (ratio)
  const equivalence = cells.length > 6 ? cleanText(cells[6]?.textContent ?? "") : "Unknown";

  return {
    date,
    equivalence: equivalence || "Unknown",
    issuer: issuer || undefined,
    newIsin: newIsin || previousIsin,
    nominal,
    previousIsin: previousIsin || "Unknown",
    securityName: securityName || "Unknown",
  };
}

/**
 * Parse consolidation (Rn - Refundición/Contrasplit) row
 * Market-wide table structure: Fecha | Emisora | Valor | ISIN Valor | Equivalencia
 */
function parseConsolidation(cells: NodeListOf<Element>): BmeConsolidation | undefined {
  if (cells.length < 4) return undefined;

  // Column 0: Fecha (date)
  const dateText = cleanText(cells[0]?.textContent ?? "");
  const date = parseSpanishDate(dateText);

  if (!date) return undefined;

  // Column 1: Emisora (issuer for matching)
  const issuer = cleanText(cells[1]?.textContent ?? "");
  // Column 2: Valor (security name)
  const securityName = cleanText(cells[2]?.textContent ?? "");
  // Column 3: ISIN Valor (ISIN)
  const isin = cleanText(cells[3]?.textContent ?? "");
  // Column 4: Equivalencia (ratio)
  const equivalence = cells.length > 4 ? cleanText(cells[4]?.textContent ?? "") : "Unknown";

  return {
    date,
    equivalence: equivalence || "Unknown",
    isin: isin || "Unknown",
    issuer: issuer || undefined,
    securityName: securityName || "Unknown",
  };
}

/**
 * Parse dividend (Dv) row
 * Market-wide table structure: Fecha Descuento | Fecha Abono | Emisora | Valor | ISIN Valor | Ejercicio | Tipo | Importe Bruto
 */
function parseDividend(cells: NodeListOf<Element>): BmeDividend | undefined {
  if (cells.length < 5) return undefined;

  // Column 0: Fecha Descuento (ex-dividend date)
  const exDateText = cleanText(cells[0]?.textContent ?? "");
  const exDate = parseSpanishDate(exDateText);

  if (!exDate) return undefined;

  // Column 1: Fecha Abono (payment date)
  const paymentDateText = cleanText(cells[1]?.textContent ?? "");
  const paymentDate = parseSpanishDate(paymentDateText);
  // Column 2: Emisora (issuer)
  const issuer = cleanText(cells[2]?.textContent ?? "");
  // Column 3: Valor (security name)
  const securityName = cleanText(cells[3]?.textContent ?? "") || issuer;
  // Column 4: ISIN Valor
  const isin = cleanText(cells[4]?.textContent ?? "");
  // Column 5: Ejercicio (fiscal year)
  const fiscalYear = cells.length > 5 ? cleanText(cells[5]?.textContent ?? "") : "";
  // Column 6: Tipo (type - Ord., Ext., etc.)
  const type = cells.length > 6 ? cleanText(cells[6]?.textContent ?? "") : "Ord.";
  // Column 7: Importe Bruto (gross amount per share)
  const grossAmount =
    cells.length > 7 ? parseSpanishNumber(cells[7]?.textContent ?? "") : undefined;

  return {
    exDate,
    fiscalYear: fiscalYear || "Unknown",
    grossAmount,
    isin: isin || "Unknown",
    issuer: issuer || "Unknown",
    paymentDate,
    securityName: securityName || "Unknown",
    type: type || "Ord.",
  };
}

/**
 * Parse special payment (Da - Pago especial) row
 * Market-wide table structure: Fecha Descuento | Fecha Abono | Emisora | Tipo | Clase | Importe Bruto | Observaciones
 */
function parseSpecialPayment(cells: NodeListOf<Element>): BmeSpecialPayment | undefined {
  if (cells.length < 4) return undefined;

  // Column 0: Fecha Descuento (discount date)
  const dateText = cleanText(cells[0]?.textContent ?? "");
  const date = parseSpanishDate(dateText);

  if (!date) return undefined;

  // Column 1: Fecha Abono (payment date)
  const paymentDateText = cleanText(cells[1]?.textContent ?? "");
  const paymentDate = parseSpanishDate(paymentDateText);
  // Column 2: Emisora (issuer)
  const issuer = cleanText(cells[2]?.textContent ?? "");
  // Column 3: Tipo (type)
  const type = cleanText(cells[3]?.textContent ?? "");
  // Column 4: Clase (payment class)
  const paymentClass = cells.length > 4 ? cleanText(cells[4]?.textContent ?? "") : "En Efectivo";
  // Column 5: Importe Bruto (gross amount)
  const grossAmount =
    cells.length > 5 ? parseSpanishNumber(cells[5]?.textContent ?? "") : undefined;
  // Column 6: Observaciones (notes)
  const notes = cells.length > 6 ? parseValueOrUndefined(cells[6]?.textContent ?? "") : undefined;

  return {
    date,
    grossAmount,
    issuer: issuer || "Unknown",
    notes,
    paymentClass: paymentClass || "En Efectivo",
    paymentDate,
    type: type || "Unknown",
  };
}

/**
 * Parse listing/admission (Ad) row
 * Market-wide table structure: Fecha Admisión | ISIN | Cod. Bolsa | Entidad | Número Títulos | Importe Nominal | Unidad Contratación | Importe Efectivo | Tipo | Observaciones
 */
function parseListing(cells: NodeListOf<Element>): BmeListing | undefined {
  if (cells.length < 4) return undefined;

  // Column 0: Fecha Admisión (admission date)
  const dateText = cleanText(cells[0]?.textContent ?? "");
  const date = parseSpanishDate(dateText);

  if (!date) return undefined;

  // Column 1: ISIN
  const isin = cleanText(cells[1]?.textContent ?? "");
  // Column 2: Cod. Bolsa (exchange code)
  const exchangeCode = cleanText(cells[2]?.textContent ?? "");
  // Column 3: Entidad (issuer name for matching)
  const issuer = cleanText(cells[3]?.textContent ?? "");
  // Column 4: Número Títulos (shares)
  const shares = cells.length > 4 ? parseSpanishNumber(cells[4]?.textContent ?? "") : undefined;
  // Column 5: Importe Nominal (nominal amount)
  const nominalAmount =
    cells.length > 5 ? parseSpanishNumber(cells[5]?.textContent ?? "") : undefined;
  // Column 6: Unidad Contratación (trading unit)
  const tradingUnit =
    cells.length > 6 ? parseSpanishNumber(cells[6]?.textContent ?? "") : undefined;
  // Column 7: Importe Efectivo (effective amount)
  const effectiveAmount =
    cells.length > 7 ? parseSpanishNumber(cells[7]?.textContent ?? "") : undefined;
  // Column 8: Tipo (type)
  const type = cells.length > 8 ? cleanText(cells[8]?.textContent ?? "") : "Nueva Adm.";
  // Column 9: Observaciones (notes)
  const notes = cells.length > 9 ? parseValueOrUndefined(cells[9]?.textContent ?? "") : undefined;

  return {
    date,
    effectiveAmount,
    exchangeCode: exchangeCode || "Unknown",
    isin: isin || "Unknown",
    issuer: issuer || undefined,
    nominalAmount,
    notes,
    shares,
    tradingUnit,
    type: type || "Unknown",
  };
}

/**
 * Parse delisting (Ex - Exclusión) row
 * Market-wide table structure: Fecha Exclusión | ISIN | Cod. Bolsa | Entidad | Número Títulos | Importe Nominal | Unidad Contratación | Importe Efectivo | Observaciones
 */
function parseDelisting(cells: NodeListOf<Element>): BmeDelisting | undefined {
  if (cells.length < 4) return undefined;

  // Column 0: Fecha Exclusión (delisting date)
  const dateText = cleanText(cells[0]?.textContent ?? "");
  const date = parseSpanishDate(dateText);

  if (!date) return undefined;

  // Column 1: ISIN
  const isin = cleanText(cells[1]?.textContent ?? "");
  // Column 2: Cod. Bolsa (exchange code)
  const exchangeCode = cleanText(cells[2]?.textContent ?? "");
  // Column 3: Entidad (issuer name for matching)
  const issuer = cleanText(cells[3]?.textContent ?? "");
  // Column 4: Número Títulos (shares)
  const shares = cells.length > 4 ? parseSpanishNumber(cells[4]?.textContent ?? "") : undefined;
  // Column 5: Importe Nominal (nominal amount)
  const nominalAmount =
    cells.length > 5 ? parseSpanishNumber(cells[5]?.textContent ?? "") : undefined;
  // Columns 6-7: Unidad Contratación, Importe Efectivo (skipped, not in type)
  // Column 8: Observaciones (notes/reason)
  const reason = cells.length > 8 ? parseValueOrUndefined(cells[8]?.textContent ?? "") : undefined;

  return {
    date,
    exchangeCode: exchangeCode || "Unknown",
    isin: isin || "Unknown",
    issuer: issuer || undefined,
    nominalAmount,
    reason,
    shares,
  };
}

/**
 * Find table by caption text
 */
function findTableByCaption(document: Document, captionText: string): Element | undefined {
  const captions = document.querySelectorAll("table caption");
  for (const caption of captions) {
    if (caption.textContent.toLowerCase().includes(captionText.toLowerCase())) {
      return caption.closest("table") ?? undefined;
    }
  }
  return undefined;
}

/**
 * Get empty corporate actions object
 */
export function emptyCorporateActions(): BmeCorporateActions {
  return {
    capitalIncreases: [],
    consolidations: [],
    delistings: [],
    dividends: [],
    listings: [],
    specialPayments: [],
    splits: [],
  };
}
