/**
 * One place for how figures are written, so two screens can never disagree
 * about the same number.
 */

/** Whole rupees with thousands separators. The default for money on screen. */
export const num = (value: number): string => Math.round(value).toLocaleString();

/** Two decimals. Used where the arithmetic is shown and must add up on the page. */
export const money = (value: number): string =>
  value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Silver is weighed to three decimals throughout. */
export const grams = (value: number): string => value.toFixed(3);

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
