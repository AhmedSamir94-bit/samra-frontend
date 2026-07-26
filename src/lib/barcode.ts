import { api } from "@/lib/api";
import type { Product, ProductUnit, PurchaseItem } from "@/types";

export function upsertPurchaseItemByProduct(
  items: PurchaseItem[],
  product: Product,
  quantityDelta = 1
): PurchaseItem[] {
  const index = items.findIndex(
    (item) => item.barcode && item.barcode === product.barcode
  );

  if (index >= 0) {
    return items.map((item, i) =>
      i === index
        ? {
            ...item,
            quantity: Number((item.quantity + quantityDelta).toFixed(3)),
            unitType: product.unitType || item.unitType || "piece",
          }
        : item
    );
  }

  const emptyIndex = items.findIndex(
    (item) => !item.productName && !item.barcode && item.quantity === 0
  );

  const newItem: PurchaseItem = {
    productName: product.name,
    barcode: product.barcode || "",
    quantity: quantityDelta,
    purchasePrice: product.cost ?? 0,
    salePrice: product.price,
    category: product.category || "",
    unitType: product.unitType || "piece",
  };

  if (emptyIndex >= 0) {
    return items.map((item, i) => (i === emptyIndex ? newItem : item));
  }

  return [...items, newItem];
}

export function createPurchaseItemFromBarcode(barcode: string): PurchaseItem {
  return {
    productName: "",
    barcode,
    quantity: 1,
    purchasePrice: 0,
    salePrice: 0,
    category: "",
    unitType: "piece",
  };
}

export async function lookupProductByBarcode(barcode: string): Promise<Product | null> {
  const code = barcode.trim();
  if (!code) return null;

  console.log("[barcode] API lookup:", code);
  try {
    const product = await api.getProductByBarcode(code);
    console.log("[barcode] API found:", product?.name, product?.id);
    return product;
  } catch (error) {
    console.log("[barcode] API not found / error:", code, error);
    return null;
  }
}

export function defaultPurchaseUnit(unit?: ProductUnit): ProductUnit {
  return unit || "piece";
}
