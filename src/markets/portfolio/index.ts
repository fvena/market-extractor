import type { MarketDefinition } from "../types";

export const portfolio: MarketDefinition = {
  family: "portfolio",
  id: "portfolio",
  implemented: {
    details: false,
    listings: false,
    processing: false,
  },
  name: "Portfolio Stock Exchange",
  slug: "portfolio",
  urls: {
    base: "https://www.portfoliostockexchange.com",
    listings: "https://www.portfoliostockexchange.com/companies",
  },
};
