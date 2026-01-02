import type { MarketDefinition } from "../types";

export const bmeGrowth: MarketDefinition = {
  family: "bme",
  id: "bme-growth",
  implemented: {
    details: false,
    listings: true,
    processing: false,
  },
  name: "BME Growth",
  slug: "bme-growth",
  urls: {
    base: "https://www.bmegrowth.es",
    listings: "https://www.bmegrowth.es/esp/Listado.aspx",
  },
};
