export function calculatePurchaseItemsTotal(
  items: { productName?: string; quantity: number; purchasePrice: number }[],
) {
  return Number(
    items
      .filter((item) => item.productName?.trim() && item.quantity > 0)
      .reduce(
        (sum, item) => sum + Number(item.quantity) * Number(item.purchasePrice),
        0,
      )
      .toFixed(2),
  );
}

export function calculateSaleItemsTotal(
  items: { price: number; quantity: number }[],
) {
  return Number(
    items
      .reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0)
      .toFixed(2),
  );
}
