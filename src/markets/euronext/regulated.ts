import type { MarketDefinition } from "../types";

export const euronextRegulated: MarketDefinition = {
  family: "euronext",
  id: "euronext-regulated",
  implemented: {
    details: false,
    listings: true,
    processing: false,
  },
  name: "Euronext Regulated",
  slug: "euronext-regulated",
  urls: {
    base: "https://live.euronext.com",
    listings: "https://live.euronext.com/en/products/equities/regulated/list",
  },
};
