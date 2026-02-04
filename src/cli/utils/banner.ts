import figlet from "figlet";
import colors from "yoctocolors";

/**
 * Display the CLI banner with app name and version
 */
export function showBanner(version: string): void {
  const banner = figlet.textSync("MARKET", {
    font: "Standard",
    horizontalLayout: "default",
  });

  console.log(colors.cyan(banner));
  console.log(colors.dim(`  Market Extractor v${version}`));
  console.log(colors.dim("  Stock market data aggregation tool\n"));
}
