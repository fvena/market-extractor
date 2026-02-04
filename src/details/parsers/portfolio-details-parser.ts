import type { PortfolioDailyPrice, PostTradeTransaction } from "../../types/portfolio.types";

/**
 * Parse ISO date string to YYYY-MM-DD format
 */
export function parseIsoDate(dateString: string | undefined): string | undefined {
  if (!dateString) return undefined;

  // Try to parse ISO format (2024-01-15T00:00:00)
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(dateString);
  return match?.[1];
}

/**
 * Groups transactions by date and aggregates into daily price data.
 * - volume = sum of all quantities for the day
 * - turnover = sum of (price * quantity) for each transaction
 * - closePrice = price of the last transaction of the day
 */
export function buildPriceHistory(trades: PostTradeTransaction[]): PortfolioDailyPrice[] {
  // Group transactions by date
  const byDate = new Map<string, PostTradeTransaction[]>();

  for (const tx of trades) {
    const date = parseIsoDate(tx.tradingDateTime);
    if (!date) continue;

    const existing = byDate.get(date) ?? [];
    existing.push(tx);
    byDate.set(date, existing);
  }

  // Aggregate each day
  const dailyPrices: PortfolioDailyPrice[] = [];

  for (const [date, dayTransactions] of byDate) {
    // Sort by timestamp to find the last transaction
    const sorted = dayTransactions.sort((a, b) =>
      a.tradingDateTime.localeCompare(b.tradingDateTime),
    );

    const volume = dayTransactions.reduce((sum, tx) => sum + tx.quantity, 0);
    const turnover = dayTransactions.reduce((sum, tx) => sum + tx.price * tx.quantity, 0);
    const lastTransaction = sorted.at(-1);
    const closePrice = lastTransaction?.price ?? 0;

    dailyPrices.push({
      closePrice,
      date,
      turnover,
      volume,
    });
  }

  // Sort by date descending (most recent first)
  return dailyPrices.sort((a, b) => b.date.localeCompare(a.date));
}
