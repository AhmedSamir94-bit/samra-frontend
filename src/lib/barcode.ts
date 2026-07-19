import { api } from "@/lib/api";
import type { Product, PurchaseItem } from "@/types";

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
      i === index ? { ...item, quantity: item.quantity + quantityDelta } : item
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
  };
}

export async function lookupProductByBarcode(barcode: string): Promise<Product | null> {
  try {
    return await api.getProductByBarcode(barcode);
  } catch {
    return null;
  }
}
