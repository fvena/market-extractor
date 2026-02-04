import type { EuronextRelatedInstrument } from "../types/euronext.types";
import type { BatchProductResult, EuronextDetails, ProductMissingFields } from "../types/types";
import { getMissingRequiredFields } from "./missing-fields";

// Fields that can be shared between related instruments
const SHARED_FIELDS = [
  "address",
  "city",
  "country",
  "currency",
  "email",
  "markets",
  "phone",
  "postalCode",
] as const;

type SharedField = (typeof SHARED_FIELDS)[number];

type SharedFieldValue = EuronextDetails[SharedField];

/**
 * Fill the shared fields that are missing in the products
 * using data from their related instruments.
 */
export function fillMissingFieldsFromRelated(
  products: EuronextDetails[],
  requiredFields: readonly string[],
): BatchProductResult<EuronextDetails> {
  // Create a map ISIN -> product for quick search
  const productsByIsin = new Map<string, EuronextDetails>(products.map((p) => [p.isin, p]));

  const newProducts = products.map((product) => {
    // If it doesn't have related instruments, return as is
    if (product.relatedInstruments.length === 0) {
      return product;
    }

    // Find fields that are missing in this product
    const missingFields = SHARED_FIELDS.filter((field) => !hasValue(product[field]));

    // If nothing is missing, return as is
    if (missingFields.length === 0) {
      return product;
    }

    // Find values in related products
    const filledFields = findValuesInRelated(
      missingFields,
      product.relatedInstruments,
      productsByIsin,
    );

    // If we don't find anything, return as is
    if (Object.keys(filledFields).length === 0) {
      return product;
    }

    return { ...product, ...filledFields };
  });

  return {
    products: newProducts,
    productsWithError: [],
    productsWithMissingFields: newProducts.reduce<ProductMissingFields[]>(
      (accumulator, product) => {
        const missingFields = getMissingRequiredFields(product, requiredFields);
        if (missingFields.length > 0) {
          accumulator.push({
            missingFields,
            name: product.name,
          });
        }
        return accumulator;
      },
      [],
    ),
  };
}

/**
 * Check if a value is defined and not empty
 */
function hasValue(value: SharedFieldValue): boolean {
  if (value === undefined) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

/**
 * Find values for the fields that are missing in the related products
 */
function findValuesInRelated(
  missingFields: SharedField[],
  relatedInstruments: EuronextRelatedInstrument[],
  productsByIsin: Map<string, EuronextDetails>,
): Partial<Pick<EuronextDetails, SharedField>> {
  const result: Partial<Pick<EuronextDetails, SharedField>> = {};
  const pendingFields = new Set(missingFields);

  for (const related of relatedInstruments) {
    // If we have found everything, exit
    if (pendingFields.size === 0) break;

    const relatedProduct = productsByIsin.get(related.isin);
    if (!relatedProduct) continue;

    // Try to get each pending field
    for (const field of pendingFields) {
      const value = relatedProduct[field];
      if (hasValue(value)) {
        // Clone arrays to avoid shared references
        result[field] = (Array.isArray(value) ? [...value] : value) as never;
        pendingFields.delete(field);
      }
    }
  }

  return result;
}
