const BASE_URL = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('stockmaster_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.error) {
        errorMessage = errorData.error;
      }
    } catch {
      // response wasn't JSON
    }
    throw new Error(errorMessage);
  }

  // Handle empty responses
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return (await response.json()) as T;
  }
  return {} as T;
}

export const api = {
  // Auth
  login: (credentials: { email: string; password: string }) =>
    request<{ token: string; user: any; message: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
  getMe: () => request<{ user: any }>('/auth/me'),
  updateProfile: (data: { name: string; currentPassword?: string; newPassword?: string }) =>
    request<{ message: string; user: any }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Dashboard
  getDashboardStats: () => request<any>('/dashboard/stats'),

  // Products
  getProducts: (params?: Record<string, any>) => {
    const query = new URLSearchParams(params as any).toString();
    return request<{ products: any[]; pagination: any }>(`/products${query ? `?${query}` : ''}`);
  },
  getProductById: (id: number) => request<{ product: any; recentMovements: any[] }>(`/products/${id}`),
  getLowStockProducts: () => request<{ lowStockProducts: any[]; totalCount: number; outOfStockCount: number }>('/products/low-stock'),
  createProduct: (data: any) =>
    request<{ message: string; product: any }>('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateProduct: (id: number, data: any) =>
    request<{ message: string; product: any }>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteProduct: (id: number) =>
    request<{ message: string }>(`/products/${id}`, {
      method: 'DELETE',
    }),

  // Categories
  getCategories: () => request<{ categories: any[] }>('/categories'),
  createCategory: (data: { name: string; description: string }) =>
    request<{ message: string; category: any }>('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateCategory: (id: number, data: { name: string; description: string }) =>
    request<{ message: string; category: any }>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteCategory: (id: number) =>
    request<{ message: string }>(`/categories/${id}`, {
      method: 'DELETE',
    }),

  // Suppliers
  getSuppliers: (params?: Record<string, any>) => {
    const query = new URLSearchParams(params as any).toString();
    return request<{ suppliers: any[] }>(`/suppliers${query ? `?${query}` : ''}`);
  },
  getSupplierById: (id: number) => request<{ supplier: any; products: any[] }>(`/suppliers/${id}`),
  createSupplier: (data: any) =>
    request<{ message: string; supplier: any }>('/suppliers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateSupplier: (id: number, data: any) =>
    request<{ message: string; supplier: any }>(`/suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteSupplier: (id: number) =>
    request<{ message: string }>(`/suppliers/${id}`, {
      method: 'DELETE',
    }),

  // Stock Movements
  getMovements: (params?: Record<string, any>) => {
    const query = new URLSearchParams(params as any).toString();
    return request<{ movements: any[]; pagination: any }>(`/movements${query ? `?${query}` : ''}`);
  },
  stockIn: (data: any) =>
    request<{ message: string; product: any; movement: any }>('/movements/stock-in', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  stockOut: (data: any) =>
    request<{ message: string; product: any; movement: any }>('/movements/stock-out', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Purchase Orders
  getOrders: (params?: Record<string, any>) => {
    const query = new URLSearchParams(params as any).toString();
    return request<{ orders: any[]; pagination: any }>(`/orders${query ? `?${query}` : ''}`);
  },
  getOrderById: (id: number) => request<{ order: any; items: any[] }>(`/orders/${id}`),
  createOrder: (data: any) =>
    request<{ message: string; order: any }>('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateOrderStatus: (id: number, status: string) =>
    request<{ message: string }>(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  receiveOrderItems: (id: number, data: { items: Array<{ item_id: number; quantity_to_receive: number }>; delivery_date?: string; notes?: string }) =>
    request<{ message: string; status: string }>(`/orders/${id}/receive`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteOrder: (id: number) =>
    request<{ message: string }>(`/orders/${id}`, {
      method: 'DELETE',
    }),

  // Reports
  getReportData: (reportType: string, params?: Record<string, any>) => {
    const query = new URLSearchParams(params as any).toString();
    return request<{ records: any[] }>(`/reports/${reportType}${query ? `?${query}` : ''}`);
  },
  downloadReportCSV: async (reportType: string, params?: Record<string, any>, defaultFilename = 'report.csv') => {
    const query = new URLSearchParams({ ...params, format: 'csv' } as any).toString();
    const token = localStorage.getItem('stockmaster_token');
    const response = await fetch(`${BASE_URL}/reports/${reportType}?${query}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!response.ok) {
      throw new Error('Failed to generate CSV export');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },

  // Users (Admin)
  getUsers: () => request<{ users: any[] }>('/users'),
  createUser: (data: any) =>
    request<{ message: string; user: any }>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateUser: (id: number, data: any) =>
    request<{ message: string; user: any }>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteUser: (id: number) =>
    request<{ message: string }>(`/users/${id}`, {
      method: 'DELETE',
    }),
};
