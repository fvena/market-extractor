import type { MarketDefinition } from "../types";

export const euronextAccess: MarketDefinition = {
  family: "euronext",
  id: "euronext-access",
  implemented: {
    details: false,
    listings: true,
    processing: false,
  },
  name: "Euronext Access",
  slug: "euronext-access",
  urls: {
    base: "https://live.euronext.com",
    listings: "https://live.euronext.com/en/products/equities/access/list",
  },
};
