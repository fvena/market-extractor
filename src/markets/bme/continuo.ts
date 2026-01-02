import type { MarketDefinition } from "../types";

export const bmeContinuo: MarketDefinition = {
  family: "bme",
  id: "bme-continuo",
  implemented: {
    details: false,
    listings: false,
    processing: false,
  },
  name: "BME Continuo",
  slug: "bme-continuo",
  urls: {
    base: "https://www.bolsasymercados.es",
    listings:
      "https://www.bolsasymercados.es/bme-exchange/es/Mercados-y-Cotizaciones/Acciones/Mercado-Continuo/Precios",
  },
};
