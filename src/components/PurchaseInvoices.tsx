import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Plus, Calendar, Building, Receipt, Loader2, Barcode, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useBarcodeScanner } from "@/hooks/use-barcode-scanner";
import { formatCurrency } from "@/lib/currency";
import { calculatePurchaseItemsTotal } from "@/lib/invoice-math";
import { api } from "@/lib/api";
import {
  createPurchaseItemFromBarcode,
  lookupProductByBarcode,
  upsertPurchaseItemByProduct,
} from "@/lib/barcode";
import type { PurchaseInvoice, PurchaseItem } from "@/types";
import BarcodeScannerInput from "@/components/BarcodeScannerInput";

const emptyItem = (): PurchaseItem => ({
  productName: "",
  barcode: "",
  quantity: 0,
  purchasePrice: 0,
  salePrice: 0,
  category: "",
});

function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const initialInvoiceData = () => ({
  invoiceNumber: "",
  supplier: "",
  date: getTodayDateString(),
});

interface PurchaseInvoicesProps {
  isActive?: boolean;
}

const PurchaseInvoices = ({ isActive = true }: PurchaseInvoicesProps) => {
  const [selectedInvoice, setSelectedInvoice] = useState<PurchaseInvoice | null>(null);
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<PurchaseInvoice | null>(null);
  const [invoiceData, setInvoiceData] = useState(initialInvoiceData);
  const [invoiceItems, setInvoiceItems] = useState<PurchaseItem[]>([emptyItem()]);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const resetCreateForm = useCallback(async () => {
    setEditingInvoice(null);
    setInvoiceItems([emptyItem()]);
    setInvoiceData({ ...initialInvoiceData(), invoiceNumber: "..." });

    try {
      const { invoiceNumber } = await api.getNextPurchaseInvoiceNumber();
      setInvoiceData({ ...initialInvoiceData(), invoiceNumber });
    } catch {
      setInvoiceData(initialInvoiceData());
    }
  }, []);

  const openEditForm = useCallback((invoice: PurchaseInvoice) => {
    setEditingInvoice(invoice);
    setInvoiceData({
      invoiceNumber: invoice.invoiceNumber,
      supplier: invoice.supplier,
      date: invoice.date,
    });
    setInvoiceItems(invoice.items.length > 0 ? invoice.items.map((item) => ({ ...item })) : [emptyItem()]);
    setIsInvoiceDialogOpen(false);
    setIsFormDialogOpen(true);
  }, []);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: api.getCategories,
  });

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["purchases"],
    queryFn: () => api.getPurchases(),
  });

  const createPurchaseMutation = useMutation({
    mutationFn: api.createPurchase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const updatePurchaseMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof api.updatePurchase>[1] }) =>
      api.updatePurchase(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const isSaving = createPurchaseMutation.isPending || updatePurchaseMutation.isPending;

  const addInvoiceItem = () => {
    setInvoiceItems([...invoiceItems, emptyItem()]);
  };

  const updateInvoiceItem = (index: number, field: keyof PurchaseItem, value: string | number) => {
    const updatedItems = invoiceItems.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    );
    setInvoiceItems(updatedItems);
  };

  const removeInvoiceItem = (index: number) => {
    if (invoiceItems.length > 1) {
      setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
    }
  };

  const handlePurchaseBarcodeScan = useCallback(async (barcode: string) => {
    console.log("[barcode] purchase handleScan:", barcode, "formOpen=", isFormDialogOpen);
    if (!isFormDialogOpen) {
      console.log("[barcode] purchase ignored — form closed");
      return;
    }

    const product = await lookupProductByBarcode(barcode);

    if (product) {
      setInvoiceItems((items) => upsertPurchaseItemByProduct(items, product));
      toast({
        title: "تم مسح الباركود",
        description: `تم إضافة ${product.name} إلى الفاتورة`,
      });
      return;
    }

    setInvoiceItems((items) => {
      const existingIndex = items.findIndex((item) => item.barcode === barcode);
      if (existingIndex >= 0) {
        return items.map((item, i) =>
          i === existingIndex ? { ...item, quantity: item.quantity + 1 } : item
        );
      }

      const emptyIndex = items.findIndex(
        (item) => !item.productName && !item.barcode && item.quantity === 0
      );

      const newItem = createPurchaseItemFromBarcode(barcode);
      if (emptyIndex >= 0) {
        return items.map((item, i) => (i === emptyIndex ? newItem : item));
      }
      return [...items, newItem];
    });

    toast({
      title: "باركود جديد",
      description: "تم إضافة الباركود — أكمل بيانات المنتج الجديد",
    });
  }, [isFormDialogOpen, toast]);

  useBarcodeScanner({
    onScan: handlePurchaseBarcodeScan,
    enabled: isActive && isFormDialogOpen,
    maxGapMs: 120,
  });

  const calculateTotal = () => calculatePurchaseItemsTotal(invoiceItems);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!invoiceData.supplier) {
      toast({
        title: "خطأ في البيانات",
        description: "يرجى إدخال اسم المورد",
        variant: "destructive"
      });
      return;
    }

    const validItems = invoiceItems.filter(item => item.productName && item.quantity > 0);
    
    if (validItems.length === 0) {
      toast({
        title: "خطأ في البيانات",
        description: "يرجى إضافة منتج واحد على الأقل",
        variant: "destructive"
      });
      return;
    }

    try {
      const payload = {
        supplier: invoiceData.supplier,
        date: invoiceData.date || getTodayDateString(),
        items: validItems,
      };

      const purchase = editingInvoice
        ? await updatePurchaseMutation.mutateAsync({ id: editingInvoice.id, data: payload })
        : await createPurchaseMutation.mutateAsync(payload);
      
      toast({
        title: editingInvoice ? "تم تحديث الفاتورة" : "تم إضافة الفاتورة",
        description: editingInvoice
          ? `تم تحديث فاتورة الشراء ${purchase.invoiceNumber} بنجاح`
          : `تم إضافة فاتورة الشراء ${purchase.invoiceNumber} بنجاح`,
      });

      setIsFormDialogOpen(false);
      setEditingInvoice(null);
      setInvoiceData(initialInvoiceData());
      setInvoiceItems([emptyItem()]);
    } catch (error) {
      toast({
        title: "خطأ",
        description: error instanceof Error ? error.message : "فشل حفظ الفاتورة",
        variant: "destructive"
      });
    }
  };

  const getCategoryColor = (categoryName: string) => {
    const category = categories.find(c => c.name === categoryName);
    return category?.color || "#6B7280";
  };

  return (
    <div className="space-y-6">
      <Card className="bg-white/60 backdrop-blur-sm border-blue-100" dir="rtl">
        <CardHeader>
          <div className="flex justify-between items-center" dir="rtl">
            <div>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <FileText className="w-6 h-6" />
                فواتير الشراء
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                إجمالي الفواتير: {invoices.length} فاتورة
              </p>
            </div>
            <Dialog
              open={isFormDialogOpen}
              onOpenChange={(open) => {
                setIsFormDialogOpen(open);
                if (open && !editingInvoice) {
                  void resetCreateForm();
                }
                if (!open) {
                  setEditingInvoice(null);
                }
              }}
            >
              <DialogTrigger asChild>
                <Button
                  className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                  onClick={() => {
                    setEditingInvoice(null);
                    void resetCreateForm();
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  إضافة فاتورة شراء
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" >
                <DialogHeader>
                  <DialogTitle>
                    {editingInvoice ? "تعديل فاتورة شراء" : "إضافة فاتورة شراء جديدة"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6" dir="rtl">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-scanner-ignore>
                    <div>
                      <Label htmlFor="invoiceNumber">رقم الفاتورة</Label>
                      <Input
                        id="invoiceNumber"
                        value={invoiceData.invoiceNumber}
                        readOnly
                        className="bg-gray-50 text-gray-700 cursor-default"
                        placeholder="يتم التوليد تلقائياً"
                      />
                    </div>
                    <div>
                      <Label htmlFor="supplier">المورد *</Label>
                      <Input
                        id="supplier"
                        value={invoiceData.supplier}
                        onChange={(e) => setInvoiceData({ ...invoiceData, supplier: e.target.value })}
                        placeholder="اسم المورد"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="date">تاريخ الفاتورة</Label>
                      <DateInput
                        id="date"
                        value={invoiceData.date}
                        onChange={(date) => setInvoiceData({ ...invoiceData, date })}
                        placeholder="اختر تاريخ الفاتورة"
                      />
                    </div>
                  </div>

                  <Card className="p-4 bg-blue-50 border-blue-200">
                    <div className="flex items-center gap-2 mb-3 text-blue-800">
                      <Barcode className="w-5 h-5" />
                      <Label className="text-base font-semibold">مسح الباركود لإضافة بنود</Label>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      امسح باركود المنتج — إذا كان مسجلاً يُملأ تلقائياً، وإلا أدخل بيانات المنتج الجديد
                    </p>
                    <BarcodeScannerInput
                      onScan={handlePurchaseBarcodeScan}
                      autoFocus={isFormDialogOpen}
                      keepFocus
                      placeholder="امسح باركود المنتج بالقارئ..."
                    />
                  </Card>

                  <div>
                    <div className="flex justify-between items-center mb-4" dir="rtl">
                      <Label className="text-lg font-semibold">بنود الفاتورة</Label>
                      <Button type="button" variant="outline" onClick={addInvoiceItem}>
                        <Plus className="w-4 h-4 mr-2" />
                        إضافة بند
                      </Button>
                    </div>
                    
                    <div className="space-y-4">
                      {invoiceItems.map((item, index) => (
                        <Card key={index} className="p-4 bg-blue-50 border-blue-200" dir="rtl" data-scanner-ignore>
                          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                            <div>
                              <Label>اسم المنتج</Label>
                              <Input
                                value={item.productName}
                                onChange={(e) => updateInvoiceItem(index, 'productName', e.target.value)}
                                placeholder="اسم المنتج"
                              />
                            </div>
                            <div>
                              <Label>الباركود</Label>
                              <Input
                                value={item.barcode}
                                onChange={(e) => updateInvoiceItem(index, 'barcode', e.target.value)}
                                placeholder="1234567890123"
                              />
                            </div>
                            <div>
                              <Label>الفئة</Label>
                              <Select 
                                value={item.category} 
                                onValueChange={(value) => updateInvoiceItem(index, 'category', value)}
                              >
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
                            <div>
                              <Label>الكمية</Label>
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateInvoiceItem(index, 'quantity', parseInt(e.target.value) || 0)}
                                placeholder="0"
                              />
                            </div>
                            <div>
                              <Label>سعر الشراء</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={item.purchasePrice}
                                onChange={(e) => updateInvoiceItem(index, 'purchasePrice', parseFloat(e.target.value) || 0)}
                                placeholder="0.00"
                              />
                            </div>
                            <div>
                              <Label>سعر البيع</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={item.salePrice}
                                onChange={(e) => updateInvoiceItem(index, 'salePrice', parseFloat(e.target.value) || 0)}
                                placeholder="0.00"
                              />
                            </div>
                            <div className="flex items-end">
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => removeInvoiceItem(index)}
                                disabled={invoiceItems.length === 1}
                              >
                                حذف
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>

                  <div className="bg-gray-100 p-4 rounded-lg" dir="rtl">
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span>إجمالي الفاتورة:</span>
                      <span className="text-blue-600">{formatCurrency(calculateTotal())}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={isSaving}
                      className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500"
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : editingInvoice ? (
                        "حفظ التعديلات"
                      ) : (
                        "حفظ الفاتورة"
                      )}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setIsFormDialogOpen(false)}>
                      إلغاء
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      <Card className="bg-white/60 backdrop-blur-sm border-blue-100" dir="rtl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Receipt className="w-5 h-5" />
            قائمة فواتير الشراء ({invoices.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>لا توجد فواتير شراء حتى الآن</p>
              <p className="text-sm mt-2">قم بإضافة فاتورة شراء جديدة لتظهر هنا</p>
            </div>
          ) : (
            <div className="space-y-4">
              {invoices.map((invoice) => (
                <Card key={invoice.id} className="border-blue-200 hover:shadow-md transition-all duration-200 cursor-pointer"
                      onClick={() => {
                        setSelectedInvoice(invoice);
                        setIsInvoiceDialogOpen(true);
                      }}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-blue-600 border-blue-300">
                            {invoice.invoiceNumber}
                          </Badge>
                          <span className="text-sm text-gray-600">
                            {invoice.items.length} منتج
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {invoice.date} - {invoice.time}
                          </div>
                          <div className="flex items-center gap-1">
                            <Building className="w-4 h-4" />
                            {invoice.supplier}
                          </div>
                        </div>
                      </div>
                      <div className="text-left">
                        <div className="text-lg font-bold text-blue-600">
                          {formatCurrency(calculatePurchaseItemsTotal(invoice.items))}
                        </div>
                        <div className="flex gap-1 mt-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditForm(invoice);
                            }}
                          >
                            <Pencil className="w-3 h-3 mr-1" />
                            تعديل
                          </Button>
                          <Button variant="ghost" size="sm">
                            عرض التفاصيل
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isInvoiceDialogOpen} onOpenChange={setIsInvoiceDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              تفاصيل فاتورة الشراء {selectedInvoice?.invoiceNumber}
            </DialogTitle>
          </DialogHeader>
          
          {selectedInvoice && (
            <div className="space-y-6" dir="rtl">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-blue-50 rounded-lg">
                <div>
                  <span className="text-sm text-gray-600">رقم الفاتورة</span>
                  <p className="font-semibold">{selectedInvoice.invoiceNumber}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">التاريخ</span>
                  <p className="font-semibold">{selectedInvoice.date}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">الوقت</span>
                  <p className="font-semibold">{selectedInvoice.time}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">المورد</span>
                  <p className="font-semibold">{selectedInvoice.supplier}</p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">تفاصيل المنتجات</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">المنتج</TableHead>
                      <TableHead className="text-right">الباركود</TableHead>
                      <TableHead className="text-right">الفئة</TableHead>
                      <TableHead className="text-right">سعر الشراء</TableHead>
                      <TableHead className="text-right">سعر البيع</TableHead>
                      <TableHead className="text-right">الكمية</TableHead>
                      <TableHead className="text-right">الإجمالي</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedInvoice.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.productName}</TableCell>
                        <TableCell className="text-sm text-gray-600">{item.barcode}</TableCell>
                        <TableCell>
                          {item.category && (
                            <Badge 
                              className="text-white text-xs"
                              style={{ backgroundColor: getCategoryColor(item.category) }}
                            >
                              {item.category}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{formatCurrency(item.purchasePrice)}</TableCell>
                        <TableCell className="text-green-600 font-medium">{formatCurrency(item.salePrice)}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(
                            Number(item.quantity) * Number(item.purchasePrice),
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center text-xl font-bold">
                  <span>المبلغ الإجمالي:</span>
                  <span className="text-blue-600">
                    {formatCurrency(calculatePurchaseItemsTotal(selectedInvoice.items))}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => openEditForm(selectedInvoice)}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500"
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  تعديل الفاتورة
                </Button>
                <Button variant="outline" onClick={() => setIsInvoiceDialogOpen(false)} className="flex-1">
                  إغلاق
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PurchaseInvoices;
