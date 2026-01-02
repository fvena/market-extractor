import type { MarketDefinition } from "../types";

export const bmeScaleup: MarketDefinition = {
  family: "bme",
  id: "bme-scaleup",
  implemented: {
    details: false,
    listings: true,
    processing: false,
  },
  name: "BME ScaleUp",
  slug: "bme-scaleup",
  urls: {
    base: "https://www.bolsasymercados.es",
    listings: "https://www.bolsasymercados.es/MTF_Equity/bme-scaleup/esp/Listado.aspx",
  },
};
