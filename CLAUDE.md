# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

market-extractor is a TypeScript library and CLI for scraping stock market data from BME (Spanish markets), Euronext, and Portfolio Stock Exchange. It fetches listings, extracts product details (including price history), and generates Excel reports.

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

The system follows a three-stage pipeline:

1. **Listings** → Fetch product lists from market websites
2. **Details** → Fetch detailed data for each product (including price history)
3. **Report** → Process and generate Excel output

### Scraping Layer (`src/scrapers/`)

Three-tier architecture:

- **clients/** - Browser (Playwright) and HTTP utilities for page navigation and API calls
- **parsers/** - HTML/DOM extraction logic per market family
- **fetchers/** - Orchestration: pagination, navigation, progress callbacks

Each market family (BME, Euronext, Portfolio) has its own fetcher that coordinates scraping.

### Data Source Types

Markets use different data sources:

- **BME Continuo**: REST API (no scraping needed) - Uses `apiweb.bolsasymercados.es` API
- **BME Growth/ScaleUp**: HTML scraping via Playwright (ASP.NET forms with ViewState)
- **Euronext**: Mixed HTML scraping + AJAX JSON endpoints
- **Portfolio**: REST API (no scraping needed)

### Market Registry (`src/markets/`)

Markets are defined declaratively with:

- `MarketDefinition` - URLs, slugs, implementation status flags (`listings`, `details`, `processing`)
- `MarketFamily` - Groups markets with similar scraping logic (bme, euronext, portfolio)
- Family-specific types extend `BaseListingItem` and `BaseProductDetails`

**To add a new market:**

1. Create definition file in appropriate family folder (e.g., `src/markets/bme/newmarket.ts`)
2. Export and add to `registry.ts` array
3. Implement fetcher in `scrapers/fetchers/{family}/`
4. Add parser in `scrapers/parsers/{family}/` if HTML structure differs
5. Update CLI action in `src/cli/actions/fetch-details.ts` to handle new market family

### Type Hierarchy

```
BaseListingItem → BmeListingItem | EuronextListingItem | PortfolioListingItem
BaseProductDetails → BmeProductDetails | EuronextProductDetails | PortfolioProductDetails
                   ↓
               ProcessedProduct (normalized output)
```

### Storage Layer (`src/storage/`)

JSON file operations with consistent paths:

- `output/listings/{market-slug}.json` - Raw listing data
- `output/details/{market-slug}.json` - Raw product details
- `output/details/{market-slug}-corporate-actions.json` - Corporate actions (BME)
- `output/processed/{market-slug}.json` - Normalized data
- `output/report.xlsx` - Final Excel report

### CLI Structure (`src/cli/`)

- `prompts.ts` - User interaction with @clack/prompts
- `actions/` - Each CLI action in separate file
- `utils/` - Timer, logger, progress spinner utilities

### Helpers (`src/helpers/`)

- `html.ts` - HTML text cleaning utilities
- `parsing.ts` - Number/date parsing for Spanish formats

## Configuration

`src/config.ts` contains:

- Output directory paths
- Request settings (timeout: 30s, retries: 3, delay: 1s between requests)
- `testModeLimit: 5` - Limits products fetched during development

## Key Patterns

### Detail Fetcher Result

Detail fetchers return a consistent result object:

```typescript
interface DetailResult {
  data?: Details;
  error?: string;
  fetchErrors?: string[]; // Non-fatal errors during fetch
  missingFields?: string[]; // Optional fields that were missing
  success: boolean;
}
```

### Progress Callbacks

Long operations accept callbacks for CLI progress updates:

```typescript
type ProgressCallback = (current: number, total: number, itemName: string) => void;
type DetailProgressCallback = (phase: string, detail?: string) => void;
```

### Implementation Status

Each market has `implemented` flags controlling which operations are available:

- `listings: boolean` - Can fetch product lists
- `details: boolean` - Can fetch individual product details
- `processing: boolean` - Can normalize to `ProcessedProduct`

Use `getImplementedMarkets('listings')` to filter markets by capability.

## Current Implementation Status

| Market             | Listings | Details | Processing |
| ------------------ | -------- | ------- | ---------- |
| BME Continuo       | ✅       | ✅      | ❌         |
| BME Growth         | ✅       | ✅      | ❌         |
| BME ScaleUp        | ✅       | ✅      | ❌         |
| Euronext Access    | ✅       | ✅      | ❌         |
| Euronext Expand    | ✅       | ✅      | ❌         |
| Euronext Growth    | ✅       | ✅      | ❌         |
| Euronext Regulated | ✅       | ✅      | ❌         |
| Portfolio          | ✅       | ✅      | ❌         |
