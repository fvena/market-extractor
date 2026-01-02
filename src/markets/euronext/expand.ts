import type { MarketDefinition } from "../types";

export const euronextExpand: MarketDefinition = {
  family: "euronext",
  id: "euronext-expand",
  implemented: {
    details: false,
    listings: false,
    processing: false,
  },
  name: "Euronext Expand",
  slug: "euronext-expand",
  urls: {
    base: "https://live.euronext.com",
    listings: "https://live.euronext.com/en/markets/expand",
  },
};
