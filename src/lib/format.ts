/** Currency + number formatting helpers (Hermes lacks full Intl). */

export type CurrencyCode = 'GHS' | 'USD' | 'EUR' | 'GBP';

const currencySymbols: Record<CurrencyCode, string> = {
  GHS: 'GH₵',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

let activeCurrency: CurrencyCode = 'GHS';

export function setActiveCurrency(currency: CurrencyCode) {
  activeCurrency = currency;
}

export function getCurrencySymbol(currency: CurrencyCode = activeCurrency) {
  return currencySymbols[currency];
}

/** 6600 → "GH₵ 6,600" */
export function formatGhs(n: number) {
  const symbol = getCurrencySymbol();
  return `${symbol} ${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

/** "GH₵ 6,000" → 6000 */
export function parseAmount(value: string) {
  const n = parseInt(value.replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
}

/** Initials from a full name, e.g. "Kwame Mensah" → "KM". */
export function initialsOf(name?: string) {
  return (
    (name ?? '')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('') || '?'
  );
}
