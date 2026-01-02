import type { MarketDefinition } from "../types";

export const bmeScaleup: MarketDefinition = {
  family: "bme",
  id: "bme-scaleup",
  implemented: {
    details: false,
    listings: false,
    processing: false,
  },
  name: "BME ScaleUp",
  slug: "bme-scaleup",
  urls: {
    base: "https://www.bmescaleup.es",
    listings: "https://www.bmescaleup.es/ing/Companies/Listed-Companies",
  },
};
