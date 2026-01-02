import type { MarketDefinition, MarketId } from "./types";
import { bmeContinuo } from "./bme/continuo";
import { bmeGrowth } from "./bme/growth";
import { bmeScaleup } from "./bme/scaleup";
import { euronextAccess } from "./euronext/access";
import { euronextExpand } from "./euronext/expand";
import { euronextGrowth } from "./euronext/growth";
import { euronextRegulated } from "./euronext/regulated";
import { portfolio } from "./portfolio";

/**
 * Registry of all available markets
 * Order determines display order in CLI menus
 */
export const markets: MarketDefinition[] = [
  bmeContinuo,
  bmeGrowth,
  bmeScaleup,
  euronextAccess,
  euronextExpand,
  euronextGrowth,
  euronextRegulated,
  portfolio,
];

/**
 * Get market definition by ID
 */
export function getMarket(id: MarketId): MarketDefinition | undefined {
  return markets.find((m) => m.id === id);
}

/**
 * Get all market IDs
 */
export function getMarketIds(): MarketId[] {
  return markets.map((m) => m.id);
}

/**
 * Get markets that have a specific feature implemented
 */
export function getImplementedMarkets(
  feature: keyof MarketDefinition["implemented"],
): MarketDefinition[] {
  return markets.filter((m) => m.implemented[feature]);
}
