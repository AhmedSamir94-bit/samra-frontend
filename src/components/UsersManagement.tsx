import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Edit, Loader2, Plus, Trash2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import type { User, UserRole } from "@/types";
import ConfirmDeleteDialog from "./ConfirmDeleteDialog";

const roleLabels: Record<UserRole, string> = {
  super_admin: "سوبر أدمن",
  admin: "أدمن",
};

const emptyForm = {
  username: "",
  password: "",
  name: "",
  role: "admin" as UserRole,
};

const UsersManagement = () => {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: api.getUsers,
  });

  const createMutation = useMutation({
    mutationFn: api.createUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Parameters<typeof api.updateUser>[1];
    }) => api.updateUser(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });

  const resetForm = () => {
    setEditingUser(null);
    setFormData(emptyForm);
  };

  const openCreate = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: "",
      name: user.name,
      role: user.role || "admin",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.username || !formData.name || !formData.role) {
      toast({
        title: "خطأ في البيانات",
        description: "يرجى تعبئة جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }

    if (!editingUser && formData.password.length < 4) {
      toast({
        title: "خطأ في البيانات",
        description: "كلمة المرور يجب أن تكون 4 أحرف على الأقل",
        variant: "destructive",
      });
      return;
    }

    if (editingUser && formData.password && formData.password.length < 4) {
      toast({
        title: "خطأ في البيانات",
        description: "كلمة المرور يجب أن تكون 4 أحرف على الأقل",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingUser) {
        await updateMutation.mutateAsync({
          id: editingUser.id,
          data: {
            username: formData.username,
            name: formData.name,
            role: formData.role,
            ...(formData.password ? { password: formData.password } : {}),
          },
        });
        toast({
          title: "تم تحديث المستخدم",
          description: `تم تحديث ${formData.name} بنجاح`,
        });
      } else {
        await createMutation.mutateAsync({
          username: formData.username,
          password: formData.password,
          name: formData.name,
          role: formData.role,
        });
        toast({
          title: "تم إضافة المستخدم",
          description: `تم إضافة ${formData.name} بنجاح`,
        });
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast({
        title: "خطأ",
        description:
          error instanceof Error ? error.message : "فشل حفظ المستخدم",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast({
        title: "تم حذف المستخدم",
        description: "تم حذف المستخدم بنجاح",
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description:
          error instanceof Error ? error.message : "فشل حذف المستخدم",
        variant: "destructive",
      });
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4" dir="rtl">
      <Card className="app-surface-muted">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 app-heading">
              <Users className="w-5 h-5" />
              إدارة المستخدمين
            </CardTitle>
            <Dialog
              open={isDialogOpen}
              onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) resetForm();
              }}
            >
              <DialogTrigger asChild>
                <Button
                  className="bg-gradient-to-r from-blue-500 to-purple-500"
                  onClick={openCreate}
                >
                  <Plus className="w-4 h-4 me-2" />
                  إضافة مستخدم
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md" dir="rtl">
                <DialogHeader>
                  <DialogTitle>
                    {editingUser ? "تعديل المستخدم" : "إضافة مستخدم جديد"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="userName">الاسم *</Label>
                    <Input
                      id="userName"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="اسم المستخدم الظاهر"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="username">اسم الدخول *</Label>
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) =>
                        setFormData({ ...formData, username: e.target.value })
                      }
                      placeholder="username"
                      dir="ltr"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">
                      كلمة المرور {editingUser ? "(اختياري)" : "*"}
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      placeholder={
                        editingUser
                          ? "اتركها فارغة للإبقاء على الحالية"
                          : "كلمة المرور"
                      }
                      dir="ltr"
                      required={!editingUser}
                    />
                  </div>
                  <div>
                    <Label>الدور *</Label>
                    <Select
                      value={formData.role}
                      onValueChange={(value: UserRole) =>
                        setFormData({ ...formData, role: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الدور" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="super_admin">
                          سوبر أدمن — صلاحيات كاملة
                        </SelectItem>
                        <SelectItem value="admin">
                          أدمن — نقطة البيع فقط
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : editingUser ? (
                        "تحديث"
                      ) : (
                        "إضافة"
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      إلغاء
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="rounded-md border border-blue-100 dark:border-slate-700 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الاسم</TableHead>
                    <TableHead className="text-right">اسم الدخول</TableHead>
                    <TableHead className="text-right">الدور</TableHead>
                    <TableHead className="text-right">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell dir="ltr" className="text-left font-mono">
                        {user.username}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            user.role === "super_admin"
                              ? "border-purple-200 text-purple-700 dark:text-purple-400 bg-purple-50"
                              : "border-blue-200 text-blue-700 bg-blue-50"
                          }
                        >
                          {roleLabels[user.role] || user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-start">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => openEdit(user)}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            disabled={currentUser?.id === user.id}
                            onClick={() => setDeleteUserId(user.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {users.length === 0 && (
                <p className="text-center text-gray-500 py-8">
                  لا يوجد مستخدمون
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDeleteDialog
        open={!!deleteUserId}
        onOpenChange={(open) => {
          if (!open) setDeleteUserId(null);
        }}
        onConfirm={() => {
          if (deleteUserId) {
            void handleDelete(deleteUserId);
          }
        }}
        description="سيتم حذف المستخدم نهائياً ولا يمكن التراجع عن هذا الإجراء."
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};

export default UsersManagement;
