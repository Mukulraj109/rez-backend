/**
 * Escape special regex characters in a string for safe use in MongoDB $regex queries.
 * Prevents ReDoS attacks and regex injection.
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
