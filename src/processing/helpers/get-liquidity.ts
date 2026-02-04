import type { Liquidity } from "../../types/types";
import type { EuronextDailyPrice, EuronextPriceHistory } from "../../types/euronext.types";
import type { BmeDailyPrice, BmePriceHistory } from "../../types/bme.types";
import type { PortfolioDailyPrice, PortfolioPriceHistory } from "../../types/portfolio.types";

// ============================================
// SHARED
// ============================================

type PriceEntry = BmeDailyPrice | EuronextDailyPrice | PortfolioDailyPrice;

interface EffectivePeriod {
  effectiveMarketDays: number;
  relevantPrices: PriceEntry[];
}

/**
 * Calculate the effective trading period for liquidity.
 * Filters prices to the last year and estimates market days
 * proportionally, adjusting for listing date.
 *
 * Key insight: totalMarketDays reflects the actual product trading period
 * only when the data period (periodStart→periodEnd) is ≤ ~1 year.
 *
 * - BME: periodStart is ~1 year ago → marketDays is product-specific
 * - Euronext (nbSession=600): periodStart is ~2 years ago → tradingDays
 *   is always ~508 for the full period, regardless of listing date
 *   (migrations show tradingDays=508 even with recent listingDate).
 *   For genuine IPOs, tradingDays matches actual days since listing.
 * - Portfolio: periodStart is 2023-01-01 → tradingDays is estimated
 *   business days for the full period.
 *
 * The condition `periodIsWithinOneYear` ensures we only trust
 * totalMarketDays directly when the data period is already ≤ 1 year.
 * Otherwise, we always scale proportionally.
 */
function getEffectivePeriod(
  listingDate: string,
  periodStart: string,
  periodEnd: string,
  totalMarketDays: number,
  prices: PriceEntry[],
): EffectivePeriod {
  const periodEndTime = new Date(periodEnd).getTime();
  const oneYearAgo = new Date(periodEnd);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const oneYearAgoTime = oneYearAgo.getTime();

  // Effective start: max of (listing date, one year ago, period start)
  const effectiveStartDate = Math.max(
    new Date(listingDate).getTime(),
    oneYearAgoTime,
    new Date(periodStart).getTime(),
  );

  // Calculate calendar day spans
  const oneYearDays = Math.ceil((periodEndTime - oneYearAgoTime) / (1000 * 60 * 60 * 24)) + 1;
  const fullPeriodDays =
    Math.ceil((periodEndTime - new Date(periodStart).getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const totalDaysInEffectivePeriod =
    Math.ceil((periodEndTime - effectiveStartDate) / (1000 * 60 * 60 * 24)) + 1;

  // Only trust totalMarketDays directly when:
  // 1. The product listed after one year ago, AND
  // 2. The data period already covers ≤ ~1 year (periodStart ≥ oneYearAgo)
  //
  // This prevents the Euronext migration bug where tradingDays=508
  // (full 2-year period) but listingDate is recent (migration date).
  // For genuine recent IPOs on any exchange, both conditions are true
  // and totalMarketDays correctly reflects actual trading days.
  const listedAfterOneYearAgo = new Date(listingDate).getTime() > oneYearAgoTime;
  const periodIsWithinOneYear = new Date(periodStart).getTime() >= oneYearAgoTime;

  let effectiveMarketDays: number;

  if (listedAfterOneYearAgo && periodIsWithinOneYear) {
    // Data period is ≤ 1 year AND product listed recently:
    // totalMarketDays already represents the product's actual trading period
    effectiveMarketDays = totalMarketDays;
  } else {
    // Data period > 1 year OR product listed before one year ago:
    // Scale proportionally: full period → last year → effective period
    const marketDaysLastYear = Math.round(totalMarketDays * (oneYearDays / fullPeriodDays));
    effectiveMarketDays = Math.round(
      marketDaysLastYear * (totalDaysInEffectivePeriod / oneYearDays),
    );
  }

  // Filter prices from effective start date
  const relevantPrices = prices.filter((p) => new Date(p.date).getTime() >= effectiveStartDate);

  return { effectiveMarketDays, relevantPrices };
}

function emptyLiquidity(): Liquidity {
  return {
    avgDailyTurnover: 0,
    tradingDaysRatio: 0,
    turnover: 0,
    turnoverVelocity: 0,
    volume: 0,
  };
}

// ============================================
// EURONEXT
// ============================================

export function getEuronextLiquidity(
  listingDate: string,
  priceHistory: EuronextPriceHistory,
  shares: number,
): Liquidity {
  const { periodEnd, periodStart, prices, tradingDays } = priceHistory;
  const { effectiveMarketDays, relevantPrices } = getEffectivePeriod(
    listingDate,
    periodStart,
    periodEnd,
    tradingDays,
    prices,
  );

  if (relevantPrices.length === 0) return emptyLiquidity();

  const totalTurnover = relevantPrices.reduce((sum, p) => sum + (p.turnover ?? 0), 0);
  const totalVolume = relevantPrices.reduce((sum, p) => sum + (p.volume ?? 0), 0);
  const daysWithTrading = relevantPrices.filter((p) => (p.turnover ?? 0) > 0).length;

  const avgClosePrice =
    relevantPrices.reduce((sum, p) => sum + p.closePrice, 0) / relevantPrices.length;
  const avgMarketCap = avgClosePrice * shares;

  return {
    avgDailyTurnover: effectiveMarketDays > 0 ? totalTurnover / effectiveMarketDays : 0,
    tradingDaysRatio: effectiveMarketDays > 0 ? daysWithTrading / effectiveMarketDays : 0,
    turnover: totalTurnover,
    turnoverVelocity: avgMarketCap > 0 ? totalTurnover / avgMarketCap : 0,
    volume: totalVolume,
  };
}

// ============================================
// BME
// ============================================

export function getBmeLiquidity(
  listingDate: string,
  priceHistory: BmePriceHistory,
  shares: number,
): Liquidity {
  const { marketDays, periodEnd, periodStart, prices } = priceHistory;
  const { effectiveMarketDays, relevantPrices } = getEffectivePeriod(
    listingDate,
    periodStart,
    periodEnd,
    marketDays,
    prices,
  );

  if (relevantPrices.length === 0) return emptyLiquidity();

  const totalTurnover = relevantPrices.reduce((sum, p) => sum + (p.turnover ?? 0), 0);
  const totalVolume = relevantPrices.reduce((sum, p) => sum + (p.volume ?? 0), 0);
  // En BME, prices solo contiene días con actividad
  const daysWithTrading = relevantPrices.length;

  const avgClosePrice =
    relevantPrices.reduce((sum, p) => sum + p.closePrice, 0) / relevantPrices.length;
  const avgMarketCap = avgClosePrice * shares;

  return {
    avgDailyTurnover: effectiveMarketDays > 0 ? totalTurnover / effectiveMarketDays : 0,
    tradingDaysRatio: effectiveMarketDays > 0 ? daysWithTrading / effectiveMarketDays : 0,
    turnover: totalTurnover,
    turnoverVelocity: avgMarketCap > 0 ? totalTurnover / avgMarketCap : 0,
    volume: totalVolume,
  };
}

// ============================================
// PORTFOLIO
// ============================================

export function getPortfolioLiquidity(
  listingDate: string,
  priceHistory: PortfolioPriceHistory,
  shares: number,
): Liquidity {
  const { periodEnd, periodStart, prices, tradingDays } = priceHistory;
  const { effectiveMarketDays, relevantPrices } = getEffectivePeriod(
    listingDate,
    periodStart,
    periodEnd,
    tradingDays,
    prices,
  );

  if (relevantPrices.length === 0) return emptyLiquidity();

  const totalTurnover = relevantPrices.reduce((sum, p) => sum + (p.turnover ?? 0), 0);
  const totalVolume = relevantPrices.reduce((sum, p) => sum + (p.volume ?? 0), 0);
  const daysWithTrading = relevantPrices.filter(
    (p) => (p.turnover ?? 0) > 0 || (p.volume ?? 0) > 0,
  ).length;

  const avgClosePrice =
    relevantPrices.reduce((sum, p) => sum + p.closePrice, 0) / relevantPrices.length;
  const avgMarketCap = avgClosePrice * shares;

  return {
    avgDailyTurnover: effectiveMarketDays > 0 ? totalTurnover / effectiveMarketDays : 0,
    tradingDaysRatio: effectiveMarketDays > 0 ? daysWithTrading / effectiveMarketDays : 0,
    turnover: totalTurnover,
    turnoverVelocity: avgMarketCap > 0 ? totalTurnover / avgMarketCap : 0,
    volume: totalVolume,
  };
}
