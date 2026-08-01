
import { useCallback, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Search, Barcode, Plus, Minus, Trash2, Printer, Receipt, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useBarcodeScanner } from "@/hooks/use-barcode-scanner";
import { formatCurrency } from "@/lib/currency";
import { calculateSaleItemsTotal } from "@/lib/invoice-math";
import { printDocument } from "@/lib/print";
import { api } from "@/lib/api";
import { lookupProductByBarcode } from "@/lib/barcode";
import type { Product, SaleItem } from "@/types";
import BarcodeScannerInput from "@/components/BarcodeScannerInput";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import { useAuth } from "@/contexts/AuthContext";
import {
  defaultAddQuantity,
  formatQuantity,
  isWeightUnit,
  quantityInputStep,
  quantityStep,
  unitPriceLabel,
} from "@/lib/units";

interface SalesInterfaceProps {
  isActive?: boolean;
}

const SalesInterface = ({ isActive = true }: SalesInterfaceProps) => {
  const [cart, setCart] = useState<SaleItem[]>([]);
  const cartRef = useRef(cart);
  cartRef.current = cart;
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteCartItemId, setDeleteCartItemId] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", searchTerm],
    queryFn: () => api.getProducts(searchTerm || undefined),
  });

  const { data: allProducts = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => api.getProducts(),
    enabled: isActive,
  });

  const checkoutMutation = useMutation({
    mutationFn: () =>
      api.createSale(
        cart.map((item) => ({ id: item.id, name: item.name, quantity: item.quantity })),
        "البائع الرئيسي"
      ),
    onSuccess: (sale) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      toast({
        title: "تمت عملية البيع بنجاح",
        description: `رقم الفاتورة: ${sale.invoiceNumber} - المبلغ: ${formatCurrency(sale.total)}`,
      });
      cartRef.current = [];
      setCart([]);
    },
    onError: (error: Error) => {
      toast({
        title: "فشل إتمام البيع",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const findCartItem = useCallback((items: SaleItem[], product: Product) => {
    return items.find(
      (item) =>
        item.id === product.id ||
        (product.barcode && item.barcode && item.barcode === product.barcode)
    );
  }, []);

  const addToCart = useCallback((product: Product, options?: { silent?: boolean }) => {
    const stock = Number(product.stock);
    if (!Number.isFinite(stock) || stock <= 0) {
      toast({
        title: "المنتج غير متوفر",
        description: `${product.name} غير متوفر في المخزون`,
        variant: "destructive",
      });
      return false;
    }

    const currentCart = cartRef.current;
    const existingItem = findCartItem(currentCart, product);
    const currentQty = existingItem?.quantity ?? 0;
    const delta = defaultAddQuantity(product.unitType);

    if (currentQty + delta > stock) {
      toast({
        title: "الكمية غير كافية",
        description: `الكمية المتوفرة من ${product.name}: ${formatQuantity(stock, product.unitType)}`,
        variant: "destructive",
      });
      return false;
    }

    const nextCart = existingItem
      ? currentCart.map((item) =>
          item.id === existingItem.id
            ? { ...item, quantity: Number((item.quantity + delta).toFixed(3)) }
            : item
        )
      : [
          ...currentCart,
          {
            id: product.id,
            name: product.name,
            price: product.price,
            quantity: delta,
            barcode: product.barcode,
            unitType: product.unitType || "piece",
          },
        ];

    cartRef.current = nextCart;
    setCart(nextCart);

    if (!options?.silent) {
      toast({
        title: "تم إضافة المنتج",
        description: `تم إضافة ${product.name} إلى السلة`,
      });
    }

    return true;
  }, [findCartItem, toast]);

  const handleBarcodeScan = useCallback(async (barcode: string) => {
    const normalized = barcode.trim();
    console.log("[barcode] sales handleScan:", normalized);

    const localProduct = allProducts.find((product) => product.barcode === normalized);
    if (localProduct) {
      console.log("[barcode] sales local hit:", localProduct.name);
    }

    const product = localProduct ?? (await lookupProductByBarcode(normalized));

    if (!product) {
      console.warn("[barcode] sales product missing:", normalized);
      toast({
        title: "المنتج غير موجود",
        description: "لم يتم العثور على منتج بهذا الباركود",
        variant: "destructive",
      });
      return;
    }

    const added = addToCart(product, { silent: true });
    console.log("[barcode] sales addToCart:", product.name, "ok=", added);
    if (added) {
      toast({
        title: "تمت الإضافة للسلة",
        description: `${product.name} — ${formatCurrency(product.price)}`,
      });
    }
  }, [addToCart, allProducts, toast]);

  useBarcodeScanner({
    onScan: handleBarcodeScan,
    enabled: isActive,
    idleResetMs: 600,
  });

  const updateQuantity = (id: string, newQuantity: number) => {
    const cartItem = cartRef.current.find((item) => item.id === id);
    if (!cartItem) return;

    const product =
      allProducts.find((p) => p.id === id) ??
      allProducts.find((p) => p.barcode && p.barcode === cartItem.barcode);

    const unitType = cartItem.unitType || product?.unitType || "piece";
    const rawQty = Number.isFinite(newQuantity) ? Math.max(0, newQuantity) : 0;
    const roundedQty = isWeightUnit(unitType)
      ? Number(rawQty.toFixed(3))
      : Math.floor(rawQty);

    if (product) {
      const stock = Number(product.stock);
      if (roundedQty > stock) {
        toast({
          title: "الكمية غير كافية",
          description: `الكمية المتوفرة: ${formatQuantity(stock, unitType)}`,
          variant: "destructive",
        });
        return;
      }
    }

    // Keep the product in cart even at 0 — only trash removes it
    const nextCart = cartRef.current.map((item) =>
      item.id === id ? { ...item, quantity: roundedQty } : item,
    );

    cartRef.current = nextCart;
    setCart(nextCart);
  };

  const removeFromCart = (id: string) => {
    const nextCart = cartRef.current.filter((item) => item.id !== id);
    cartRef.current = nextCart;
    setCart(nextCart);
  };

  const calculateTotal = () =>
    calculateSaleItemsTotal(
      cart.map((item) => ({ price: item.price, quantity: item.quantity })),
    );

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast({
        title: "السلة فارغة",
        description: "يرجى إضافة منتجات إلى السلة أولاً",
        variant: "destructive",
      });
      return;
    }

    const invalidItem = cart.find((item) => !(item.quantity > 0));
    if (invalidItem) {
      toast({
        title: "كمية غير صالحة",
        description: `يرجى إدخال كمية أكبر من صفر للمنتج: ${invalidItem.name}`,
        variant: "destructive",
      });
      return;
    }

    checkoutMutation.mutate();
  };

  const handlePrintCart = () => {
    if (cart.length === 0) {
      toast({
        title: "السلة فارغة",
        description: "لا توجد منتجات للطباعة",
        variant: "destructive",
      });
      return;
    }

    const now = new Date();
    const printed = printDocument({
      title: "إيصال نقطة البيع",
      subtitle: "مسودة قبل إتمام البيع",
      meta: [
        {
          label: "التاريخ",
          value: now.toLocaleDateString("ar-EG"),
        },
        {
          label: "الوقت",
          value: now.toLocaleTimeString("ar-EG", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
        {
          label: "البائع",
          value: user?.name || "البائع الرئيسي",
        },
      ],
      lines: cart.map((item) => ({
        name: item.name,
        quantityLabel: formatQuantity(item.quantity, item.unitType),
        unitPrice: item.price,
        lineTotal: item.price * item.quantity,
        note: item.barcode ? `باركود: ${item.barcode}` : undefined,
      })),
      total: calculateTotal(),
      footerNote: "هذه مسودة — لم يتم إتمام البيع بعد",
    });

    if (!printed) {
      toast({
        title: "تعذر الطباعة",
        description: "يرجى السماح بالنوافذ المنبثقة ثم المحاولة مرة أخرى",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" dir="rtl">
        <div className="lg:col-span-2 space-y-6">
          <Card className="app-surface-muted">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 app-heading">
                <Barcode className="w-5 h-5" />
                قارئ الباركود
              </CardTitle>
              <p className="text-sm app-muted">
                وجّه القارئ نحو هذا الحقل وامسح الباركود — كل مسح يضيف منتجاً للسلة
              </p>
            </CardHeader>
            <CardContent>
              <BarcodeScannerInput
                onScan={handleBarcodeScan}
                keepFocus
                placeholder="امسح الباركود بالقارئ..."
              />
            </CardContent>
          </Card>

          <Card className="app-surface-muted">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 app-heading">
                <Search className="w-5 h-5" />
                المنتجات المتاحة
              </CardTitle>
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ابحث عن المنتجات..."
                className="mt-2"
                data-scanner-ignore
              />
            </CardHeader>
            <CardContent data-scanner-ignore>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {products.map((product) => (
                    <Card
                      key={product.id}
                      className="cursor-pointer hover:shadow-lg transition-all duration-200 border-slate-300 dark:border-slate-500 hover:border-blue-400 dark:hover:border-blue-500"
                      onClick={() => addToCart(product)}
                    >
                      <CardContent className="p-4 text-center">
                        <h3 className="font-semibold app-body mb-2">{product.name}</h3>
                        <p className="text-lg font-bold app-price mb-1">
                          {formatCurrency(product.price)}
                        </p>
                        <p className="text-xs app-muted mb-2">
                          {unitPriceLabel(product.unitType)}
                          {product.unitType === "kg" ? " · بالوزن" : ""}
                        </p>
                        <Badge
                          variant={product.stock > 0 ? "secondary" : "destructive"}
                          className="text-xs"
                        >
                          متوفر: {formatQuantity(product.stock, product.unitType)}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4" data-scanner-ignore>
          <Card className="app-surface sticky top-24">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 app-heading">
                <Receipt className="w-5 h-5" />
                سلة المشتريات
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cart.length === 0 ? (
                <p className="text-center app-muted py-8">السلة فارغة — امسح باركوداً للبدء</p>
              ) : (
                <>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {cart.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 bg-blue-50 dark:bg-slate-800/80 rounded-lg"
                      >
                        <div className="flex-1">
                          <h4 className="font-semibold app-body">{item.name}</h4>
                          <p className="text-sm app-price">
                            {formatCurrency(item.price)}
                            {item.unitType === "kg" ? " / كجم" : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={item.quantity <= 0}
                            onClick={() =>
                              updateQuantity(
                                item.id,
                                item.quantity - quantityStep(item.unitType),
                              )
                            }
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <Input
                            type="number"
                            step={quantityInputStep(item.unitType)}
                            min={0}
                            value={item.quantity}
                            onChange={(e) => {
                              const raw = e.target.value;
                              if (raw === "") {
                                updateQuantity(item.id, 0);
                                return;
                              }
                              const parsed = Number.parseFloat(raw);
                              updateQuantity(
                                item.id,
                                Number.isFinite(parsed) ? parsed : 0,
                              );
                            }}
                            className="w-16 h-8 text-center px-1"
                            dir="ltr"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              updateQuantity(
                                item.id,
                                item.quantity + quantityStep(item.unitType),
                              )
                            }
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setDeleteCartItemId(item.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-lg font-bold app-body">
                      <span>الإجمالي:</span>
                      <span className="app-price">{formatCurrency(calculateTotal())}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="border-blue-200 hover:bg-blue-50"
                        onClick={handlePrintCart}
                      >
                        <Printer className="w-4 h-4 me-2" />
                        طباعة
                      </Button>
                      <Button
                        onClick={handleCheckout}
                        disabled={checkoutMutation.isPending}
                        className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                      >
                        {checkoutMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "إتمام البيع"
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDeleteDialog
        open={!!deleteCartItemId}
        onOpenChange={(open) => {
          if (!open) setDeleteCartItemId(null);
        }}
        onConfirm={() => {
          if (deleteCartItemId) {
            removeFromCart(deleteCartItemId);
          }
        }}
        description="سيتم إزالة هذا المنتج من سلة المبيعات."
      />
    </div>
  );
};

export default SalesInterface;
