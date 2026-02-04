import type {
  BmeAlternativesDetails,
  EuronextDetails,
  MarketId,
  MarketMigration,
  MarketMigrationId,
} from "../../types/types";
import { parseIpoDate } from "../../helpers/parsing";

interface MigrationPattern {
  from: MarketId;
  patterns: RegExp[];
  to: MarketId;
}

/** Market name normalization patterns */
export const MARKET_NAME_PATTERNS = {
  bmeGrowth: ["BME GROWTH", "MERCADO ALTERNATIVO BURSATIL", "MAB"],
  bmeScaleup: ["BME SCALEUP", "BME SCALE UP"],
};

const MIGRATION_PATTERNS: MigrationPattern[] = [
  {
    from: "bme-growth",
    patterns: [
      /exclusi[óo]n\s+en\s+el\s+segmento\s+de\s+negociaci[óo]n\s+bme\s+growth.*incorporaci[óo]n.*bme\s+scaleup/i,
      /exclusi[óo]n.*bme\s+growth.*simultánea\s+incorporaci[óo]n.*bme\s+scaleup/i,
    ],
    to: "bme-scaleup",
  },
  {
    from: "bme-scaleup",
    patterns: [
      /exclusi[óo]n\s+en\s+el\s+segmento\s+de\s+negociaci[óo]n\s+bme\s+scaleup.*incorporaci[óo]n.*bme\s+growth/i,
      /exclusi[óo]n.*bme\s+scaleup.*simultánea\s+incorporaci[óo]n.*bme\s+growth/i,
    ],
    to: "bme-growth",
  },
];

export function getMarketMigrationBmeAlternatives(data: BmeAlternativesDetails) {
  const documents = data.documents;
  const name = data.name;
  const ticker = data.ticker;
  const migrations: MarketMigration[] = [];
  const seen = new Set<string>(); // Avoid duplicates: "ticker-date-from-to"

  if (documents.length === 0) return [];

  for (const document of documents) {
    const description = document.description;
    const date = document.date;

    // Check each migration pattern
    for (const { from, patterns, to } of MIGRATION_PATTERNS) {
      const matches = patterns.some((pattern) => pattern.test(description));

      if (matches) {
        // Use string fallback for the template parts to avoid type errors
        const key = `${ticker}-${date}-${from}-${to}`;

        if (!seen.has(key)) {
          seen.add(key);
          migrations.push({ date, from, name, ticker, to });
        }
      }
    }
  }

  // Sort by date descending (newest first)
  return migrations.sort((a, b) => b.date.localeCompare(a.date));
}

// ============================================
// EURONEXT MARKET MIGRATIONS
// ============================================

/**
 * Normaliza el nombre de un mercado al MarketMigrationId correspondiente
 */
function normalizeMarketName(name: string): MarketMigrationId {
  const normalized = name.toLowerCase().trim();

  // Mapeo de nombres de mercado a MarketMigrationId
  /* eslint-disable perfectionist/sort-objects -- we want to keep the order of the market names */
  const marketMap: Record<string, MarketMigrationId> = {
    // Euronext Access
    "euronext access": "euronext-access",
    "euronext access+": "euronext-access+",

    // Euronext Growth y Alternext (Alternext es el nombre antiguo de Euronext Growth)
    "euronext growth": "euronext-growth",
    alternext: "euronext-growth",
    "nyse alternext": "euronext-growth",
    "nyse alternext paris": "euronext-growth",
    "alternext paris": "euronext-growth",

    // Euronext Regulated (principal)
    euronext: "euronext-regulated",
    "euronext paris": "euronext-regulated",
    "euronext amsterdam": "euronext-regulated",
    "euronext brussels": "euronext-regulated",
    "euronext lisbon": "euronext-regulated",
    "euronext milan": "euronext-regulated",

    // Oslo Børs
    "oslo børs": "euronext-oslo-bors",
    "euronext oslo børs": "euronext-oslo-bors",

    // Euronext Expand
    "euronext expand": "euronext-expand",
    "euronext expand oslo": "euronext-expand",

    // Otros
    "euronext derivatives": "euronext-derivative",
    "euronext miv": "euronext-miv",
    "marché libre": "marche-libre",
    "ml paris": "marche-libre",

    // BME
    "bme continuo": "bme-continuo",
    "bme growth": "bme-growth",
    "bme scaleup": "bme-scaleup",

    // Portfolio
    portfolio: "portfolio",
  };

  /* eslint-enable perfectionist/sort-objects */

  // Buscar coincidencia exacta
  if (marketMap[normalized]) {
    return marketMap[normalized];
  }

  // Buscar coincidencia parcial
  const keys = Object.keys(marketMap);
  for (const key of keys) {
    if (normalized.includes(key) || key.includes(normalized)) {
      const value = marketMap[key];
      if (value) {
        return value;
      }
    }
  }

  return "unknown";
}

/**
 * Parsea el transferDetails para extraer los mercados de origen y destino
 * Retorna [from, to] o null si no se puede parsear
 */
function parseTransferDetails(
  transferDetails: string,
): [MarketMigrationId, MarketMigrationId] | undefined {
  const normalized = transferDetails.toLowerCase().trim();

  // Patrones con separador " - " o " to "
  const patterns = [
    /^(.+?)\s*-\s*(.+?)$/i,
    /^(.+?)\s+to\s+(.+?)$/i,
    /^transfer\s+from\s+(.+?)\s+to\s+(.+?)$/i,
    /^from\s+(.+?)\s+to\s+(.+?)$/i,
    /^transfert\s+sur\s+(.+?)$/i, // Francés: solo destino
  ];

  for (const pattern of patterns) {
    const match = transferDetails.match(pattern);
    if (match) {
      if (match.length === 2) {
        // Solo destino (francés)
        return; // Se inferirá del contexto
      }
      if (!match[1] || !match[2]) {
        return;
      }
      const from = normalizeMarketName(match[1]);
      const to = normalizeMarketName(match[2]);
      if (from !== "unknown" || to !== "unknown") {
        return [from, to];
      }
    }
  }

  // Casos especiales sin patrón claro
  if (normalized === "yes") {
    return; // Se inferirá del contexto
  }

  if (
    normalized.includes("alternext") &&
    !normalized.includes("-") &&
    !normalized.includes(" to ")
  ) {
    // Solo menciona Alternext como destino
    return;
  }

  return;
}

/**
 * Extrae las migraciones de un producto basándose en sus ipoEntries
 * @param product - Datos del producto incluyendo ipoEntries
 * @param currentMarketId - El MarketId del mercado donde actualmente está el producto
 * @returns Array de migraciones detectadas
 */
export function getMarketMigrationEuronext(product: EuronextDetails): MarketMigration[] {
  const migrations: MarketMigration[] = [];
  const { ipoEntries, name } = product;

  if (ipoEntries.length === 0) {
    return migrations;
  }

  // Ordenar entradas por fecha (más antigua primero)
  const sortedEntries = [...ipoEntries].sort((a, b) => {
    if (!a.ipoDate || !b.ipoDate) {
      return 0;
    }
    const dateA = parseIpoDate(a.ipoDate);
    const dateB = parseIpoDate(b.ipoDate);
    return dateA.localeCompare(dateB);
  });

  // Buscar entradas con Transfer en ipoTypes
  for (let index = 0; index < sortedEntries.length; index++) {
    const entry = sortedEntries[index];
    if (!entry) {
      continue;
    }
    const hasTransfer = entry.ipoTypes.some((type) => type.toLowerCase() === "transfer");

    if (!hasTransfer || !entry.ipoDate) {
      continue;
    }

    const date = parseIpoDate(entry.ipoDate);
    let from: MarketMigrationId = "unknown";
    let to: MarketMigrationId = normalizeMarketName(entry.exchangeMarket ?? "");

    // Intentar extraer from/to del transferDetails
    if (entry.transferDetails) {
      const parsed = parseTransferDetails(entry.transferDetails);
      if (parsed) {
        [from, to] = parsed;
      } else {
        // Si no se pudo parsear transferDetails, usar exchangeMarket como destino
        // e intentar inferir origen de la entrada anterior
        to = normalizeMarketName(entry.exchangeMarket ?? "");

        // Buscar la entrada inmediatamente anterior que no sea transfer
        for (let index_ = index - 1; index_ >= 0; index_--) {
          const previousEntry = sortedEntries[index_];
          if (!previousEntry) {
            continue;
          }
          const previousHasTransfer = previousEntry.ipoTypes.some(
            (type) => type.toLowerCase() === "transfer",
          );
          if (!previousHasTransfer && previousEntry.exchangeMarket) {
            from = normalizeMarketName(previousEntry.exchangeMarket);
            break;
          }
        }
      }
    } else {
      // Sin transferDetails, inferir origen de entradas anteriores
      for (let index_ = index - 1; index_ >= 0; index_--) {
        const previousEntry = sortedEntries[index_];
        if (!previousEntry) {
          continue;
        }
        const previousHasTransfer = previousEntry.ipoTypes.some(
          (type) => type.toLowerCase() === "transfer",
        );
        if (!previousHasTransfer && previousEntry.exchangeMarket) {
          from = normalizeMarketName(previousEntry.exchangeMarket);
          break;
        }
      }
    }

    // Evitar duplicados y migraciones inválidas
    if (from !== to) {
      migrations.push({
        date,
        from,
        name,
        to,
      });
    }
  }

  return migrations;
}

// ============================================
// PORTFOLIO MIGRATIONS
// ============================================
const PORTFOLIO_MIGRATIONS: Record<string, MarketMigration> = {
  LIVE: {
    date: "2023-09-05",
    from: "bme-growth",
    name: "LIVE",
    to: "portfolio",
  },
  PSLP: {
    date: "2023-10-17",
    from: "bme-growth",
    name: "PSLP",
    to: "portfolio",
  },
};

export function getPortfolioMigrations(ticker: string): MarketMigration[] {
  return Object.values(PORTFOLIO_MIGRATIONS).filter((migration) => migration.ticker === ticker);
}
