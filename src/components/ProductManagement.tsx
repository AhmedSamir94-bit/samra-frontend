
import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Plus, Search, Edit, Trash2, Barcode, Loader2, ImagePlus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useBarcodeScanner } from "@/hooks/use-barcode-scanner";
import { formatCurrency } from "@/lib/currency";
import { api } from "@/lib/api";
import { lookupProductByBarcode } from "@/lib/barcode";
import { fileToProductImageDataUrl } from "@/lib/product-image";
import type { Product, ProductUnit } from "@/types";
import CategoryManagement from "./CategoryManagement";
import BarcodeScannerInput from "./BarcodeScannerInput";
import ConfirmDeleteDialog from "./ConfirmDeleteDialog";
import { formatQuantity, quantityInputStep, unitLabel, unitPriceLabel } from "@/lib/units";

interface ProductManagementProps {
  isActive?: boolean;
}

const emptyForm = {
  name: "",
  price: "",
  cost: "",
  stock: "",
  barcode: "",
  category: "",
  unitType: "piece" as ProductUnit,
  imageUrl: "",
};

const ProductManagement = ({ isActive = true }: ProductManagementProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [imageBusy, setImageBusy] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: api.getCategories,
  });

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["products", searchTerm],
    queryFn: () => api.getProducts(searchTerm || undefined),
  });

  const createCategoryMutation = useMutation({
    mutationFn: api.createCategory,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof api.updateCategory>[1] }) =>
      api.updateCategory(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: api.deleteCategory,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
  });

  const createProductMutation = useMutation({
    mutationFn: api.createProduct,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof api.updateProduct>[1] }) =>
      api.updateProduct(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
  });

  const deleteProductMutation = useMutation({
    mutationFn: api.deleteProduct,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
  });

  const generateBarcode = () => {
    const barcode = Math.floor(Math.random() * 1000000000).toString();
    setFormData((prev) => ({ ...prev, barcode }));
  };

  const handleProductBarcodeScan = useCallback(async (barcode: string) => {
    console.log("[barcode] products handleScan:", barcode, "dialogOpen=", isDialogOpen);
    if (!isDialogOpen) {
      console.log("[barcode] products ignored — dialog closed");
      return;
    }

    const existing = await lookupProductByBarcode(barcode);
    if (existing && existing.id !== editingProduct?.id) {
      toast({
        title: "الباركود مستخدم",
        description: `هذا الباركود مسجل بالفعل للمنتج: ${existing.name}`,
        variant: "destructive",
      });
      return;
    }

    setFormData((prev) => ({ ...prev, barcode }));
    toast({
      title: "تم مسح الباركود",
      description: "تم تعيين الباركود للمنتج",
    });
  }, [editingProduct?.id, isDialogOpen, toast]);

  useBarcodeScanner({
    onScan: handleProductBarcodeScan,
    enabled: isActive && isDialogOpen,
    idleResetMs: 600,
  });

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setImageBusy(true);
    try {
      const imageUrl = await fileToProductImageDataUrl(file);
      setFormData((prev) => ({ ...prev, imageUrl }));
    } catch (error) {
      toast({
        title: "تعذر رفع الصورة",
        description: error instanceof Error ? error.message : "فشل معالجة الصورة",
        variant: "destructive",
      });
    } finally {
      setImageBusy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.price) {
      toast({
        title: "خطأ في البيانات",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive"
      });
      return;
    }

    if (!formData.imageUrl) {
      toast({
        title: "الصورة مطلوبة",
        description: "أضف صورة للمنتج قبل الحفظ",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      name: formData.name,
      price: parseFloat(formData.price),
      cost: parseFloat(formData.cost) || 0,
      stock: parseFloat(formData.stock) || 0,
      unitType: formData.unitType,
      barcode: formData.barcode || undefined,
      category: formData.category || undefined,
      imageUrl: formData.imageUrl,
    };

    try {
      if (editingProduct) {
        await updateProductMutation.mutateAsync({ id: editingProduct.id, data: payload });
        toast({
          title: "تم تحديث المنتج",
          description: `تم تحديث ${payload.name} بنجاح`,
        });
      } else {
        await createProductMutation.mutateAsync(payload);
        toast({
          title: "تم إضافة المنتج",
          description: `تم إضافة ${payload.name} بنجاح`,
        });
      }

      setIsDialogOpen(false);
      setEditingProduct(null);
      setFormData(emptyForm);
    } catch (error) {
      toast({
        title: "خطأ",
        description: error instanceof Error ? error.message : "فشل حفظ المنتج",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      price: product.price.toString(),
      cost: (product.cost ?? 0).toString(),
      stock: product.stock.toString(),
      barcode: product.barcode || "",
      category: product.category || "",
      unitType: product.unitType || "piece",
      imageUrl: product.imageUrl || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProductMutation.mutateAsync(id);
      toast({
        title: "تم حذف المنتج",
        description: "تم حذف المنتج بنجاح",
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: error instanceof Error ? error.message : "فشل حذف المنتج",
        variant: "destructive"
      });
    }
  };

  const getCategoryColor = (categoryName: string) => {
    const category = categories.find(c => c.name === categoryName);
    return category?.color || "#6B7280";
  };

  const isLoading = productsLoading || categoriesLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4" dir="rtl">
        <h2 className="text-2xl font-bold app-heading">إدارة المنتجات</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
              onClick={() => {
                setEditingProduct(null);
                setFormData(emptyForm);
              }}
            >
              <Plus className="w-4 h-4 me-2" />
              إضافة منتج جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md" dir="rtl">
            <DialogHeader className="sticky top-0 z-10 -mx-6 -mt-6 border-b bg-background px-6 pb-4 pt-6">
              <DialogTitle>
                {editingProduct ? "تعديل المنتج" : "إضافة منتج جديد"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pb-1">
              <div>
                <Label className="text-right mb-2 block">الباركود</Label>
                <p className="text-xs app-muted mb-2">
                  امسح الباركود بالقارئ أو أدخله يدوياً
                </p>
                <BarcodeScannerInput
                  onScan={handleProductBarcodeScan}
                  autoFocus={isDialogOpen}
                  keepFocus={isDialogOpen}
                  placeholder="امسح باركود المنتج بالقارئ..."
                />
                <div className="flex gap-2 mt-2">
                  <Input
                    id="barcode"
                    value={formData.barcode}
                    onChange={(e) => setFormData((prev) => ({ ...prev, barcode: e.target.value }))}
                    placeholder="الباركود"
                    className="flex-1 font-mono"
                    data-scanner-ignore
                  />
                  <Button type="button" variant="outline" onClick={generateBarcode} data-scanner-ignore>
                    <Barcode className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div data-scanner-ignore>
                <Label className="text-right mb-2 block">صورة المنتج *</Label>
                <div className="space-y-3">
                  {formData.imageUrl ? (
                    <div className="relative overflow-hidden rounded-lg border bg-muted/30">
                      <img
                        src={formData.imageUrl}
                        alt="معاينة المنتج"
                        className="h-40 w-full object-cover"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="secondary"
                        className="absolute left-2 top-2 h-8 w-8"
                        onClick={() => setFormData((prev) => ({ ...prev, imageUrl: "" }))}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <label className="flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-sm text-muted-foreground hover:bg-muted/40">
                      <ImagePlus className="h-6 w-6" />
                      <span>{imageBusy ? "جاري تجهيز الصورة..." : "اختر صورة للمنتج"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={imageBusy}
                        onChange={handleImageChange}
                      />
                    </label>
                  )}
                  {formData.imageUrl && (
                    <label className="inline-flex cursor-pointer text-sm text-blue-600 hover:underline">
                      تغيير الصورة
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={imageBusy}
                        onChange={handleImageChange}
                      />
                    </label>
                  )}
                </div>
              </div>
              <div data-scanner-ignore>
                <Label htmlFor="name" className="text-right">اسم المنتج *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="أدخل اسم المنتج"
                  required
                />
              </div>
              <div data-scanner-ignore>
                <Label htmlFor="price" className="text-right">
                  {unitPriceLabel(formData.unitType)} *
                </Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
                  placeholder="0.00"
                  required
                />
              </div>
              <div data-scanner-ignore>
                <Label htmlFor="cost" className="text-right">
                  {formData.unitType === "kg" ? "تكلفة شراء الكيلو" : "تكلفة الشراء"}
                </Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  value={formData.cost}
                  onChange={(e) => setFormData((prev) => ({ ...prev, cost: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
              <div data-scanner-ignore>
                <Label className="text-right mb-2 block">وحدة البيع *</Label>
                <Select
                  value={formData.unitType}
                  onValueChange={(value: ProductUnit) =>
                    setFormData((prev) => ({ ...prev, unitType: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الوحدة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="piece">بالقطعة</SelectItem>
                    <SelectItem value="kg">بالوزن (كجم)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div data-scanner-ignore>
                <Label htmlFor="stock" className="text-right">
                  الكمية المتوفرة ({unitLabel(formData.unitType)})
                </Label>
                <Input
                  id="stock"
                  type="number"
                  step={quantityInputStep(formData.unitType)}
                  value={formData.stock}
                  onChange={(e) => setFormData((prev) => ({ ...prev, stock: e.target.value }))}
                  placeholder={formData.unitType === "kg" ? "0.000" : "0"}
                />
              </div>
              <div data-scanner-ignore>
                <Label htmlFor="category" className="text-right mb-2 block">الفئة</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الفئة" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.name}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                          {category.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-4" data-scanner-ignore>
                <Button
                  type="submit"
                  disabled={createProductMutation.isPending || updateProductMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500"
                >
                  {editingProduct ? "تحديث" : "إضافة"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  إلغاء
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <CategoryManagement 
        categories={categories}
        onCreate={(data) => createCategoryMutation.mutateAsync(data)}
        onUpdate={(id, data) => updateCategoryMutation.mutateAsync({ id, data })}
        onDelete={(id) => deleteCategoryMutation.mutateAsync(id)}
        isSubmitting={
          createCategoryMutation.isPending ||
          updateCategoryMutation.isPending ||
          deleteCategoryMutation.isPending
        }
      />

      <Card className="app-surface-muted">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute right-3 top-3 w-4 h-4 text-slate-400 dark:text-slate-400 pointer-events-none" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث عن المنتجات..."
              className="pe-10"
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" dir="rtl">
            {products.map((product) => (
              <Card key={product.id} className="app-surface hover:shadow-lg transition-all duration-200 dark:text-white">
                {product.imageUrl ? (
                  <div className="h-36 overflow-hidden rounded-t-lg border-b bg-muted/20">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : null}
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-lg text-foreground dark:text-white">
                      {product.name}
                    </CardTitle>
                    {product.category && (
                      <Badge 
                        variant="secondary" 
                        className="text-xs text-white border-0 shrink-0"
                        style={{ backgroundColor: getCategoryColor(product.category) }}
                      >
                        {product.category}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm app-muted dark:text-white/70">
                      {unitPriceLabel(product.unitType)}:
                    </span>
                    <span className="font-bold text-blue-600 dark:text-white">
                      {formatCurrency(product.price)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm app-muted dark:text-white/70">المخزون:</span>
                    <Badge
                      variant={product.stock > 10 ? "default" : "destructive"}
                      className={
                        product.stock > 10
                          ? "bg-blue-600 text-white hover:bg-blue-600 dark:bg-blue-500"
                          : "text-white"
                      }
                    >
                      {formatQuantity(product.stock, product.unitType)}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm app-muted dark:text-white/70">الوحدة:</span>
                    <Badge
                      variant="outline"
                      className="dark:border-slate-500 dark:text-white"
                    >
                      {product.unitType === "kg" ? "بالوزن" : "بالقطعة"}
                    </Badge>
                  </div>
                  {product.barcode && (
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-sm app-muted dark:text-white/70 shrink-0">
                        الباركود:
                      </span>
                      <span className="text-xs font-mono bg-gray-100 text-gray-900 px-2 py-1 rounded dark:bg-slate-800 dark:text-white dark:border dark:border-slate-600">
                        {product.barcode}
                      </span>
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(product)}
                      className="flex-1 dark:border-slate-500 dark:text-white dark:hover:bg-slate-800"
                    >
                      <Edit className="w-3 h-3 me-1" />
                      تعديل
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setDeleteProductId(product.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {products.length === 0 && (
            <Card className="app-surface-muted">
              <CardContent className="text-center py-12">
                <Package className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="app-muted">لا توجد منتجات متاحة</p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <ConfirmDeleteDialog
        open={!!deleteProductId}
        onOpenChange={(open) => {
          if (!open) setDeleteProductId(null);
        }}
        onConfirm={() => {
          if (deleteProductId) {
            void handleDelete(deleteProductId);
          }
        }}
        description="سيتم حذف المنتج نهائياً ولا يمكن التراجع عن هذا الإجراء."
        isLoading={deleteProductMutation.isPending}
      />
    </div>
  );
};

export default ProductManagement;
