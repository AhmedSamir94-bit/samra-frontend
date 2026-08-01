
import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Tag, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Category } from "@/types";
import ConfirmDeleteDialog from "./ConfirmDeleteDialog";

interface CategoryManagementProps {
  categories: Category[];
  onCreate: (data: Omit<Category, "id">) => Promise<void>;
  onUpdate: (id: string, data: Omit<Category, "id">) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  isSubmitting?: boolean;
}

const CategoryManagement = ({
  categories,
  onCreate,
  onUpdate,
  onDelete,
  isSubmitting = false,
}: CategoryManagementProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const pendingDeleteIdRef = useRef<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#3B82F6"
  });
  
  const { toast } = useToast();

  const colors = [
    "#3B82F6", "#10B981", "#F59E0B", "#EF4444", 
    "#8B5CF6", "#06B6D4", "#84CC16", "#F97316"
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast({
        title: "خطأ في البيانات",
        description: "يرجى إدخال اسم الفئة",
        variant: "destructive"
      });
      return;
    }

    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        color: formData.color
      };

      if (editingCategory) {
        await onUpdate(editingCategory.id, payload);
        toast({
          title: "تم تحديث الفئة",
          description: `تم تحديث فئة ${payload.name} بنجاح`,
        });
      } else {
        await onCreate(payload);
        toast({
          title: "تم إضافة الفئة",
          description: `تم إضافة فئة ${payload.name} بنجاح`,
        });
      }

      setIsDialogOpen(false);
      setEditingCategory(null);
      setFormData({ name: "", description: "", color: "#3B82F6" });
    } catch (error) {
      toast({
        title: "خطأ",
        description: error instanceof Error ? error.message : "فشل حفظ الفئة",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || "",
      color: category.color
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await onDelete(id);
      toast({
        title: "تم حذف الفئة",
        description: "تم حذف الفئة بنجاح",
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: error instanceof Error ? error.message : "فشل حذف الفئة",
        variant: "destructive"
      });
    }
  };

  const requestDelete = (id: string) => {
    pendingDeleteIdRef.current = id;
    setIsDeleteConfirmOpen(true);
  };

  return (
    <Card className="app-surface-muted" dir="rtl">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2 app-heading">
            <Tag className="w-5 h-5" />
            إدارة الفئات
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                size="sm"
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                onClick={() => {
                  setEditingCategory(null);
                  setFormData({ name: "", description: "", color: "#3B82F6" });
                }}
              >
                <Plus className="w-4 h-4 me-2" />
                إضافة فئة
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md" dir="rtl">
              <DialogHeader>
                <DialogTitle>
                  {editingCategory ? "تعديل الفئة" : "إضافة فئة جديدة"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-right">اسم الفئة *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="أدخل اسم الفئة"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="description" className="text-right">وصف الفئة</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="وصف اختياري للفئة"
                  />
                </div>
                <div>
                  <Label className="text-right">لون الفئة</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {colors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`w-8 h-8 rounded-full border-2 ${
                          formData.color.toLowerCase() === color.toLowerCase()
                            ? "border-gray-800"
                            : "border-gray-300"
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setFormData({ ...formData, color })}
                        aria-label={`اختيار اللون ${color}`}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-3 mt-3">
                    <Label htmlFor="categoryColor" className="shrink-0">
                      لون مخصص
                    </Label>
                    <input
                      id="categoryColor"
                      type="color"
                      value={formData.color}
                      onChange={(e) =>
                        setFormData({ ...formData, color: e.target.value.toUpperCase() })
                      }
                      className="h-10 w-14 cursor-pointer rounded-md border border-input bg-background p-1"
                    />
                    <Input
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      placeholder="#3B82F6"
                      className="flex-1 font-mono uppercase"
                      dir="ltr"
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button type="submit" disabled={isSubmitting} className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500">
                    {editingCategory ? "تحديث" : "إضافة"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    إلغاء
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {categories.map((category) => (
            <div
              key={category.id}
              className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-500 flex items-center justify-between group hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <div>
                  <span className="font-medium text-sm">{category.name}</span>
                  {category.description && (
                    <p className="text-xs app-muted">{category.description}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => handleEdit(category)}
                  className="h-6 w-6 p-0"
                >
                  <Edit className="w-3 h-3" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    requestDelete(category.id);
                  }}
                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700 dark:text-red-400"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        {categories.length === 0 && (
          <div className="text-center py-8 app-muted">
            <Package className="w-12 h-12 mx-auto mb-4 text-slate-400" />
            <p>لا توجد فئات محددة</p>
            <p className="text-sm mt-2">قم بإضافة فئة جديدة لتنظيم المنتجات</p>
          </div>
        )}
      </CardContent>

      <ConfirmDeleteDialog
        open={isDeleteConfirmOpen}
        onOpenChange={(open) => {
          setIsDeleteConfirmOpen(open);
          if (!open) pendingDeleteIdRef.current = null;
        }}
        onConfirm={() => {
          const id = pendingDeleteIdRef.current;
          if (id) {
            void handleDelete(id);
          }
        }}
        description="سيتم حذف الفئة نهائياً ولا يمكن التراجع عن هذا الإجراء."
        isLoading={isSubmitting}
      />
    </Card>
  );
};

export default CategoryManagement;
