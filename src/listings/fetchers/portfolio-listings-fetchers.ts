import type { IssuanceMarketBean } from "../../types/portfolio.types";
import type { BatchProductResult, PortfolioListing, ProductMissingFields } from "../../types/types";
import { fetchJson } from "../../helpers/http";
import { getMissingRequiredFields } from "../../helpers/missing-fields";

/**
 * Fetch Portfolio listings via REST API
 */
export async function fetchPortfolioListings(
  url: string,
  baseUrl: string,
  requiredFields: string[],
): Promise<BatchProductResult<PortfolioListing>> {
  const result = await fetchJson<IssuanceMarketBean[]>(url);

  if (result.error) {
    throw new Error(`Invalid API response: ${result.error}`);
  }

  if (!result.data || !Array.isArray(result.data)) {
    throw new Error("Invalid API response: expected an array");
  }

  // Add the constructed URL to each item
  const products: PortfolioListing[] = result.data.map((item) => ({
    ...item,
    ticker: item.tradingCode ?? "",
    url: `${baseUrl}/${String(item.id)}`,
  }));

  const productsWithMissingFields: ProductMissingFields[] = products.flatMap((product) => {
    const missingFields = getMissingRequiredFields(product, requiredFields);

    if (missingFields.length === 0) {
      return [];
    }

    return [
      {
        missingFields,
        name: product.name,
        ticker: product.ticker,
      },
    ];
  });

  return { products, productsWithError: [], productsWithMissingFields };
}
