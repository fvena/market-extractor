type PathValue<T, P extends string> = P extends `${infer K}.${infer Rest}`
  ? K extends `${number}`
    ? T extends readonly (infer U)[]
      ? PathValue<U, Rest>
      : undefined
    : K extends keyof T
      ? PathValue<T[K], Rest>
      : undefined
  : P extends `${number}`
    ? T extends readonly (infer U)[]
      ? U
      : undefined
    : P extends keyof T
      ? T[P]
      : undefined;

/**
 * Required keys including nested paths
 * Filters to only include paths where the final value is required (not optional)
 *
 * Generate all possible dot-notation paths for an object type up to a depth of 3
 */
export type RequiredKeys<T, Depth extends number[] = []> = Depth["length"] extends 3
  ? never
  : T extends object
    ? {
        [K in keyof T & string]: T[K] extends object | undefined
          ? `${K}.${RequiredKeys<NonNullable<T[K]>, [...Depth, 1]>}` | K
          : K;
      }[keyof T & string]
    : never;

/**
 * Get the value of an object at a given path
 */
function getObjectValue<T extends object, P extends string>(
  object: T,
  path: P,
): PathValue<T, P> | undefined {
  const keys = path.split(".");
  let current: unknown = object;

  for (const key of keys) {
    if (current === null || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current as PathValue<T, P> | undefined;
}

/**
 * Get missing required fields from a processed product
 */
export function getMissingRequiredFields(
  product: object,
  requiredKeys: readonly string[],
): string[] {
  return requiredKeys.filter((key) => {
    if (!key.includes(".") && !(key in product)) {
      return true;
    }

    const value = key.includes(".")
      ? getObjectValue(product as Record<string, unknown>, key)
      : (product as Record<string, unknown>)[key];

    if (Array.isArray(value) && value.length === 0) {
      return true;
    }

    return value === undefined || value === null || value === "";
  });
}
