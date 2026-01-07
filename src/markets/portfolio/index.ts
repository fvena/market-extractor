import type { MarketDefinition } from "../types";

export const portfolio: MarketDefinition = {
  family: "portfolio",
  id: "portfolio",
  implemented: {
    details: true,
    listings: true,
    processing: false,
  },
  name: "Portfolio Stock Exchange",
  slug: "portfolio",
  urls: {
    base: "https://api.portfolio.exchange",
    listings: "https://api.portfolio.exchange/open/market?page=0&size=100&entityType=EQUITY",
  },
};
