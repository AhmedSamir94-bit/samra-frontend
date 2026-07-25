
import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Plus, Search, Edit, Trash2, Barcode, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useBarcodeScanner } from "@/hooks/use-barcode-scanner";
import { formatCurrency } from "@/lib/currency";
import { api } from "@/lib/api";
import { lookupProductByBarcode } from "@/lib/barcode";
import type { Product } from "@/types";
import CategoryManagement from "./CategoryManagement";
import BarcodeScannerInput from "./BarcodeScannerInput";

interface ProductManagementProps {
  isActive?: boolean;
}

const ProductManagement = ({ isActive = true }: ProductManagementProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    cost: "",
    stock: "",
    barcode: "",
    category: ""
  });
  
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
    maxGapMs: 150,
  });

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

    const payload = {
      name: formData.name,
      price: parseFloat(formData.price),
      cost: parseFloat(formData.cost) || 0,
      stock: parseInt(formData.stock) || 0,
      barcode: formData.barcode || undefined,
      category: formData.category || undefined,
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
      setFormData({ name: "", price: "", cost: "", stock: "", barcode: "", category: "" });
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
      category: product.category || ""
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
        <h2 className="text-2xl font-bold text-blue-800">إدارة المنتجات</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
              onClick={() => {
                setEditingProduct(null);
                setFormData({ name: "", price: "", cost: "", stock: "", barcode: "", category: "" });
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              إضافة منتج جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? "تعديل المنتج" : "إضافة منتج جديد"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="text-right mb-2 block">الباركود</Label>
                <p className="text-xs text-gray-500 mb-2">
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
                <Label htmlFor="price" className="text-right">سعر البيع *</Label>
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
                <Label htmlFor="cost" className="text-right">تكلفة الشراء</Label>
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
                <Label htmlFor="stock" className="text-right">الكمية المتوفرة</Label>
                <Input
                  id="stock"
                  type="number"
                  value={formData.stock}
                  onChange={(e) => setFormData((prev) => ({ ...prev, stock: e.target.value }))}
                  placeholder="0"
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

      <Card className="bg-white/60 backdrop-blur-sm border-blue-100">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث عن المنتجات..."
              className="pr-10"
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
              <Card key={product.id} className="bg-white/80 backdrop-blur-sm border-blue-100 hover:shadow-lg transition-all duration-200">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg text-gray-800">{product.name}</CardTitle>
                    {product.category && (
                      <Badge 
                        variant="secondary" 
                        className="text-xs text-white border-0"
                        style={{ backgroundColor: getCategoryColor(product.category) }}
                      >
                        {product.category}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">السعر:</span>
                    <span className="font-bold text-blue-600">{formatCurrency(product.price)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">المخزون:</span>
                    <Badge variant={product.stock > 10 ? "default" : "destructive"}>
                      {product.stock}
                    </Badge>
                  </div>
                  {product.barcode && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">الباركود:</span>
                      <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                        {product.barcode}
                      </span>
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(product)}
                      className="flex-1"
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      تعديل
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(product.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {products.length === 0 && (
            <Card className="bg-white/60 backdrop-blur-sm border-blue-100">
              <CardContent className="text-center py-12">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">لا توجد منتجات متاحة</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default ProductManagement;
