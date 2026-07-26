import type {
  AuthResponse,
  Category,
  Expense,
  ExpensePaymentMethod,
  ExpenseType,
  ExpenseTypeOption,
  Product,
  PurchaseInvoice,
  PurchaseItem,
  ReportData,
  ReportType,
  SaleInvoice,
  User,
} from "@/types";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  isAccessTokenExpired,
  notifyAuthExpired,
  setTokens,
} from "@/lib/auth-storage";

const API_URL =
  import.meta.env.VITE_API_URL || "https://samra-backend.vercel.app/api";

const PUBLIC_PATHS = new Set([
  "/health",
  "/auth/login",
  "/auth/refresh",
]);

class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

let refreshPromise: Promise<AuthResponse> | null = null;

async function parseError(response: Response) {
  const error = await response.json().catch(() => ({
    message: response.statusText,
  }));
  return error.message || "Request failed";
}

async function refreshAccessToken(): Promise<AuthResponse> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new ApiError("Session expired", 401);
  }

  console.log("[auth] refreshing access token");

  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    clearTokens();
    notifyAuthExpired();
    throw new ApiError(await parseError(response), response.status);
  }

  const data = (await response.json()) as AuthResponse;
  setTokens(data.accessToken, data.refreshToken, data.expiresIn);
  console.log("[auth] access token refreshed, expiresIn=", data.expiresIn);
  return data;
}

async function ensureAccessToken(): Promise<string | null> {
  if (!getRefreshToken()) {
    return getAccessToken();
  }

  if (isAccessTokenExpired()) {
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
    }
    await refreshPromise;
  }

  return getAccessToken();
}

async function request<T>(
  path: string,
  options?: RequestInit,
  retry = true,
): Promise<T> {
  const isPublic = PUBLIC_PATHS.has(path);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string> | undefined),
  };

  if (!isPublic) {
    try {
      const accessToken = await ensureAccessToken();
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }
    } catch (error) {
      if (!retry) throw error;
      // Fall through — request may still 401 and we handle below
    }
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (
    response.status === 401 &&
    retry &&
    !isPublic &&
    path !== "/auth/logout"
  ) {
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
    }

    try {
      await refreshPromise;
      return request<T>(path, options, false);
    } catch (error) {
      clearTokens();
      notifyAuthExpired();
      throw error;
    }
  }

  if (!response.ok) {
    if (response.status === 401 && !isPublic) {
      clearTokens();
      notifyAuthExpired();
    }
    throw new ApiError(await parseError(response), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

function buildQuery(params?: Record<string, string | undefined>) {
  if (!params) return "";
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  const query = search.toString();
  return query ? `?${query}` : "";
}

export const api = {
  health: () => request<{ status: string }>("/health", undefined, false),

  login: (username: string, password: string) =>
    request<AuthResponse>(
      "/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ username, password }),
      },
      false,
    ),

  refresh: (refreshToken: string) =>
    request<AuthResponse>(
      "/auth/refresh",
      {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      },
      false,
    ),

  logout: () =>
    request<{ message: string }>("/auth/logout", { method: "POST" }, false),

  me: () => request<User>("/auth/me"),

  createAdmin: (data: {
    username: string;
    password: string;
    name: string;
    role?: User["role"];
  }) =>
    request<User>("/auth/admins", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getUsers: () => request<User[]>("/users"),
  createUser: (data: {
    username: string;
    password: string;
    name: string;
    role: User["role"];
  }) =>
    request<User>("/users", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateUser: (
    id: string,
    data: {
      username?: string;
      password?: string;
      name?: string;
      role?: User["role"];
    },
  ) =>
    request<User>(`/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteUser: (id: string) =>
    request<void>(`/users/${id}`, { method: "DELETE" }),

  getCategories: () => request<Category[]>("/categories"),
  createCategory: (data: Omit<Category, "id">) =>
    request<Category>("/categories", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateCategory: (id: string, data: Partial<Omit<Category, "id">>) =>
    request<Category>(`/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteCategory: (id: string) =>
    request<void>(`/categories/${id}`, { method: "DELETE" }),

  getProducts: (search?: string) =>
    request<Product[]>(`/products${buildQuery({ search })}`),
  getProductByBarcode: (code: string) =>
    request<Product>(`/products/barcode/${encodeURIComponent(code)}`),
  createProduct: (data: Omit<Product, "id">) =>
    request<Product>("/products", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateProduct: (id: string, data: Partial<Omit<Product, "id">>) =>
    request<Product>(`/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteProduct: (id: string) =>
    request<void>(`/products/${id}`, { method: "DELETE" }),

  getSales: (from?: string, to?: string) =>
    request<SaleInvoice[]>(`/sales${buildQuery({ from, to })}`),
  getSale: (id: string) => request<SaleInvoice>(`/sales/${id}`),
  createSale: (
    items: { id: string; name: string; quantity: number }[],
    cashier?: string,
  ) =>
    request<SaleInvoice>("/sales", {
      method: "POST",
      body: JSON.stringify({ items, cashier }),
    }),

  getPurchases: (from?: string, to?: string) =>
    request<PurchaseInvoice[]>(`/purchases${buildQuery({ from, to })}`),
  getPurchase: (id: string) => request<PurchaseInvoice>(`/purchases/${id}`),
  getNextPurchaseInvoiceNumber: () =>
    request<{ invoiceNumber: string }>("/purchases/next-number"),
  createPurchase: (data: {
    supplier: string;
    date?: string;
    items: PurchaseItem[];
  }) =>
    request<PurchaseInvoice>("/purchases", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updatePurchase: (
    id: string,
    data: {
      supplier: string;
      date?: string;
      items: PurchaseItem[];
    },
  ) =>
    request<PurchaseInvoice>(`/purchases/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  getExpenseTypes: () => request<ExpenseTypeOption[]>("/expenses/types"),
  getExpenses: (from?: string, to?: string, type?: string) =>
    request<Expense[]>(`/expenses${buildQuery({ from, to, type })}`),
  getExpense: (id: string) => request<Expense>(`/expenses/${id}`),
  getNextExpenseNumber: () =>
    request<{ expenseNumber: string }>("/expenses/next-number"),
  createExpense: (data: {
    type: ExpenseType;
    description: string;
    amount: number;
    date?: string;
    paymentMethod?: ExpensePaymentMethod;
    notes?: string;
  }) =>
    request<Expense>("/expenses", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateExpense: (
    id: string,
    data: {
      type?: ExpenseType;
      description?: string;
      amount?: number;
      date?: string;
      paymentMethod?: ExpensePaymentMethod;
      notes?: string;
    },
  ) =>
    request<Expense>(`/expenses/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteExpense: (id: string) =>
    request<void>(`/expenses/${id}`, { method: "DELETE" }),

  getReport: (type: ReportType, from?: string, to?: string) =>
    request<ReportData>(`/reports/${type}${buildQuery({ from, to })}`),
};

export { ApiError };
