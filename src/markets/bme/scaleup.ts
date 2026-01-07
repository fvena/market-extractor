import type { MarketDefinition } from "../types";

export const bmeScaleup: MarketDefinition = {
  family: "bme",
  id: "bme-scaleup",
  implemented: {
    details: true,
    listings: true,
    processing: false,
  },
  name: "BME ScaleUp",
  slug: "bme-scaleup",
  urls: {
    base: "https://www.bolsasymercados.es",
    corporateActions:
      "https://www.bolsasymercados.es/MTF_Equity/bme-scaleup/esp/OperFinancieras.aspx",
    listings: "https://www.bolsasymercados.es/MTF_Equity/bme-scaleup/esp/Listado.aspx",
  },
};
