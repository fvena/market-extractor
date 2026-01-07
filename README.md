# market-extractor

CLI tool for scraping and aggregating data from European stock markets.

## Supported Markets

| Market Family   | Markets                           |
| --------------- | --------------------------------- |
| **BME** (Spain) | Continuo, Growth, ScaleUp         |
| **Euronext**    | Access, Expand, Growth, Regulated |
| **Portfolio**   | Portfolio Stock Exchange          |

## Features

- Fetch product listings from multiple markets
- Extract detailed product information (ISIN, ticker, sector, market cap, etc.)
- Generate consolidated Excel reports
- Interactive CLI with progress indicators

## Requirements

- Node.js >= 22.11.0

## Installation

```bash
npm install
npx playwright install chromium
```

## Usage

Run the interactive CLI:

```bash
npm start
```

Available actions:

1. **Fetch listings** - Download product listings from selected markets
2. **Fetch details** - Download detailed product data
3. **Generate report** - Create Excel report from collected data
4. **Fetch single product** - Get details for one specific product
5. **Run all** - Execute complete pipeline
6. **Clean** - Remove all generated files

## Output

Generated files are stored in `output/`:

```
output/
├── listings/       # Raw listing data per market
├── details/        # Detailed product data per market
├── processed/      # Normalized data per market
└── report.xlsx     # Final consolidated report
```

## Development

```bash
npm run dev          # Development with hot reload
npm run build        # Build for production
npm run typecheck    # Type checking
npm run lint         # Linting
npm run format       # Code formatting
```

## License

[MIT](./LICENSE)
