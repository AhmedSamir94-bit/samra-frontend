
import { useState } from "react";
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
  type LucideIcon,
} from "lucide-react";
import SalesInterface from "@/components/SalesInterface";
import ProductManagement from "@/components/ProductManagement";
import PurchaseInvoices from "@/components/PurchaseInvoices";
import ReportsSection from "@/components/ReportsSection";
import SalesInvoices from "@/components/SalesInvoices";
import { useAuth } from "@/contexts/AuthContext";
import { PwaInstallButton } from "@/components/PwaInstallButton";
import { api } from "@/lib/api";

const navTabs: {
  value: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
}[] = [
  { value: "sales", label: "نقطة البيع", shortLabel: "البيع", icon: ShoppingCart },
  { value: "products", label: "المنتجات", shortLabel: "المنتجات", icon: Package },
  { value: "sales-invoices", label: "فواتير المبيعات", shortLabel: "مبيعات", icon: Receipt },
  { value: "invoices", label: "فواتير الشراء", shortLabel: "شراء", icon: FileText },
  { value: "reports", label: "التقارير", shortLabel: "تقارير", icon: BarChart3 },
];

const tabTriggerClassName =
  "shrink-0 min-w-[4.75rem] flex-1 flex-col gap-1 px-2 py-2 h-auto whitespace-normal leading-tight text-center sm:min-w-0 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white";

const Index = () => {
  const [activeTab, setActiveTab] = useState("sales");
  const { user, logout } = useAuth();

  const { isSuccess: isBackendConnected, isError: isBackendDisconnected } = useQuery({
    queryKey: ["health"],
    queryFn: api.health,
    retry: 1,
    refetchInterval: 30000,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50" dir="rtl">
      <div className="bg-white/80 backdrop-blur-sm border-b border-blue-100 sticky top-0 z-50">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <Calculator className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent truncate">
                  نظام نقطة البيع
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 truncate">
                  إدارة ذكية للمبيعات والمخزون
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="secondary"
                className={
                  isBackendConnected
                    ? "bg-green-100 text-green-800 border-green-200"
                    : isBackendDisconnected
                    ? "bg-red-100 text-red-800 border-red-200"
                    : "bg-yellow-100 text-yellow-800 border-yellow-200"
                }
              >
                {isBackendConnected ? "متصل" : isBackendDisconnected ? "غير متصل" : "جاري الاتصال..."}
              </Badge>
              {user && (
                <Badge variant="outline" className="text-gray-700 border-gray-200">
                  {user.name}
                </Badge>
              )}
              <Badge variant="outline" className="text-blue-600 border-blue-200">
                المتجر الرئيسي
              </Badge>
              <PwaInstallButton variant="compact" />
              <Button variant="outline" size="sm" onClick={() => logout()} className="gap-1">
                <LogOut className="w-4 h-4" />
                خروج
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <div className="-mx-3 sm:mx-0 px-3 sm:px-0 overflow-x-auto">
            <TabsList className="inline-flex w-max min-w-full sm:grid sm:w-full sm:grid-cols-5 h-auto min-h-[4.5rem] sm:h-16 bg-white/60 backdrop-blur-sm border border-blue-100 p-1 gap-1" dir="rtl">
              {navTabs.map(({ value, label, shortLabel, icon: Icon }) => (
                <TabsTrigger key={value} value={value} className={tabTriggerClassName}>
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                  <span className="text-[10px] sm:hidden">{shortLabel}</span>
                  <span className="hidden sm:inline text-xs">{label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Tab Content */}
          <TabsContent value="sales" className="m-0">
            <SalesInterface isActive={activeTab === "sales"} />
          </TabsContent>

          <TabsContent value="products" className="m-0">
            <ProductManagement isActive={activeTab === "products"} />
          </TabsContent>

          <TabsContent value="sales-invoices" className="m-0">
            <SalesInvoices />
          </TabsContent>

          <TabsContent value="invoices" className="m-0">
            <PurchaseInvoices isActive={activeTab === "invoices"} />
          </TabsContent>

          <TabsContent value="reports" className="m-0">
            <ReportsSection />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
