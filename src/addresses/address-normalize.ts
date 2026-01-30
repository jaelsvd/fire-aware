/**
 * Normalizes an address string by trimming whitespace,
 * replacing multiple spaces with a single space, and converting to lowercase.
 */
export function normalizeAddress(input: string) {
  return input.trim().replace(/\s+/g, ' ').toLowerCase();
}
