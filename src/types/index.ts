export type UserRole = "super_admin" | "admin";
export type ProductUnit = "piece" | "kg";

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
}


export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  color: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  cost?: number;
  stock: number;
  unitType?: ProductUnit;
  barcode?: string;
  category?: string;
}

export interface SaleItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  barcode?: string;
  unitType?: ProductUnit;
}

export interface SaleInvoice {
  id: string;
  invoiceNumber: string;
  date: string;
  time: string;
  items: SaleItem[];
  total: number;
  cashier: string;
}

export interface PurchaseItem {
  productName: string;
  barcode: string;
  quantity: number;
  purchasePrice: number;
  salePrice: number;
  category: string;
  unitType?: ProductUnit;
}

export interface PurchaseInvoice {
  id: string;
  invoiceNumber: string;
  supplier: string;
  date: string;
  time: string;
  items: PurchaseItem[];
  total: number;
}

export interface SalesReportRow {
  date: string;
  invoices: number;
  quantitySold: number;
  revenue: number;
  cogs: number;
  netProfit: number;
}

export interface PurchasesReportRow {
  date: string;
  invoices: number;
  total: number;
  items: number;
}

export interface ProfitsReportRow {
  date: string;
  revenue: number;
  cogs: number;
  netProfit: number;
  purchases: number;
}

export interface TopSellingRow {
  name: string;
  quantity: number;
  revenue: number;
  unitType?: ProductUnit;
}

export interface PurchasedItemsRow {
  name: string;
  quantity: number;
  cost: number;
  unitType?: ProductUnit;
}

export interface SoldItemsRow {
  name: string;
  quantity: number;
  remaining: number;
  unitType?: ProductUnit;
}

export type ReportType =
  | "sales"
  | "purchases"
  | "profits"
  | "top-selling"
  | "purchased-items"
  | "sold-items";

export type ReportData =
  | SalesReportRow[]
  | PurchasesReportRow[]
  | ProfitsReportRow[]
  | TopSellingRow[]
  | PurchasedItemsRow[]
  | SoldItemsRow[];
