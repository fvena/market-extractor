import type { MarketId, UnifiedSector, UnifiedSubsector } from "../../types/types";

/**
 * Normalization of sectors for financial markets
 *
 * Function that unifies the sector/subsector/supersector fields of different markets
 * into a common taxonomy of two levels: sector (high level) and subsector (granular).
 */

// ============================================================================
// RESULT OF THE NORMALIZATION
// ============================================================================

export interface NormalizedSector {
  sector: UnifiedSector;
  subsector: UnifiedSubsector;
}

// ============================================================================
// MAPEOS INTERNOS
// ============================================================================

type SectorSubsectorPair = [UnifiedSector, UnifiedSubsector];

// Mapping of BME subsectors (and sectors of BME Growth/ScaleUp) to unified taxonomy
const BME_MAP: Record<string, SectorSubsectorPair> = {
  // Industrial
  Aerospacial: ["Industrial Goods and Services", "Aerospace and Defense"],

  // Utilities
  "Agua y Otros": ["Utilities", "Water"],

  // Food and Beverages
  "Alimentación y Bebidas": ["Food and Beverages", "Food Producers"],
  // Automóvil
  Automóvil: ["Automobiles and Parts", "Automobiles"],

  // Bancos
  "Bancos y Cajas de Ahorro": ["Banks", "Banks"],

  "Cartera y Holding": ["Financial Services", "Holding Companies"],
  // Retail
  Comercio: ["Retail", "General Retail"],

  // Construction
  Construcción: ["Construction and Materials", "Construction"],
  "Electricidad y Gas": ["Utilities", "Electricity"],
  // Technology
  "Electrónica y Software": ["Technology", "Software"],

  "Energías Renovables": ["Energy", "Renewable Energy"],
  "Fabric. y Montaje Bienes de Equipo": ["Industrial Goods and Services", "Industrial Equipment"],

  // Chemicals
  "Industria Química": ["Chemicals", "Chemicals"],
  "Ingeniería y Otros": ["Construction and Materials", "Engineering and Contracting"],

  // Real Estate
  "Inmobiliarias y Otros": ["Real Estate", "Real Estate Development"],

  // Media
  "Medios de Comunicación y Publicidad": ["Media", "Broadcasting"],

  // Basic Resources
  "Mineral, Metales y Transformación": ["Basic Resources", "Metals"],
  // Travel and Leisure
  "Ocio, Turismo y Hostelería": ["Travel and Leisure", "Hotels and Lodging"],
  "Otros Bienes de Consumo": ["Consumer Products and Services", "Consumer Services"],

  "Otros Servicios": ["Consumer Products and Services", "Consumer Services"],

  "Papel y Artes Gráficas": ["Basic Resources", "Forestry and Paper"],

  // Energy
  Petróleo: ["Energy", "Oil and Gas"],
  // Health Care
  "Productos farmaceúticos y Biotecnología": ["Health Care", "Biotechnology"],

  // Insurance
  Seguros: ["Insurance", "Non-life Insurance"],

  // Financial Services
  "Servicios de Inversión": ["Financial Services", "Investment Services"],

  SOCIMI: ["Real Estate", "SOCIMI"],

  // Telecommunications
  "Telecomunicaciones y Otros": ["Telecommunications", "Telecom Services"],

  // Consumer Products
  "Textil, Calzado, Cosmética y Fragancias": ["Consumer Products and Services", "Personal Goods"],
  "Transporte y Distribución": ["Industrial Goods and Services", "Industrial Transportation"],
};

// Mapping of Euronext subsectors to unified taxonomy
const EURONEXT_SUBSECTOR_MAP: Record<string, SectorSubsectorPair> = {
  // Industrial Goods and Services
  Aerospace: ["Industrial Goods and Services", "Aerospace and Defense"],
  // Travel and Leisure
  Airlines: ["Travel and Leisure", "Airlines"],
  "Alternative Electricity": ["Energy", "Renewable Energy"],
  "Alternative Fuels": ["Energy", "Renewable Energy"],
  Aluminum: ["Basic Resources", "Metals"],

  "Apparel Retailers": ["Retail", "Specialty Retail"],

  "Asset Managers and Custodians": ["Financial Services", "Asset Management"],
  // Automobiles and Parts
  Automobiles: ["Automobiles and Parts", "Automobiles"],
  "Auto Parts": ["Automobiles and Parts", "Auto Parts"],
  "Auto Services": ["Automobiles and Parts", "Auto Services"],
  // Banks
  Banks: ["Banks", "Banks"],
  Biotechnology: ["Health Care", "Biotechnology"],
  Brewers: ["Food and Beverages", "Beverages"],
  Building: ["Construction and Materials", "Construction"],

  "Building: Climate Control": ["Construction and Materials", "Building Materials"],
  "Building Materials: Other": ["Construction and Materials", "Building Materials"],
  "Business Training and Employment Agencies": [
    "Industrial Goods and Services",
    "Business Support Services",
  ],
  "Cable Television Services": ["Media", "Broadcasting"],
  "Casinos and Gambling": ["Travel and Leisure", "Leisure and Recreation"],

  Cement: ["Construction and Materials", "Building Materials"],
  // Chemicals
  "Chemicals: Diversified": ["Chemicals", "Chemicals"],
  "Chemicals and Synthetic Fibers": ["Chemicals", "Chemicals"],
  "Closed End Investments": ["Financial Services", "Closed End Investments"],
  "Clothing and Accessories": ["Consumer Products and Services", "Personal Goods"],
  "Commercial Vehicles and Parts": ["Automobiles and Parts", "Auto Parts"],
  "Computer Hardware": ["Technology", "Hardware"],

  "Computer Services": ["Technology", "IT Services"],
  // Construction and Materials
  Construction: ["Construction and Materials", "Construction"],
  "Consumer Digital Services": ["Consumer Products and Services", "Consumer Services"],
  "Consumer Electronics": ["Consumer Products and Services", "Consumer Electronics"],
  "Consumer Lending": ["Financial Services", "Financial Technology"],
  "Consumer Services: Misc.": ["Consumer Products and Services", "Consumer Services"],
  "Containers and Packaging": ["Industrial Goods and Services", "Diversified Industrials"],
  // Utilities
  "Conventional Electricity": ["Utilities", "Electricity"],
  Cosmetics: ["Consumer Products and Services", "Personal Goods"],
  Defense: ["Industrial Goods and Services", "Aerospace and Defense"],
  "Delivery Services": ["Industrial Goods and Services", "Industrial Transportation"],
  "Distillers and Vintners": ["Food and Beverages", "Beverages"],
  "Diversified Financial Services": ["Financial Services", "Investment Services"],
  "Diversified Industrials": ["Industrial Goods and Services", "Diversified Industrials"],
  "Diversified REITs": ["Real Estate", "REITs"],
  // Retail
  "Diversified Retailers": ["Retail", "General Retail"],
  "Drug Retailers": ["Retail", "Specialty Retail"],

  "Education Services": ["Consumer Products and Services", "Education Services"],
  "Electrical Components": ["Industrial Goods and Services", "Industrial Equipment"],
  "Electronic Components": ["Industrial Goods and Services", "Industrial Equipment"],
  "Electronic Entertainment": ["Media", "Entertainment"],
  "Electronic Equipment: Control and Filter": [
    "Industrial Goods and Services",
    "Industrial Equipment",
  ],
  "Electronic Equipment: Gauges and Meters": [
    "Industrial Goods and Services",
    "Industrial Equipment",
  ],
  "Electronic Equipment: Other": ["Industrial Goods and Services", "Industrial Equipment"],
  "Electronic Equipment: Pollution Control": [
    "Industrial Goods and Services",
    "Industrial Equipment",
  ],
  "Electronic Office Equipment": ["Technology", "Hardware"],

  "Engineering and Contracting Services": [
    "Construction and Materials",
    "Engineering and Contracting",
  ],
  Entertainment: ["Media", "Entertainment"],
  Farming: ["Food and Beverages", "Food Producers"],
  Fertilizers: ["Chemicals", "Specialty Chemicals"],
  "Financial Data Providers": ["Financial Services", "Financial Technology"],
  // Food and Beverages
  "Food Products": ["Food and Beverages", "Food Producers"],
  "Food Retailers and Wholesalers": ["Food and Beverages", "Food Retail"],
  Footwear: ["Consumer Products and Services", "Personal Goods"],
  Forestry: ["Basic Resources", "Forestry and Paper"],

  "Forms and Bulk Printing Services": [
    "Industrial Goods and Services",
    "Business Support Services",
  ],
  "Fruit and Grain Processing": ["Food and Beverages", "Food Producers"],
  "Full Line Insurance": ["Insurance", "Non-life Insurance"],
  "Gas Distribution": ["Utilities", "Gas Utilities"],
  // Basic Resources
  "General Mining": ["Basic Resources", "Mining"],
  "Gold Mining": ["Basic Resources", "Mining"],
  "Health Care: Misc.": ["Health Care", "Health Care Services"],
  "Health Care Facilities": ["Health Care", "Health Care Services"],

  "Health Care REITs": ["Real Estate", "REITs"],
  "Health Care Services": ["Health Care", "Health Care Services"],
  "Home Construction": ["Construction and Materials", "Construction"],
  "Home Improvement Retailers": ["Retail", "Specialty Retail"],
  "Hotel and Lodging REITs": ["Real Estate", "REITs"],
  "Hotels and Motels": ["Travel and Leisure", "Hotels and Lodging"],
  // Consumer Products and Services
  "Household Appliance": ["Consumer Products and Services", "Household Goods"],
  "Household Equipment and Products": ["Consumer Products and Services", "Household Goods"],

  "Household Furnishings": ["Consumer Products and Services", "Household Goods"],
  "Industrial REITs": ["Real Estate", "REITs"],
  "Industrial Suppliers": ["Industrial Goods and Services", "Industrial Equipment"],
  "Insurance Brokers": ["Insurance", "Insurance Brokers"],
  // Energy
  "Integrated Oil and Gas": ["Energy", "Oil and Gas"],
  // Financial Services
  "Investment Services": ["Financial Services", "Investment Services"],
  "Iron and Steel": ["Basic Resources", "Metals"],
  // Insurance
  "Life Insurance": ["Insurance", "Life Insurance"],
  "Luxury Items": ["Consumer Products and Services", "Personal Goods"],
  "Machinery: Agricultural": ["Industrial Goods and Services", "Industrial Engineering"],
  "Machinery: Construction and Handling": [
    "Industrial Goods and Services",
    "Industrial Engineering",
  ],
  "Machinery: Engines": ["Industrial Goods and Services", "Industrial Engineering"],
  "Machinery: Industrial": ["Industrial Goods and Services", "Industrial Engineering"],
  "Machinery: Specialty": ["Industrial Goods and Services", "Industrial Engineering"],
  "Marine Transportation": ["Industrial Goods and Services", "Industrial Transportation"],
  "Media Agencies": ["Media", "Advertising"],
  "Medical Equipment": ["Health Care", "Medical Equipment"],
  "Medical Services": ["Health Care", "Health Care Services"],
  "Medical Supplies": ["Health Care", "Medical Equipment"],
  "Metal Fabricating": ["Basic Resources", "Metals"],
  "Miscellaneous Consumer Staple Goods": ["Food and Beverages", "Food Producers"],
  "Mortgage Finance": ["Financial Services", "Financial Technology"],
  "Multi-utilities": ["Utilities", "Multi-utilities"],
  "Nondurable Household Products": ["Consumer Products and Services", "Household Goods"],
  "Nonferrous Metals": ["Basic Resources", "Metals"],
  "Office REITs": ["Real Estate", "REITs"],
  "Offshore Drilling and Other Services": ["Energy", "Oil Equipment and Services"],

  "Oil: Crude Producers": ["Energy", "Oil and Gas"],
  "Oil Equipment and Services": ["Energy", "Oil Equipment and Services"],
  "Oil Refining and Marketing": ["Energy", "Oil and Gas"],
  "Open End and Miscellaneous Investment Vehicles": [
    "Financial Services",
    "Closed End Investments",
  ],
  Paper: ["Basic Resources", "Forestry and Paper"],

  "Personal Products": ["Consumer Products and Services", "Personal Goods"],
  // Health Care
  Pharmaceuticals: ["Health Care", "Pharmaceuticals"],
  Photography: ["Consumer Products and Services", "Consumer Electronics"],
  Pipelines: ["Energy", "Oil and Gas"],
  Plastics: ["Chemicals", "Specialty Chemicals"],
  "Production Technology Equipment": ["Industrial Goods and Services", "Industrial Equipment"],

  "Professional Business Support Services": [
    "Industrial Goods and Services",
    "Business Support Services",
  ],
  "Property and Casualty Insurance": ["Insurance", "Non-life Insurance"],
  Publishing: ["Media", "Publishing"],
  // Media
  "Radio and TV Broadcasters": ["Media", "Broadcasting"],
  "Railroad Equipment": ["Industrial Goods and Services", "Industrial Transportation"],
  Railroads: ["Industrial Goods and Services", "Industrial Transportation"],
  // Real Estate
  "Real Estate Holding and Development": ["Real Estate", "Real Estate Development"],
  "Real Estate Services": ["Real Estate", "Real Estate Services"],
  "Recreational Products": ["Consumer Products and Services", "Consumer Services"],
  "Recreational Services": ["Travel and Leisure", "Leisure and Recreation"],

  "Recreational Vehicles and Boats": ["Consumer Products and Services", "Consumer Services"],
  Reinsurance: ["Insurance", "Reinsurance"],
  "Renewable Energy Equipment": ["Energy", "Renewable Energy"],
  "Rental and Leasing Services: Consumer": [
    "Industrial Goods and Services",
    "Business Support Services",
  ],
  "Residential REITs": ["Real Estate", "REITs"],

  "Restaurants and Bars": ["Travel and Leisure", "Restaurants"],
  "Retail REITs": ["Real Estate", "REITs"],
  Semiconductors: ["Technology", "Semiconductors"],
  "Soft Drinks": ["Food and Beverages", "Beverages"],
  // Technology
  Software: ["Technology", "Software"],

  "Specialty Chemicals": ["Chemicals", "Specialty Chemicals"],
  "Specialty Retailers": ["Retail", "Specialty Retail"],

  "Storage REITs": ["Real Estate", "REITs"],
  "Telecommunications Equipment": ["Telecommunications", "Telecom Equipment"],
  // Telecommunications
  "Telecommunications Services": ["Telecommunications", "Telecom Services"],
  Tires: ["Automobiles and Parts", "Auto Parts"],
  Toys: ["Consumer Products and Services", "Consumer Services"],
  "Transaction Processing Services": ["Financial Services", "Financial Technology"],
  "Transportation Services": ["Industrial Goods and Services", "Industrial Transportation"],

  "Travel and Tourism": ["Travel and Leisure", "Travel Services"],
  Trucking: ["Industrial Goods and Services", "Industrial Transportation"],
  "Vending and Catering Service": ["Travel and Leisure", "Restaurants"],
  "Waste and Disposal Services": ["Utilities", "Waste Management"],
  Water: ["Utilities", "Water"],
};

// Mapping of Euronext supersectors (fallback when there is no subsector)
const EURONEXT_SUPERSECTOR_MAP: Record<string, SectorSubsectorPair> = {
  "Automobiles and Parts": ["Automobiles and Parts", "Automobiles"],
  Banks: ["Banks", "Banks"],
  "Basic Resources": ["Basic Resources", "Mining"],
  Chemicals: ["Chemicals", "Chemicals"],
  "Construction and Materials": ["Construction and Materials", "Construction"],
  "Consumer Products and Services": ["Consumer Products and Services", "Consumer Services"],
  Energy: ["Energy", "Oil and Gas"],
  "Financial Services": ["Financial Services", "Investment Services"],
  Food: ["Food and Beverages", "Food Producers"],
  "Health Care": ["Health Care", "Health Care Services"],
  "Industrial Goods and Services": ["Industrial Goods and Services", "Diversified Industrials"],
  Insurance: ["Insurance", "Non-life Insurance"],
  Media: ["Media", "Entertainment"],
  "Personal Care": ["Consumer Products and Services", "Personal Goods"],
  "Real Estate": ["Real Estate", "Real Estate Development"],
  Retail: ["Retail", "General Retail"],
  Technology: ["Technology", "Software"],
  Telecommunications: ["Telecommunications", "Telecom Services"],
  "Travel and Leisure": ["Travel and Leisure", "Leisure and Recreation"],
  Utilities: ["Utilities", "Electricity"],
};

// Mapping of Euronext sectors (medium level, fallback)
const EURONEXT_SECTOR_MAP: Record<string, SectorSubsectorPair> = {
  "Aerospace and Defense": ["Industrial Goods and Services", "Aerospace and Defense"],
  "Alternative Energy": ["Energy", "Renewable Energy"],
  "Automobiles and Parts": ["Automobiles and Parts", "Automobiles"],
  Banks: ["Banks", "Banks"],
  Beverages: ["Food and Beverages", "Beverages"],
  Chemicals: ["Chemicals", "Chemicals"],
  "Closed End Investments": ["Financial Services", "Closed End Investments"],
  "Construction and Materials": ["Construction and Materials", "Construction"],
  "Consumer Services": ["Consumer Products and Services", "Consumer Services"],
  Electricity: ["Utilities", "Electricity"],
  "Electronic and Electrical Equipment": ["Industrial Goods and Services", "Industrial Equipment"],
  "Finance and Credit Services": ["Financial Services", "Financial Technology"],
  "Food Producers": ["Food and Beverages", "Food Producers"],
  Gas: ["Utilities", "Gas Utilities"],
  "General Industrials": ["Industrial Goods and Services", "Diversified Industrials"],
  "Health Care Providers": ["Health Care", "Health Care Services"],
  "Household Goods and Home Construction": ["Consumer Products and Services", "Household Goods"],
  "Industrial Engineering": ["Industrial Goods and Services", "Industrial Engineering"],
  "Industrial Materials": ["Basic Resources", "Metals"],
  "Industrial Metals and Mining": ["Basic Resources", "Metals"],
  "Industrial Support Services": ["Industrial Goods and Services", "Business Support Services"],
  "Industrial Transportation": ["Industrial Goods and Services", "Industrial Transportation"],
  "Investment Banking and Brokerage Services": ["Financial Services", "Investment Services"],
  "Leisure Goods": ["Consumer Products and Services", "Consumer Services"],
  "Life Insurance": ["Insurance", "Life Insurance"],
  Media: ["Media", "Entertainment"],
  "Medical Equipment and Services": ["Health Care", "Medical Equipment"],
  "Non-life Insurance": ["Insurance", "Non-life Insurance"],
  Oil: ["Energy", "Oil and Gas"],
  "Open End and Miscellaneous Investment Vehicles": [
    "Financial Services",
    "Closed End Investments",
  ],
  "Personal Care": ["Consumer Products and Services", "Personal Goods"],
  "Personal Goods": ["Consumer Products and Services", "Personal Goods"],
  "Pharmaceuticals and Biotechnology": ["Health Care", "Biotechnology"],
  "Precious Metals and Mining": ["Basic Resources", "Mining"],
  "Real Estate Investment and Services": ["Real Estate", "Real Estate Services"],
  "Real Estate Investment Trusts": ["Real Estate", "REITs"],
  Retailers: ["Retail", "General Retail"],
  "Software and Computer Services": ["Technology", "Software"],
  "Technology Hardware and Equipment": ["Technology", "Hardware"],
  "Telecommunications Equipment": ["Telecommunications", "Telecom Equipment"],
  "Telecommunications Service Providers": ["Telecommunications", "Telecom Services"],
  "Travel and Leisure": ["Travel and Leisure", "Leisure and Recreation"],
  "Waste and Disposal Services": ["Utilities", "Waste Management"],
};

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Normalizes the sector of a company according to its market of origin.
 *
 * @param marketId - Market identifier
 * @param sector - Original sector (optional)
 * @param subsector - Original subsector (optional)
 * @param supersector - Original supersector (optional, only Euronext)
 * @returns Object with normalized sector and subsector
 */
export function normalizeSector(
  marketId: MarketId,
  sector?: string,
  subsector?: string,
  supersector?: string,
): NormalizedSector {
  const defaultResult: NormalizedSector = { sector: "Other", subsector: "Other" };

  // --- PORTFOLIO ---
  if (marketId === "portfolio") {
    if (sector === "SOCIMI") {
      return { sector: "Real Estate", subsector: "SOCIMI" };
    }
    return defaultResult;
  }

  // --- BME MARKETS ---
  if (marketId.startsWith("bme-")) {
    // Caso especial: SOCIMI siempre es Real Estate > SOCIMI
    if (sector === "SOCIMI" || subsector === "SOCIMI") {
      return { sector: "Real Estate", subsector: "SOCIMI" };
    }

    // BME Continuo: use subsector (more specific)
    if (marketId === "bme-continuo" && subsector && BME_MAP[subsector]) {
      const [s, ss] = BME_MAP[subsector];
      return { sector: s, subsector: ss };
    }

    // BME Growth/ScaleUp: the "sector" field acts as subsector
    if (sector && BME_MAP[sector]) {
      const [s, ss] = BME_MAP[sector];
      return { sector: s, subsector: ss };
    }

    return defaultResult;
  }

  // --- MERCADOS EURONEXT ---
  if (marketId.startsWith("euronext-")) {
    // Priority 1: subsector (more specific)
    if (subsector && EURONEXT_SUBSECTOR_MAP[subsector]) {
      const [s, ss] = EURONEXT_SUBSECTOR_MAP[subsector];
      return { sector: s, subsector: ss };
    }

    // Priority 2: sector (medium level)
    if (sector && EURONEXT_SECTOR_MAP[sector]) {
      const [s, ss] = EURONEXT_SECTOR_MAP[sector];
      return { sector: s, subsector: ss };
    }

    // Priority 3: supersector (high level)
    if (supersector && EURONEXT_SUPERSECTOR_MAP[supersector]) {
      const [s, ss] = EURONEXT_SUPERSECTOR_MAP[supersector];
      return { sector: s, subsector: ss };
    }

    return defaultResult;
  }

  return defaultResult;
}
