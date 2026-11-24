/** Recursively sorts object keys while preserving arrays and scalar values. */
export function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJson);
  if (value === null || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, sortJson((value as Record<string, unknown>)[key])]),
  );
}
