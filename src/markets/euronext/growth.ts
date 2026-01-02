import type { MarketDefinition } from "../types";

export const euronextGrowth: MarketDefinition = {
  family: "euronext",
  id: "euronext-growth",
  implemented: {
    details: false,
    listings: true,
    processing: false,
  },
  name: "Euronext Growth",
  slug: "euronext-growth",
  urls: {
    base: "https://live.euronext.com",
    listings: "https://live.euronext.com/en/products/equities/growth/list",
  },
};
