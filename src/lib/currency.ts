export const CURRENCY_CODE = "EGP";
export const CURRENCY_SYMBOL = "ج.م.";

export function formatCurrency(amount: number, decimals = 2): string {
  return `${amount.toFixed(decimals)} ${CURRENCY_SYMBOL}`;
}
