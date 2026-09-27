/**
 * One place for how figures are written, so two screens can never disagree
 * about the same number.
 */

/**
 * A figure that is missing is shown as missing.
 *
 * These used to throw on null or undefined, which blanked the whole screen over
 * one absent number. They must not invent a zero instead: on an accounting
 * screen a zero is a claim, and "no cost price" is not the same as "cost
 * nothing". A dash says neither.
 */
const MISSING = '—';
const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

/** Whole rupees with thousands separators. The default for money on screen. */
export const num = (value: number | null | undefined): string =>
  isNumber(value) ? Math.round(value).toLocaleString() : MISSING;

/** Two decimals. Used where the arithmetic is shown and must add up on the page. */
export const money = (value: number | null | undefined): string =>
  isNumber(value)
    ? value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : MISSING;

/** Silver is weighed to three decimals throughout. */
export const grams = (value: number | null | undefined): string =>
  isNumber(value) ? value.toFixed(3) : MISSING;

export const percent = (value: number): string => `${value}%`;

export const shortDate = (value: string | Date): string =>
  new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

export const longDate = (value: string | Date): string =>
  new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

/** How long ago, for "updated just now" style labels. */
export const relativeTime = (from: number): string => {
  const seconds = Math.floor((Date.now() - from) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return hours === 1 ? 'an hour ago' : `${hours} hours ago`;
};
