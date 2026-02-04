import type { ActionResult, MarketId, ProductDetails, ProductListing } from "../../types/types";
import { createTimer } from "../utils/timer";
import { MARKETS } from "../../markets";
import { loadProductsDetails, saveProductsDetails } from "../../helpers/storage";
import { MARKET_FETCH_DETAILS, REQUIRED_FIELDS_BY_MARKET } from "../../details/details";
import { createSpinner, failSpinner, succeedSpinner, warnSpinner } from "../utils/spinner";
/**
 * Fetch single product action
 * Downloads details for one specific product
 */
export async function fetchSingleProduct(
  marketId: MarketId,
  product: ProductListing,
): Promise<ActionResult<ProductDetails>> {
  const totalTimer = createTimer();
  const market = MARKETS[marketId];
  const fetchProductDetails = MARKET_FETCH_DETAILS[marketId];
  const requiredFields = REQUIRED_FIELDS_BY_MARKET[marketId];

  // Create tasks container
  const spinner = createSpinner(`Fetching details for ${product.name}`);

  try {
    // Fetch the product details
    const result = await fetchProductDetails(product, requiredFields);

    if (!result.data || result.error) {
      throw new Error(result.error ?? "Unknown error");
    }

    // Load existing details to merge
    const existingDetails = await loadProductsDetails<ProductDetails>(market.slug);

    if (!existingDetails) {
      throw new Error(`Failed to load existing details for ${market.name}`);
    }

    // Find and replace the product, or add it
    const productIndex = existingDetails.findIndex((detail) => {
      return "url" in detail && detail.url === product.url;
    });

    if (productIndex === -1) {
      existingDetails.push(result.data);
    } else {
      existingDetails[productIndex] = result.data;
    }

    // Save updated details
    await saveProductsDetails(market.slug, existingDetails);

    if (result.missingFields && result.missingFields.length > 0) {
      warnSpinner(spinner, `Missing fields: ${result.missingFields.join(", ")}`);
    } else {
      succeedSpinner(spinner, `Details fetched for ${product.name}`);
    }

    return {
      action: "Fetch Single Product",
      results: [
        {
          duration: totalTimer.stop(),
          errors: [],
          marketId,
          marketName: market.name,
          products: [result.data],
          warnings:
            result.missingFields?.map((missingField) => ({
              missingFields: [missingField],
              name: product.name,
            })) ?? [],
        },
      ],
      totalDuration: totalTimer.stop(),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    // Mark as failed
    failSpinner(spinner, errorMessage);

    return {
      action: "Fetch Single Product",
      results: [
        {
          duration: totalTimer.stop(),
          errors: [{ error: errorMessage, name: product.name }],
          marketId,
          marketName: market.name,
          products: [],
          warnings: [],
        },
      ],
      totalDuration: totalTimer.stop(),
    };
  }
}
