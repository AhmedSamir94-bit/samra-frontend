
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Receipt, FileText, Calendar, User, Printer, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { formatQuantity } from "@/lib/units";
import { printDocument } from "@/lib/print";
import { api } from "@/lib/api";
import type { SaleInvoice } from "@/types";
import { useToast } from "@/hooks/use-toast";

const SalesInvoices = () => {
  const [selectedInvoice, setSelectedInvoice] = useState<SaleInvoice | null>(null);
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: salesInvoices = [], isLoading } = useQuery({
    queryKey: ["sales"],
    queryFn: () => api.getSales(),
  });

  const handlePrintInvoice = (invoice: SaleInvoice) => {
    const printed = printDocument({
      title: "فاتورة مبيعات",
      subtitle: invoice.invoiceNumber,
      meta: [
        { label: "رقم الفاتورة", value: invoice.invoiceNumber },
        { label: "التاريخ", value: invoice.date },
        { label: "الوقت", value: invoice.time },
        { label: "البائع", value: invoice.cashier },
      ],
      lines: invoice.items.map((item) => ({
        name: item.name,
        quantityLabel: formatQuantity(item.quantity, item.unitType),
        unitPrice: item.price,
        lineTotal: item.price * item.quantity,
        note: item.barcode ? `باركود: ${item.barcode}` : undefined,
      })),
      total: invoice.total,
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
      <Card className="app-surface-muted" dir="rtl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 app-heading">
            <FileText className="w-6 h-6" />
            فواتير المبيعات
          </CardTitle>
          <p className="text-sm app-muted">
            إجمالي فواتير الكاشير: {salesInvoices.length} فاتورة
            <span className="ms-1">(بدون طلبات التوصيل)</span>
          </p>
        </CardHeader>
      </Card>

      <Card className="app-surface-muted" dir="rtl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 app-heading">
            <Receipt className="w-5 h-5" />
            قائمة الفواتير ({salesInvoices.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : salesInvoices.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Receipt className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>لا توجد فواتير مبيعات حتى الآن</p>
              <p className="text-sm mt-2">ستظهر الفواتير هنا بعد إتمام عمليات البيع</p>
            </div>
          ) : (
            <div className="space-y-4">
              {salesInvoices.map((invoice) => (
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
                          <span className="text-sm app-muted">
                            {invoice.items.length} منتج
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm app-muted">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {invoice.date} - {invoice.time}
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {invoice.cashier}
                          </div>
                        </div>
                      </div>
                      <div className="text-left">
                        <div className="text-lg font-bold text-blue-600">
                          {formatCurrency(invoice.total)}
                        </div>
                        <Button variant="ghost" size="sm" className="mt-1">
                          عرض التفاصيل
                        </Button>
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              تفاصيل الفاتورة {selectedInvoice?.invoiceNumber}
            </DialogTitle>
          </DialogHeader>
          
          {selectedInvoice && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-blue-50 rounded-lg">
                <div>
                  <span className="text-sm app-muted">رقم الفاتورة</span>
                  <p className="font-semibold">{selectedInvoice.invoiceNumber}</p>
                </div>
                <div>
                  <span className="text-sm app-muted">التاريخ</span>
                  <p className="font-semibold">{selectedInvoice.date}</p>
                </div>
                <div>
                  <span className="text-sm app-muted">الوقت</span>
                  <p className="font-semibold">{selectedInvoice.time}</p>
                </div>
                <div>
                  <span className="text-sm app-muted">البائع</span>
                  <p className="font-semibold">{selectedInvoice.cashier}</p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">تفاصيل المنتجات</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">المنتج</TableHead>
                      <TableHead className="text-right">السعر</TableHead>
                      <TableHead className="text-right">الكمية</TableHead>
                      <TableHead className="text-right">الإجمالي</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedInvoice.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{formatCurrency(item.price)}</TableCell>
                        <TableCell>{formatQuantity(item.quantity, item.unitType)}</TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(item.price * item.quantity)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center text-xl font-bold">
                  <span>المبلغ الإجمالي:</span>
                  <span className="text-blue-600">{formatCurrency(selectedInvoice.total)}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500"
                  onClick={() => handlePrintInvoice(selectedInvoice)}
                >
                  <Printer className="w-4 h-4 me-2" />
                  طباعة الفاتورة
                </Button>
                <Button variant="outline" onClick={() => setIsInvoiceDialogOpen(false)}>
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

export default SalesInvoices;
