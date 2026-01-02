# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

market-extractor is a TypeScript library for scraping and aggregating data from global stock markets. The project is in early development (v0.1.0).

## Development Commands

```bash
npm run dev          # Development with hot reload (tsup --watch)
npm run build        # Build for production (creates dist/)
npm run typecheck    # Type checking
npm run lint         # Linting with ESLint
npm run format       # Code formatting with Prettier
npm start            # Run the CLI interactively
```

## Architecture

- **Entry Point**: `src/index.ts` - Main module exports
- **Utilities**: `src/utilities.ts` - Core library functions
- **Build Output**: `dist/` - ESM output with TypeScript declarations

## Build Configuration

- **Tsup**: Configured in `tsup.config.ts` for ESM format with neutral platform targeting
- **Output**: Minified `.js`, `.d.ts` files with source maps
- **Tree shaking**: Enabled for optimal bundle size

## Code Quality

- **TypeScript**: Extends `personal-style-guide/typescript/browser`
- **ESLint**: Uses `personal-style-guide/eslint/browser` ruleset
- **Prettier**: Auto-formatting via lint-staged on commit
- **Commitlint**: Conventional commits with relaxed body length rules
- **Husky**: Pre-commit hooks for quality checks

## Requirements

- Node.js >= 22.11.0

## CLI Actions

1. **Fetch listings** - Download product listings from selected markets
2. **Fetch details** - Download detailed product data (requires listings first)
3. **Generate report** - Process data and create Excel report (requires details first)
4. **Fetch single product** - Get details for one specific product
5. **Run all** - Execute complete pipeline (listings → details → report)
6. **Clean** - Remove all generated output files

## Output Structure

```
output/
├── listings/
│   ├── bme-continuo.json
│   ├── bme-growth.json
│   ├── bme-scaleup.json
│   ├── euronext-access.json
│   ├── euronext-expand.json
│   ├── euronext-growth.json
│   ├── euronext-regulated.json
│   └── portfolio.json
├── details/
│   └── {market-slug}.json
├── processed/
│   └── {market-slug}.json
└── report.xlsx
```

## Project Structure

```
src/
├── cli/                    # CLI implementation
│   ├── index.ts            # CLI entry point
│   ├── banner.ts           # Figlet banner display
│   ├── prompts.ts          # Menu prompts and user interactions
│   ├── actions/            # CLI action handlers
│   └── utils/              # Timer, logger, progress utilities
├── markets/                # Market definitions
│   ├── types.ts            # Market interfaces and types
│   ├── registry.ts         # Market registry
│   ├── bme/                # BME markets (Continuo, Growth, ScaleUp)
│   ├── euronext/           # Euronext markets (Access, Expand, Growth, Regulated)
│   └── portfolio/          # Portfolio Stock Exchange
├── storage/                # JSON file operations
├── helpers/                # Data transformation utilities (future)
├── scrapers/               # Scraping logic (future)
├── config.ts               # Project configuration
├── index.ts                # Library exports
└── utilities.ts            # Core utilities
```
