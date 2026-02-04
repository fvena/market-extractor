import type { MarketDefinition, MarketId } from "./types/types";

// ============================================
// BME
// ============================================

export const bmeContinuo: MarketDefinition = {
  family: "bme",
  id: "bme-continuo",
  name: "BME Continuo",
  slug: "bme-continuo",
  urls: {
    api: "https://apiweb.bolsasymercados.es/Market/v1/EQ",
    base: "https://www.bolsasymercados.es",
    corporateActions: "https://apiweb.bolsasymercados.es/Market/v1/EQ/CorporateActions",
    listings:
      "https://www.bolsasymercados.es/bme-exchange/es/Mercados-y-Cotizaciones/Acciones/Mercado-Continuo/Empresas-Cotizadas",
  },
};

export const bmeGrowth: MarketDefinition = {
  family: "bme",
  id: "bme-growth",
  name: "BME Growth",
  slug: "bme-growth",
  urls: {
    base: "https://www.bmegrowth.es",
    corporateActions: "https://www.bmegrowth.es/esp/OperFinancieras.aspx",
    listings: "https://www.bmegrowth.es/esp/Listado.aspx",
  },
};

export const bmeScaleup: MarketDefinition = {
  family: "bme",
  id: "bme-scaleup",
  name: "BME ScaleUp",
  slug: "bme-scaleup",
  urls: {
    base: "https://www.bolsasymercados.es",
    corporateActions:
      "https://www.bolsasymercados.es/MTF_Equity/bme-scaleup/esp/OperFinancieras.aspx",
    listings: "https://www.bolsasymercados.es/MTF_Equity/bme-scaleup/esp/Listado.aspx",
  },
};

// ============================================
// Euronext
// ============================================

export const euronextAccess: MarketDefinition = {
  family: "euronext",
  id: "euronext-access",
  name: "Euronext Access",
  slug: "euronext-access",
  urls: {
    base: "https://live.euronext.com",
    listings: "https://live.euronext.com/en/products/equities/access/list",
  },
};

export const euronextExpand: MarketDefinition = {
  family: "euronext",
  id: "euronext-expand",
  name: "Euronext Expand",
  slug: "euronext-expand",
  urls: {
    base: "https://live.euronext.com",
    listings: "https://live.euronext.com/en/products/equities/expand/list",
  },
};

export const euronextGrowth: MarketDefinition = {
  family: "euronext",
  id: "euronext-growth",
  name: "Euronext Growth",
  slug: "euronext-growth",
  urls: {
    base: "https://live.euronext.com",
    listings: "https://live.euronext.com/en/products/equities/growth/list",
  },
};

export const euronextRegulated: MarketDefinition = {
  family: "euronext",
  id: "euronext-regulated",
  name: "Euronext Regulated",
  slug: "euronext-regulated",
  urls: {
    base: "https://live.euronext.com",
    listings: "https://live.euronext.com/en/products/equities/regulated/list",
  },
};

// ============================================
// Portfolio
// ============================================

export const portfolio: MarketDefinition = {
  family: "portfolio",
  id: "portfolio",
  name: "Portfolio",
  slug: "portfolio",
  urls: {
    base: "https://api.portfolio.exchange/open/market",
    listings: "https://api.portfolio.exchange/open/market?page=0&size=100&entityType=EQUITY",
  },
};

// ============================================
// Registry
// ============================================

export const MARKETS: Record<MarketId, MarketDefinition> = {
  "bme-continuo": bmeContinuo,
  "bme-growth": bmeGrowth,
  "bme-scaleup": bmeScaleup,
  "euronext-access": euronextAccess,
  "euronext-expand": euronextExpand,
  "euronext-growth": euronextGrowth,
  "euronext-regulated": euronextRegulated,
  portfolio: portfolio,
};

export const marketIds = Object.keys(MARKETS) as MarketId[];
