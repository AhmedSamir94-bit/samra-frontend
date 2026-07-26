import type { ProductUnit } from "@/types";

export function isWeightUnit(unit?: ProductUnit | string | null): boolean {
  return unit === "kg";
}

export function unitLabel(unit?: ProductUnit | string | null): string {
  return isWeightUnit(unit) ? "كجم" : "قطعة";
}

export function unitPriceLabel(unit?: ProductUnit | string | null): string {
  return isWeightUnit(unit) ? "سعر الكيلو" : "السعر";
}

export function formatQuantity(
  quantity: number,
  unit?: ProductUnit | string | null,
): string {
  const value = Number(quantity);
  if (!Number.isFinite(value)) return `0 ${unitLabel(unit)}`;

  const formatted = isWeightUnit(unit)
    ? Number(value.toFixed(3)).toString()
    : Number.isInteger(value)
      ? String(value)
      : Number(value.toFixed(3)).toString();

  return `${formatted} ${unitLabel(unit)}`;
}

export function quantityStep(unit?: ProductUnit | string | null): number {
  return isWeightUnit(unit) ? 0.1 : 1;
}

export function quantityInputStep(unit?: ProductUnit | string | null): string {
  return isWeightUnit(unit) ? "0.001" : "1";
}

export function parseQuantityInput(
  value: string,
  unit?: ProductUnit | string | null,
): number {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  if (isWeightUnit(unit)) {
    return Number(parsed.toFixed(3));
  }
  return Math.floor(parsed);
}

export function defaultAddQuantity(unit?: ProductUnit | string | null): number {
  return isWeightUnit(unit) ? 1 : 1;
}
