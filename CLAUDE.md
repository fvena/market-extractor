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
npm run start        # Build and run dist/index.js
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
