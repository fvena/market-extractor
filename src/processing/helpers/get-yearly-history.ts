import type { YearlyMarketCap } from "../../types/types";
import type { BmeYearlyData } from "../../types/bme.types";
import type { EuronextDailyPrice } from "../../types/euronext.types";
import type { PortfolioDailyPrice } from "../../types/portfolio.types";

// ============================================
// BME CONTINUO / BME ALTERNATIVES
// ============================================

export function getBmeYearlyMarketCap(data: BmeYearlyData[], startYear = 2023): YearlyMarketCap[] {
  return data
    .filter((item) => item.year >= startYear)
    .map((item) => ({
      marketCap: item.marketCap,
      year: item.year,
    }))
    .sort((a, b) => a.year - b.year);
}

// ============================================
// EURONEXT
// ============================================

export function getEuronextYearlyMarketCap(
  prices: EuronextDailyPrice[],
  listingDate: string,
  shares: number,
  startYear = 2023,
): YearlyMarketCap[] {
  const currentYear = new Date().getFullYear();
  const listingYear = new Date(listingDate).getFullYear();
  const effectiveStartYear = Math.max(startYear, listingYear);

  // Agrupar precios por año
  const pricesByYear = new Map<number, EuronextDailyPrice[]>();

  for (const price of prices) {
    const year = new Date(price.date).getFullYear();
    if (year >= effectiveStartYear) {
      if (!pricesByYear.has(year)) {
        pricesByYear.set(year, []);
      }
      pricesByYear.get(year)?.push(price);
    }
  }

  const result: YearlyMarketCap[] = [];

  for (let year = effectiveStartYear; year <= currentYear; year++) {
    const yearPrices = pricesByYear.get(year);

    if (yearPrices && yearPrices.length > 0) {
      // Ordenar por fecha y tomar el último precio del año
      yearPrices.sort((a, b) => a.date.localeCompare(b.date));
      const lastPrice = yearPrices.at(-1)?.closePrice ?? 0;

      result.push({
        marketCap: lastPrice * shares,
        year,
      });
    }
    // Si no hay datos para ese año, no incluimos el producto
  }

  return result;
}

// ============================================
// PORTFOLIO
// ============================================

export function getPortfolioYearlyMarketCap(
  listingDate: string,
  shares: number,
  prices: PortfolioDailyPrice[],
  referencePrice: number,
  startYear = 2023,
): YearlyMarketCap[] {
  const currentYear = new Date().getFullYear();
  const listingYear = new Date(listingDate).getFullYear();
  const effectiveStartYear = Math.max(startYear, listingYear);

  // Agrupar transacciones por año
  const transactionsByYear = new Map<number, PortfolioDailyPrice[]>();

  for (const tx of prices) {
    const year = new Date(tx.date).getFullYear();
    if (!transactionsByYear.has(year)) {
      transactionsByYear.set(year, []);
    }
    transactionsByYear.get(year)?.push(tx);
  }

  const result: YearlyMarketCap[] = [];
  let lastKnownPrice = referencePrice;

  for (let year = effectiveStartYear; year <= currentYear; year++) {
    const yearTransactions = transactionsByYear.get(year);

    if (yearTransactions && yearTransactions.length > 0) {
      // Ordenar por fecha y tomar el último precio del año
      yearTransactions.sort((a, b) => a.date.localeCompare(b.date));
      lastKnownPrice = yearTransactions.at(-1)?.closePrice ?? 0;
    }
    // Si no hay transacciones, usamos lastKnownPrice (del año anterior o listingPrice)

    result.push({
      marketCap: lastKnownPrice * shares,
      year,
    });
  }

  return result;
}
