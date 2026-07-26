import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ShoppingCart,
  Package,
  FileText,
  BarChart3,
  Calculator,
  Receipt,
  LogOut,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import SalesInterface from "@/components/SalesInterface";
import ProductManagement from "@/components/ProductManagement";
import PurchaseInvoices from "@/components/PurchaseInvoices";
import ExpensesManagement from "@/components/ExpensesManagement";
import ReportsSection from "@/components/ReportsSection";
import SalesInvoices from "@/components/SalesInvoices";
import UsersManagement from "@/components/UsersManagement";
import { useAuth } from "@/contexts/AuthContext";
import { PwaInstallButton } from "@/components/PwaInstallButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { api } from "@/lib/api";
import type { UserRole } from "@/types";

const navTabs: {
  value: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  roles: UserRole[];
}[] = [
  {
    value: "sales",
    label: "نقطة البيع",
    shortLabel: "البيع",
    icon: ShoppingCart,
    roles: ["super_admin", "admin"],
  },
  {
    value: "products",
    label: "المنتجات",
    shortLabel: "المنتجات",
    icon: Package,
    roles: ["super_admin"],
  },
  {
    value: "sales-invoices",
    label: "فواتير المبيعات",
    shortLabel: "مبيعات",
    icon: Receipt,
    roles: ["super_admin"],
  },
  {
    value: "invoices",
    label: "فواتير الشراء",
    shortLabel: "شراء",
    icon: FileText,
    roles: ["super_admin"],
  },
  {
    value: "expenses",
    label: "المصروفات",
    shortLabel: "مصروفات",
    icon: Wallet,
    roles: ["super_admin"],
  },
  {
    value: "reports",
    label: "التقارير",
    shortLabel: "تقارير",
    icon: BarChart3,
    roles: ["super_admin"],
  },
  {
    value: "users",
    label: "المستخدمون",
    shortLabel: "مستخدمون",
    icon: Users,
    roles: ["super_admin"],
  },
];

const roleLabels: Record<UserRole, string> = {
  super_admin: "سوبر أدمن",
  admin: "أدمن",
};

const tabTriggerClassName =
  "shrink-0 min-w-[4.75rem] flex-1 flex-col gap-1 px-2 py-2 h-auto whitespace-normal leading-tight text-center sm:min-w-0 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white";

const Index = () => {
  const { user, logout } = useAuth();
  const role: UserRole = user?.role || "super_admin";

  const visibleTabs = useMemo(
    () => navTabs.filter((tab) => tab.roles.includes(role)),
    [role],
  );

  const [activeTab, setActiveTab] = useState(visibleTabs[0]?.value || "sales");

  useEffect(() => {
    if (!visibleTabs.some((tab) => tab.value === activeTab)) {
      setActiveTab(visibleTabs[0]?.value || "sales");
    }
  }, [activeTab, visibleTabs]);

  const { isSuccess: isBackendConnected, isError: isBackendDisconnected } = useQuery({
    queryKey: ["health"],
    queryFn: api.health,
    retry: 1,
    refetchInterval: 30000,
  });

  const tabsColsClass =
    visibleTabs.length <= 1
      ? "sm:grid-cols-1"
      : visibleTabs.length === 2
        ? "sm:grid-cols-2"
        : visibleTabs.length <= 4
          ? "sm:grid-cols-4"
          : visibleTabs.length === 5
            ? "sm:grid-cols-5"
            : visibleTabs.length === 6
              ? "sm:grid-cols-6"
              : "sm:grid-cols-7";

  return (
    <div className="app-page" dir="rtl">
      <div className="app-surface border-b sticky top-0 z-50">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <Calculator className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent truncate">
                  نظام نقطة البيع
                </h1>
                <p className="text-xs sm:text-sm app-muted truncate">
                  إدارة ذكية للمبيعات والمخزون
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="secondary"
                className={
                  isBackendConnected
                    ? "bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800"
                    : isBackendDisconnected
                    ? "bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800"
                    : "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800"
                }
              >
                {isBackendConnected ? "متصل" : isBackendDisconnected ? "غير متصل" : "جاري الاتصال..."}
              </Badge>
              {user && (
                <Badge variant="outline" className="text-gray-700 border-gray-200 dark:text-slate-300 dark:border-slate-600">
                  {user.name}
                </Badge>
              )}
              {user && (
                <Badge
                  variant="outline"
                  className={
                    role === "super_admin"
                      ? "text-purple-700 border-purple-200 bg-purple-50 dark:text-purple-300 dark:border-purple-800 dark:bg-purple-950/50"
                      : "text-blue-700 border-blue-200 bg-blue-50 dark:text-blue-300 dark:border-blue-800 dark:bg-blue-950/50"
                  }
                >
                  {roleLabels[role]}
                </Badge>
              )}
              <Badge variant="outline" className="text-blue-600 border-blue-200 dark:text-blue-400 dark:border-blue-800">
                المتجر الرئيسي
              </Badge>
              <ThemeToggle />
              <PwaInstallButton variant="compact" />
              <Button variant="outline" size="sm" onClick={() => logout()} className="gap-1">
                <LogOut className="w-4 h-4" />
                خروج
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <div className="-mx-3 sm:mx-0 px-3 sm:px-0 overflow-x-auto">
            <TabsList
              className={`inline-flex w-max min-w-full sm:grid sm:w-full ${tabsColsClass} h-auto min-h-[4.5rem] sm:h-16 app-surface-muted border p-1 gap-1`}
              dir="rtl"
            >
              {visibleTabs.map(({ value, label, shortLabel, icon: Icon }) => (
                <TabsTrigger key={value} value={value} className={tabTriggerClassName}>
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                  <span className="text-[10px] sm:hidden">{shortLabel}</span>
                  <span className="hidden sm:inline text-xs">{label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="sales" className="m-0">
            <SalesInterface isActive={activeTab === "sales"} />
          </TabsContent>

          {role === "super_admin" && (
            <>
              <TabsContent value="products" className="m-0">
                <ProductManagement isActive={activeTab === "products"} />
              </TabsContent>

              <TabsContent value="sales-invoices" className="m-0">
                <SalesInvoices />
              </TabsContent>

              <TabsContent value="invoices" className="m-0">
                <PurchaseInvoices isActive={activeTab === "invoices"} />
              </TabsContent>

              <TabsContent value="expenses" className="m-0">
                <ExpensesManagement />
              </TabsContent>

              <TabsContent value="reports" className="m-0">
                <ReportsSection />
              </TabsContent>

              <TabsContent value="users" className="m-0">
                <UsersManagement />
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
