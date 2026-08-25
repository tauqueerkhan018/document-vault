import { badUserInput } from "./errors.js";

// Lowercase words separated by single hyphens, e.g. "engineering-notes".
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const MAX_TAKE = 100;
const DEFAULT_TAKE = 20;

export function assertNonEmpty(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw badUserInput(`${fieldName} must not be empty`);
  }
}

export function assertValidSlug(slug: string): void {
  if (!SLUG_PATTERN.test(slug)) {
    throw badUserInput(
      `slug "${slug}" is invalid — use lowercase letters, numbers, and single hyphens (e.g. "my-collection")`
    );
  }
}

/**
 * Normalizes a raw `take` argument into a safe page size: falls back to
 * DEFAULT_TAKE when absent, rejects non-positive values, and caps at
 * MAX_TAKE so a client can't force an unbounded scan.
 */
export function normalizeTake(take: number | null | undefined): number {
  if (take === null || take === undefined) {
    return DEFAULT_TAKE;
  }
  if (!Number.isInteger(take) || take <= 0) {
    throw badUserInput("take must be a positive integer");
  }
  return Math.min(take, MAX_TAKE);
}

export function normalizeTags(tags: readonly string[] | null | undefined): string[] {
  if (!tags) return [];
  return tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0);
}
