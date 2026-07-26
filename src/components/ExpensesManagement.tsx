import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Calendar,
  Edit,
  Loader2,
  Plus,
  Trash2,
  Wallet,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/currency";
import { api } from "@/lib/api";
import type {
  Expense,
  ExpensePaymentMethod,
  ExpenseType,
} from "@/types";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";

const paymentMethodLabels: Record<ExpensePaymentMethod, string> = {
  cash: "نقدي",
  card: "بطاقة",
  transfer: "تحويل",
};

function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const emptyForm = () => ({
  expenseNumber: "",
  type: "" as ExpenseType | "",
  description: "",
  amount: "",
  date: getTodayDateString(),
  paymentMethod: "cash" as ExpensePaymentMethod,
  notes: "",
});

const ExpensesManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null);
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [formData, setFormData] = useState(emptyForm);

  const { data: expenseTypes = [] } = useQuery({
    queryKey: ["expense-types"],
    queryFn: api.getExpenseTypes,
  });

  const typeLabel = (type: string) =>
    expenseTypes.find((item) => item.type === type)?.label || type;

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["expenses", filterFrom, filterTo, filterType],
    queryFn: () =>
      api.getExpenses(
        filterFrom || undefined,
        filterTo || undefined,
        filterType === "all" ? undefined : filterType,
      ),
  });

  const createMutation = useMutation({
    mutationFn: api.createExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Parameters<typeof api.updateExpense>[1];
    }) => api.updateExpense(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });

  const openCreate = useCallback(async () => {
    setEditingExpense(null);
    setFormData({ ...emptyForm(), expenseNumber: "..." });
    setIsFormOpen(true);

    try {
      const { expenseNumber } = await api.getNextExpenseNumber();
      setFormData((prev) => ({ ...prev, expenseNumber }));
    } catch {
      setFormData(emptyForm());
    }
  }, []);

  const openEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      expenseNumber: expense.expenseNumber,
      type: expense.type,
      description: expense.description,
      amount: String(expense.amount),
      date: expense.date,
      paymentMethod: expense.paymentMethod || "cash",
      notes: expense.notes || "",
    });
    setSelectedExpense(null);
    setIsFormOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const amount = Number(formData.amount);
    if (!formData.type || !formData.description.trim() || Number.isNaN(amount) || amount < 0) {
      toast({
        title: "خطأ في البيانات",
        description: "يرجى تعبئة النوع والوصف والمبلغ بشكل صحيح",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      type: formData.type as ExpenseType,
      description: formData.description.trim(),
      amount,
      date: formData.date || undefined,
      paymentMethod: formData.paymentMethod,
      notes: formData.notes.trim() || undefined,
    };

    try {
      if (editingExpense) {
        await updateMutation.mutateAsync({ id: editingExpense.id, data: payload });
        toast({ title: "تم التحديث", description: "تم تحديث المصروف بنجاح" });
      } else {
        await createMutation.mutateAsync(payload);
        toast({ title: "تمت الإضافة", description: "تم إضافة المصروف بنجاح" });
      }
      setIsFormOpen(false);
      setEditingExpense(null);
      setFormData(emptyForm());
    } catch (error) {
      toast({
        title: "فشلت العملية",
        description: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteExpenseId) return;
    try {
      await deleteMutation.mutateAsync(deleteExpenseId);
      toast({ title: "تم الحذف", description: "تم حذف المصروف بنجاح" });
      setDeleteExpenseId(null);
      setSelectedExpense(null);
    } catch (error) {
      toast({
        title: "فشل الحذف",
        description: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    }
  };

  const totalAmount = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4" dir="rtl">
      <Card className="app-surface">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 app-heading">
            <Wallet className="w-5 h-5" />
            المصروفات
          </CardTitle>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => void openCreate()} className="gap-2">
                <Plus className="w-4 h-4" />
                إضافة مصروف
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg" dir="rtl">
              <DialogHeader>
                <DialogTitle>
                  {editingExpense ? "تعديل مصروف" : "إضافة مصروف جديد"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>رقم المصروف</Label>
                  <Input value={formData.expenseNumber} readOnly />
                </div>

                <div className="space-y-2">
                  <Label>النوع</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, type: value as ExpenseType }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر نوع المصروف" />
                    </SelectTrigger>
                    <SelectContent>
                      {expenseTypes.map((item) => (
                        <SelectItem key={item.type} value={item.type}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>الوصف</Label>
                  <Input
                    value={formData.description}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: event.target.value,
                      }))
                    }
                    placeholder="مثال: فاتورة كهرباء شهر يوليو"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>المبلغ</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.amount}
                      onChange={(event) =>
                        setFormData((prev) => ({
                          ...prev,
                          amount: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>التاريخ</Label>
                    <DateInput
                      value={formData.date}
                      onChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          date: value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>طريقة الدفع</Label>
                  <Select
                    value={formData.paymentMethod}
                    onValueChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        paymentMethod: value as ExpensePaymentMethod,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(paymentMethodLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>ملاحظات</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        notes: event.target.value,
                      }))
                    }
                    rows={3}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isSaving}>
                  {isSaving && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                  {editingExpense ? "حفظ التعديلات" : "إضافة المصروف"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label>من تاريخ</Label>
              <DateInput value={filterFrom} onChange={setFilterFrom} />
            </div>
            <div className="space-y-1">
              <Label>إلى تاريخ</Label>
              <DateInput value={filterTo} onChange={setFilterTo} />
            </div>
            <div className="space-y-1">
              <Label>النوع</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="الكل" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الأنواع</SelectItem>
                  {expenseTypes.map((item) => (
                    <SelectItem key={item.type} value={item.type}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-lg bg-red-50 border border-red-100 dark:bg-red-950/40 dark:border-red-900 p-3 flex flex-col justify-center">
              <p className="text-xs app-muted">إجمالي المعروض</p>
              <p className="text-lg font-bold text-red-700 dark:text-red-400">
                {formatCurrency(totalAmount)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : expenses.length === 0 ? (
        <Card className="app-surface">
          <CardContent className="py-12 text-center app-muted">
            لا توجد مصروفات مطابقة
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {expenses.map((expense) => (
            <Card
              key={expense.id}
              className="app-surface cursor-pointer hover:shadow-md transition"
              onClick={() => setSelectedExpense(expense)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{expense.description}</CardTitle>
                    <p className="text-xs app-muted mt-1">{expense.expenseNumber}</p>
                  </div>
                  <Badge variant="secondary">{typeLabel(expense.type)}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xl font-bold text-red-600">
                  {formatCurrency(expense.amount)}
                </p>
                <div className="flex items-center justify-between text-sm app-muted">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {expense.date} · {expense.time}
                  </span>
                  <span>{paymentMethodLabels[expense.paymentMethod] || expense.paymentMethod}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={Boolean(selectedExpense)}
        onOpenChange={(open) => !open && setSelectedExpense(null)}
      >
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>تفاصيل المصروف</DialogTitle>
          </DialogHeader>
          {selectedExpense && (
            <div className="space-y-4">
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">الرقم</TableCell>
                    <TableCell>{selectedExpense.expenseNumber}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">النوع</TableCell>
                    <TableCell>{typeLabel(selectedExpense.type)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">الوصف</TableCell>
                    <TableCell>{selectedExpense.description}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">المبلغ</TableCell>
                    <TableCell className="text-red-600 font-semibold">
                      {formatCurrency(selectedExpense.amount)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">التاريخ</TableCell>
                    <TableCell>
                      {selectedExpense.date} · {selectedExpense.time}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">طريقة الدفع</TableCell>
                    <TableCell>
                      {paymentMethodLabels[selectedExpense.paymentMethod] ||
                        selectedExpense.paymentMethod}
                    </TableCell>
                  </TableRow>
                  {selectedExpense.notes && (
                    <TableRow>
                      <TableCell className="font-medium">ملاحظات</TableCell>
                      <TableCell>{selectedExpense.notes}</TableCell>
                    </TableRow>
                  )}
                  {selectedExpense.createdBy && (
                    <TableRow>
                      <TableCell className="font-medium">بواسطة</TableCell>
                      <TableCell>{selectedExpense.createdBy}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              <div className="flex gap-2">
                <Button
                  className="flex-1 gap-2"
                  variant="outline"
                  onClick={() => openEdit(selectedExpense)}
                >
                  <Edit className="w-4 h-4" />
                  تعديل
                </Button>
                <Button
                  className="flex-1 gap-2"
                  variant="destructive"
                  onClick={() => setDeleteExpenseId(selectedExpense.id)}
                >
                  <Trash2 className="w-4 h-4" />
                  حذف
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={Boolean(deleteExpenseId)}
        onOpenChange={(open) => !open && setDeleteExpenseId(null)}
        onConfirm={() => void handleDelete()}
        isLoading={deleteMutation.isPending}
        title="حذف المصروف"
        description="هل أنت متأكد من حذف هذا المصروف؟ لا يمكن التراجع عن هذه العملية."
      />
    </div>
  );
};

export default ExpensesManagement;
