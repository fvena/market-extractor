import type { Page } from "playwright";
import { delay, initBrowser, navigateTo } from "../../helpers/browser";
import { parseListingDateFromTooltip } from "../../helpers/parsing";

const SELECTORS = {
  chart: "#price-chart",
  chartDiv: "#price-chart .amcharts-chart-div",
  maxButton: "input.amChartsButton, input.amcharts-period-input",
  tooltip: ".amcharts-balloon-div-categoryAxis",
} as const;

const CHART_MARGINS = { leftOffset: 65, maxProbeOffset: 100, probeStep: 10 } as const;

/**
 * Fetch listing date from price chart by hovering over the oldest data point.
 */
export async function fetchListingDateFromChart(baseUrl: string, productId: string) {
  let page: Page | undefined;

  try {
    page = await initBrowser();
    const url = `${baseUrl}/en/product/equities/${productId}`;
    await navigateTo(page, url);

    await page.waitForSelector(SELECTORS.chart, { timeout: 15_000 });

    // Click MAX button using page.evaluate (como el original)
    const clicked = await page.evaluate(() => {
      const buttons = document.querySelectorAll<HTMLInputElement>(
        "input.amChartsButton, input.amcharts-period-input",
      );
      for (const button of buttons) {
        if (button.value.toUpperCase() === "MAX") {
          button.click();
          return true;
        }
      }
      const maxButton = document.querySelector<HTMLInputElement>(
        'input[value="MAX"], input[value="Max"]',
      );
      if (maxButton) {
        maxButton.click();
        return true;
      }
      return false;
    });

    if (!clicked) {
      return { error: "Could not click MAX button" };
    }

    await delay(500);

    // Get chart bounds using page.evaluate (como el original)
    const bounds = await page.evaluate(() => {
      const chartDiv = document.querySelector("#price-chart .amcharts-chart-div");
      if (!chartDiv) return;
      const rect = chartDiv.getBoundingClientRect();
      return { height: rect.height, width: rect.width, x: rect.x, y: rect.y };
    });

    if (!bounds) {
      return { error: "Chart not found" };
    }

    // Extract oldest date
    const tooltipDate = await findOldestDateInChart(page, bounds);
    if (!tooltipDate) {
      return { error: "Could not extract listing date from chart" };
    }

    const listingDate = parseListingDateFromTooltip(tooltipDate);
    if (!listingDate) {
      return { error: `Could not parse listing date from tooltip: ${tooltipDate}` };
    }

    return { listingDate };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { error: `Error fetching listing date: ${message}` };
  } finally {
    await page?.close();
  }
}

async function findOldestDateInChart(
  page: Page,
  bounds: { height: number; width: number; x: number; y: number },
): Promise<string | undefined> {
  const centerY = bounds.y + bounds.height / 2;
  const startX = bounds.x + CHART_MARGINS.leftOffset;

  // Primer intento
  await page.mouse.move(startX, centerY);
  let date = await getTooltipText(page);
  if (date) return date;

  for (let offset = 0; offset < CHART_MARGINS.maxProbeOffset; offset += CHART_MARGINS.probeStep) {
    await page.mouse.move(startX + offset, centerY);
    if (offset > 0) await delay(500); // Solo espera a partir del segundo intento

    date = await getTooltipText(page);
    if (date) return date;
  }

  return undefined;
}

async function getTooltipText(page: Page): Promise<string | undefined> {
  return page.evaluate(() => {
    const tooltip = document.querySelector(".amcharts-balloon-div-categoryAxis");
    return tooltip?.textContent.trim();
  });
}
