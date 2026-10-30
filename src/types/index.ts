export type UserRole = 'admin' | 'manager' | 'staff';
export type UserStatus = 'active' | 'inactive';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id: number;
  name: string;
  description: string;
  product_count?: number;
  created_at?: string;
}

export interface Supplier {
  id: number;
  company_name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  status: 'active' | 'inactive';
  product_count?: number;
  po_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  description: string;
  category_id: number;
  category_name?: string;
  supplier_id: number | null;
  supplier_name?: string;
  unit_price: number;
  cost_price: number;
  available_quantity: number;
  minimum_stock_level: number;
  unit_of_measure: string;
  status: 'active' | 'inactive';
  stock_status?: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  total_valuation?: number;
  total_cost_valuation?: number;
  created_at?: string;
  updated_at?: string;
}

export interface StockMovement {
  id: number;
  product_id: number;
  product_name?: string;
  product_sku?: string;
  unit_of_measure?: string;
  current_stock?: number;
  movement_type: 'IN' | 'OUT';
  quantity: number;
  unit_price?: number;
  reference_number: string;
  reason: string;
  supplier_id?: number | null;
  supplier_name?: string;
  user_id?: number;
  user_name?: string;
  date: string;
  notes?: string;
  created_at?: string;
}

export type POStatus = 'DRAFT' | 'ORDERED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';

export interface PurchaseOrderItem {
  id: number;
  purchase_order_id: number;
  product_id: number;
  product_name?: string;
  product_sku?: string;
  unit_of_measure?: string;
  current_stock?: number;
  quantity: number;
  unit_price: number;
  total_price: number;
  received_quantity: number;
  remaining_quantity?: number;
}

export interface PurchaseOrder {
  id: number;
  order_number: string;
  supplier_id: number;
  supplier_name?: string;
  supplier_email?: string;
  supplier_phone?: string;
  supplier_address?: string;
  supplier_contact?: string;
  order_date: string;
  expected_delivery_date: string | null;
  total_amount: number;
  status: POStatus;
  notes: string;
  created_by?: number;
  created_by_name?: string;
  item_count?: number;
  total_ordered_units?: number;
  total_received_units?: number;
  created_at?: string;
  updated_at?: string;
}

export interface DashboardData {
  summary: {
    totalProducts: number;
    totalStock: number;
    totalValuation: number;
    totalCostValuation: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
  poStats: {
    totalOrders: number;
    draft: number;
    pending: number;
    partial: number;
    completed: number;
    totalAmount: number;
  };
  recentMovements: StockMovement[];
  criticalProducts: Array<{
    id: number;
    name: string;
    sku: string;
    available_quantity: number;
    minimum_stock_level: number;
    unit_of_measure: string;
    category_name: string;
    deficit: number;
  }>;
  movementChart: Array<{
    date: string;
    in_qty: number;
    out_qty: number;
  }>;
  categoryBreakdown: Array<{
    name: string;
    product_count: number;
    total_quantity: number;
    valuation: number;
  }>;
}
