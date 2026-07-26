
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FileText, Calendar, TrendingUp, ShoppingCart, Package, DollarSign, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { formatQuantity } from "@/lib/units";
import { api } from "@/lib/api";
import type {
  ExpensesReportData,
  ProfitsReportRow,
  PurchasedItemsRow,
  PurchasesReportRow,
  ReportType,
  SalesReportRow,
  SoldItemsRow,
  TopSellingRow,
} from "@/types";

const ReportsSection = () => {
  const [selectedReport, setSelectedReport] = useState<ReportType>("sales");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [shouldFetch, setShouldFetch] = useState(true);

  const { data: reportData, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["reports", selectedReport, dateFrom, dateTo],
    queryFn: () => api.getReport(selectedReport, dateFrom || undefined, dateTo || undefined),
    enabled: shouldFetch,
  });

  const generateReport = () => {
    setShouldFetch(true);
    refetch();
  };

  const renderReportContent = () => {
    if (isLoading || isFetching) {
      return (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      );
    }

    const rowsOrEmpty = Array.isArray(reportData) ? reportData : [];

    switch (selectedReport) {
      case "sales": {
        const rows = rowsOrEmpty as SalesReportRow[];
        const totals = rows.reduce(
          (acc, row) => ({
            quantitySold: acc.quantitySold + Number(row.quantitySold ?? 0),
            revenue: acc.revenue + Number(row.revenue ?? 0),
            cogs: acc.cogs + Number(row.cogs ?? 0),
            netProfit: acc.netProfit + Number(row.netProfit ?? 0),
          }),
          { quantitySold: 0, revenue: 0, cogs: 0, netProfit: 0 },
        );

        return (
          <div className="space-y-6">
            <Card className="app-surface" dir="rtl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 app-heading">
                  <TrendingUp className="w-5 h-5" />
                  تقرير المبيعات
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  <div className="rounded-lg bg-green-50 border border-green-100 dark:bg-green-950/40 dark:border-green-900 p-4">
                    <p className="text-sm app-muted">إجمالي الإيرادات</p>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                      {formatCurrency(totals.revenue)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-orange-50 border border-orange-100 dark:bg-orange-950/40 dark:border-orange-900 p-4">
                    <p className="text-sm app-muted">التكلفة</p>
                    <p className="text-2xl font-bold text-orange-700 dark:text-orange-400">
                      {formatCurrency(totals.cogs)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-purple-50 border border-purple-100 dark:bg-purple-950/40 dark:border-purple-900 p-4">
                    <p className="text-sm app-muted">صافي الربح</p>
                    <p className={`text-2xl font-bold ${totals.netProfit >= 0 ? "text-purple-700 dark:text-purple-400" : "text-red-600"}`}>
                      {formatCurrency(totals.netProfit)}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right">التاريخ</TableHead>
                          <TableHead className="text-right">عدد الفواتير</TableHead>
                          <TableHead className="text-right">إجمالي الكمية</TableHead>
                          <TableHead className="text-right">الإيرادات</TableHead>
                          <TableHead className="text-right">التكلفة</TableHead>
                          <TableHead className="text-right">صافي الربح</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.date}</TableCell>
                            <TableCell>{item.invoices}</TableCell>
                            <TableCell className="font-semibold text-blue-600">
                              {item.quantitySold}
                            </TableCell>
                            <TableCell className="font-semibold text-green-600">
                              {formatCurrency(item.revenue)}
                            </TableCell>
                            <TableCell className="font-semibold text-orange-600">
                              {formatCurrency(item.cogs ?? 0)}
                            </TableCell>
                            <TableCell className={`font-semibold ${item.netProfit >= 0 ? "text-purple-600" : "text-red-600"}`}>
                              {formatCurrency(item.netProfit ?? 0)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={rows}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip
                          formatter={(value, name) => {
                            if (name === "revenue") {
                              return [formatCurrency(Number(value)), "الإيرادات"];
                            }
                            return [value, "القطع المباعة"];
                          }}
                        />
                        <Bar dataKey="revenue" fill="#10B981" name="revenue" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      }

      case "purchases":
        return (
          <Card className="app-surface">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 app-heading">
                <ShoppingCart className="w-5 h-5" />
                تقرير المشتريات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">عدد الفواتير</TableHead>
                    <TableHead className="text-right">عدد الأصناف</TableHead>
                    <TableHead className="text-right">إجمالي المشتريات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(rowsOrEmpty as PurchasesReportRow[]).map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.date}</TableCell>
                      <TableCell>{item.invoices}</TableCell>
                      <TableCell>{item.items}</TableCell>
                      <TableCell className="font-semibold text-green-600">
                        {formatCurrency(item.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );

      case "profits": {
        const rows = rowsOrEmpty as ProfitsReportRow[];
        const totals = rows.reduce(
          (acc, row) => ({
            revenue: acc.revenue + Number(row.revenue ?? 0),
            cogs: acc.cogs + Number(row.cogs ?? 0),
            expenses: acc.expenses + Number(row.expenses ?? 0),
            netProfit: acc.netProfit + Number(row.netProfit ?? 0),
            purchases: acc.purchases + Number(row.purchases ?? 0),
          }),
          { revenue: 0, cogs: 0, expenses: 0, netProfit: 0, purchases: 0 },
        );

        return (
          <Card className="app-surface" dir="rtl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 app-heading">
                <DollarSign className="w-5 h-5" />
                تقرير الأرباح
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="rounded-lg bg-green-50 border border-green-100 dark:bg-green-950/40 dark:border-green-900 p-4">
                  <p className="text-sm app-muted">إجمالي الإيرادات</p>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-400">{formatCurrency(totals.revenue)}</p>
                </div>
                <div className="rounded-lg bg-orange-50 border border-orange-100 dark:bg-orange-950/40 dark:border-orange-900 p-4">
                  <p className="text-sm app-muted">التكلفة</p>
                  <p className="text-2xl font-bold text-orange-700 dark:text-orange-400">{formatCurrency(totals.cogs)}</p>
                </div>
                <div className="rounded-lg bg-red-50 border border-red-100 dark:bg-red-950/40 dark:border-red-900 p-4">
                  <p className="text-sm app-muted">المصروفات</p>
                  <p className="text-2xl font-bold text-red-700 dark:text-red-400">{formatCurrency(totals.expenses)}</p>
                </div>
                <div className="rounded-lg bg-purple-50 border border-purple-100 dark:bg-purple-950/40 dark:border-purple-900 p-4">
                  <p className="text-sm app-muted">صافي الربح</p>
                  <p className={`text-2xl font-bold ${totals.netProfit >= 0 ? "text-purple-700 dark:text-purple-400" : "text-red-600"}`}>
                    {formatCurrency(totals.netProfit)}
                  </p>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-right">الإيرادات</TableHead>
                    <TableHead className="text-right">التكلفة</TableHead>
                    <TableHead className="text-right">المصروفات</TableHead>
                    <TableHead className="text-right">صافي الربح</TableHead>
                    <TableHead className="text-right">المشتريات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.date}</TableCell>
                      <TableCell className="text-green-600">{formatCurrency(item.revenue)}</TableCell>
                      <TableCell className="text-orange-600">{formatCurrency(item.cogs)}</TableCell>
                      <TableCell className="text-red-600">{formatCurrency(item.expenses ?? 0)}</TableCell>
                      <TableCell className={`font-semibold ${item.netProfit >= 0 ? "text-purple-600" : "text-red-600"}`}>
                        {formatCurrency(item.netProfit)}
                      </TableCell>
                      <TableCell className="text-red-600">{formatCurrency(item.purchases)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      }

      case "expenses": {
        const data = (reportData || {
          total: 0,
          count: 0,
          byDate: [],
          byType: [],
        }) as ExpensesReportData;

        return (
          <div className="space-y-6" dir="rtl">
            <Card className="app-surface">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 app-heading">
                  <DollarSign className="w-5 h-5" />
                  تقرير المصروفات
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  <div className="rounded-lg bg-red-50 border border-red-100 dark:bg-red-950/40 dark:border-red-900 p-4">
                    <p className="text-sm app-muted">إجمالي المصروفات</p>
                    <p className="text-2xl font-bold text-red-700 dark:text-red-400">
                      {formatCurrency(data.total)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-blue-50 border border-blue-100 dark:bg-blue-950/40 dark:border-blue-900 p-4">
                    <p className="text-sm app-muted">عدد المصروفات</p>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                      {data.count}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-3">حسب النوع</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right">النوع</TableHead>
                          <TableHead className="text-right">العدد</TableHead>
                          <TableHead className="text-right">الإجمالي</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.byType.map((row) => (
                          <TableRow key={row.type}>
                            <TableCell>{row.label}</TableCell>
                            <TableCell>{row.count}</TableCell>
                            <TableCell className="text-red-600 font-semibold">
                              {formatCurrency(row.total)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">حسب التاريخ</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right">التاريخ</TableHead>
                          <TableHead className="text-right">العدد</TableHead>
                          <TableHead className="text-right">الإجمالي</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.byDate.map((row) => (
                          <TableRow key={row.date}>
                            <TableCell>{row.date}</TableCell>
                            <TableCell>{row.count}</TableCell>
                            <TableCell className="text-red-600 font-semibold">
                              {formatCurrency(row.total)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      }

      case "top-selling":
        return (
          <Card className="app-surface">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 app-heading">
                <TrendingUp className="w-5 h-5" />
                المنتجات الأكثر مبيعاً
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">المنتج</TableHead>
                    <TableHead className="text-right">الكمية المباعة</TableHead>
                    <TableHead className="text-right">إجمالي الإيرادات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(rowsOrEmpty as TopSellingRow[]).map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{formatQuantity(item.quantity, item.unitType)}</TableCell>
                      <TableCell className="font-semibold text-blue-600">
                        {formatCurrency(item.revenue)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );

      case "purchased-items":
        return (
          <Card className="app-surface">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 app-heading">
                <Package className="w-5 h-5" />
                المنتجات التي تم شراؤها
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">المنتج</TableHead>
                    <TableHead className="text-right">الكمية المشتراة</TableHead>
                    <TableHead className="text-right">إجمالي التكلفة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(rowsOrEmpty as PurchasedItemsRow[]).map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{formatQuantity(item.quantity, item.unitType)}</TableCell>
                      <TableCell className="font-semibold text-green-600">
                        {formatCurrency(item.cost)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );

      case "sold-items":
        return (
          <Card className="app-surface">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 app-heading">
                <Package className="w-5 h-5" />
                المنتجات التي تم بيعها
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">المنتج</TableHead>
                    <TableHead className="text-right">الكمية المباعة</TableHead>
                    <TableHead className="text-right">الكمية المتبقية</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(rowsOrEmpty as SoldItemsRow[]).map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-blue-600">
                        {formatQuantity(item.quantity, item.unitType)}
                      </TableCell>
                      <TableCell className="font-semibold text-orange-600">
                        {formatQuantity(item.remaining, item.unitType)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold app-heading">التقارير والإحصائيات</h2>
      </div>

      <Card className="app-surface-muted" dir="rtl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 app-heading">
            <FileText className="w-6 h-6" />
            إعدادات التقرير
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>نوع التقرير</Label>
              <Select value={selectedReport} onValueChange={(value) => setSelectedReport(value as ReportType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">تقرير المبيعات</SelectItem>
                  <SelectItem value="purchases">تقرير المشتريات</SelectItem>
                  <SelectItem value="expenses">تقرير المصروفات</SelectItem>
                  <SelectItem value="profits">تقرير الأرباح</SelectItem>
                  <SelectItem value="top-selling">المنتجات الأكثر مبيعاً</SelectItem>
                  <SelectItem value="purchased-items">المنتجات المشتراة</SelectItem>
                  <SelectItem value="sold-items">المنتجات المباعة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>من تاريخ</Label>
              <DateInput
                value={dateFrom}
                onChange={setDateFrom}
                placeholder="من تاريخ"
              />
            </div>
            
            <div className="space-y-2">
              <Label>إلى تاريخ</Label>
              <DateInput
                value={dateTo}
                onChange={setDateTo}
                placeholder="إلى تاريخ"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="invisible">إجراءات</Label>
              <Button 
                onClick={generateReport}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500"
              >
                <Calendar className="w-4 h-4 me-2" />
                إنشاء التقرير
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {renderReportContent()}
    </div>
  );
};

export default ReportsSection;
