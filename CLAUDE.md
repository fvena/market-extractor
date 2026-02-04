# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

market-extractor is a TypeScript library and CLI for scraping stock market data from BME (Spanish markets), Euronext, and Portfolio Stock Exchange. It fetches listings, extracts product details, and generates Excel reports.

## Development Commands

```bash
npm run dev          # Development with hot reload (tsup --watch)
npm run build        # Build for production (creates dist/)
npm run typecheck    # Type checking
npm run lint         # Linting with ESLint
npm run format       # Code formatting with Prettier
npm start            # Run the CLI interactively
```

## Setup

```bash
npm install
npx playwright install chromium
```

## Architecture

### Data Pipeline

The system follows a three-stage pipeline, each with its own module:

1. **Listings** (`src/listings/`) → Fetch product lists from market websites
2. **Details** (`src/details/`) → Fetch detailed data for each product (including price history)
3. **Processing** (`src/processing/`) → Normalize data and generate reports

### Module Structure

Each pipeline stage follows a consistent pattern:

```
src/{stage}/
├── {stage}.ts              # Entry point with fetchMarket{Stage}() function
├── fetchers/               # Data acquisition (HTTP/browser)
│   └── {family}-{stage}-fetcher.ts
└── parsers/                # HTML/JSON extraction
    └── {family}-{stage}-parser.ts
```

### Entry Point Functions

Each module exports a main function that routes to the appropriate fetcher:

- `fetchMarketListing(marketId, onProgress)` → Routes to family-specific listing fetcher
- `fetchMarketDetails(marketId, isTestMode, onProgress)` → Routes to family-specific detail fetcher
- `processMarkets(details, marketId)` → Routes to family-specific processor

### Data Source Types

Markets use different data sources:

- **BME Continuo**: REST API (`apiweb.bolsasymercados.es`)
- **BME Growth/ScaleUp**: HTML scraping via Playwright (ASP.NET forms with ViewState)
- **Euronext**: Mixed HTML scraping + AJAX JSON endpoints
- **Portfolio**: REST API (`api.portfolio.exchange`)

### Market Registry (`src/markets.ts`)

All markets are defined in a single file with the `MARKETS` record:

```typescript
export const MARKETS: Record<MarketId, MarketDefinition> = {
  "bme-continuo": bmeContinuo,
  "bme-growth": bmeGrowth,
  // ...
};
```

**To add a new market:**

1. Add market definition to `src/markets.ts`
2. Add market ID to `MarketId` type in `src/types/types.ts`
3. Add fetcher to `src/listings/fetchers/` and `src/details/fetchers/`
4. Add parser if HTML structure differs from existing family parsers
5. Register in the `MARKET_FETCH_*` records in the entry point files

### Type Hierarchy (`src/types/`)

```
BaseListing → BmeAlternativesListing | BmeContinuoListing | EuronextListing | PortfolioListing
BaseDetails → BmeAlternativesDetails | BmeContinuoDetails | EuronextDetails | PortfolioDetails
BaseProcessed → BmeAlternativesProcessed | BmeContinuoProcessed | EuronextProcessed | PortfolioProcessed
```

Types are organized by family:

- `types.ts` - Base types, union types, and shared interfaces
- `bme.types.ts` - BME-specific nested types (price history, corporate actions)
- `euronext.types.ts` - Euronext-specific nested types (IPO entries, notices)
- `portfolio.types.ts` - Portfolio-specific nested types

### Storage Layer (`src/helpers/storage.ts`)

JSON file operations with consistent paths:

- `output/listings/{market-slug}.json` - Raw listing data
- `output/details/{market-slug}.json` - Raw product details
- `output/details/{market-slug}-corporate-actions.json` - Corporate actions (BME)
- `output/processed/{market-slug}.json` - Normalized data
- `output/report.xlsx` - Final Excel report

### CLI Structure (`src/cli/`)

- `index.ts` - Main CLI entry point with action loop
- `prompts.ts` - User interaction with @clack/prompts
- `actions/` - Each CLI action in separate file (fetch-listings, fetch-details, etc.)
- `utils/` - Banner, timer, logger, progress spinner, summary utilities

### Helpers (`src/helpers/`)

- `browser.ts` - Playwright browser utilities (headless Chromium)
- `http.ts` - HTTP client with LRU caching, retry logic, and ethical scraping headers
- `html.ts` - HTML text cleaning utilities
- `parsing.ts` - Number/date parsing for European formats (e.g., `2.698.182,10` → `2698182.10`)
- `mic.ts` - ISO 10383 MIC code lookups for market names and countries
- `missing-fields.ts` - Required field validation with dot-notation support for nested paths
- `storage.ts` - JSON file I/O operations
- `fill-missing-fields-from-related.ts` - Cross-references related instruments to fill missing data

### Reference Data (`src/data/`)

- `ISO10383_MIC.csv` - Market Identifier Codes for exchange name/country resolution
- `ISO3166-1_alpha-2.csv` - Country code to name mapping

## Key Patterns

### Batch Result Pattern

All batch operations return a consistent result structure:

```typescript
interface BatchProductResult<T> {
  products: T[];
  productsWithError: ProductError[];
  productsWithMissingFields: ProductMissingFields[];
}
```

### Required Fields Validation

Each module defines required fields per market and validates results:

```typescript
const REQUIRED_FIELDS_BY_MARKET = {
  "bme-continuo": ["isin", "name", ...],
  "euronext-access": ["isin", "markets", ...],
  // ...
};
```

### Progress Callbacks

Long operations accept a unified callback:

```typescript
type ProgressCallback = (message: string, current?: number, total?: number) => void;
```

### HTTP Client Features

The `http.ts` module provides:

- **LRU Caching**: JSON (100 entries, 5 min TTL) and HTML (200 entries, 10 min TTL)
- **Ethical Headers**: Bot identification headers for transparency (`X-Bot-Name`, `X-Bot-Contact`)
- **Cookie Jar**: Session management for ASP.NET sites requiring ViewState
- **ASPX Token Extraction**: Parses `__VIEWSTATE`, `__VIEWSTATEGENERATOR`, `__EVENTVALIDATION`

## Configuration

`src/config.ts` contains:

- Output directory paths (`output/listings/`, `output/details/`, `output/processed/`)
- Request settings (timeout: 30s, retries: 3, delay: 1s between requests)
- `testModeLimit: 5` - Limits products fetched in test mode

## Supported Markets

| Market Family   | Markets                           | Data Source                      |
| --------------- | --------------------------------- | -------------------------------- |
| **BME** (Spain) | Continuo, Growth, ScaleUp         | REST API + ASP.NET HTML scraping |
| **Euronext**    | Access, Expand, Growth, Regulated | HTML scraping + AJAX JSON        |
| **Portfolio**   | Portfolio Stock Exchange          | REST API                         |

## European Number/Date Formats

The codebase handles European data formats throughout:

- Numbers: `2.698.182,10` (dot as thousands separator, comma as decimal)
- Dates: `DD/MM/YYYY` or `DD-MM-YYYY`

Use helpers from `src/helpers/parsing.ts` for conversions.
