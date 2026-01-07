import type { MarketDefinition } from "../types";

export const bmeGrowth: MarketDefinition = {
  family: "bme",
  id: "bme-growth",
  implemented: {
    details: true,
    listings: true,
    processing: false,
  },
  name: "BME Growth",
  slug: "bme-growth",
  urls: {
    base: "https://www.bmegrowth.es",
    corporateActions: "https://www.bmegrowth.es/esp/OperFinancieras.aspx",
    listings: "https://www.bmegrowth.es/esp/Listado.aspx",
  },
};
