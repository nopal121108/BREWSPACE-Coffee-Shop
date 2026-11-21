export type UserRole = 'admin' | 'kasir';
export type UserStatus = 'active' | 'inactive';

export interface User {
  id: number;
  username: string;
  fullName: string;
  full_name?: string;
  role: UserRole;
  status?: UserStatus;
  createdAt?: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  status: 'active' | 'inactive';
  product_count?: number;
}

export interface Product {
  id: number;
  category_id: number;
  name: string;
  description?: string | null;
  price: number;
  stock: number;
  min_stock: number;
  image_url: string;
  status: 'active' | 'inactive';
  category_name?: string;
  category_slug?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type OrderStatus =
  | 'menunggu_konfirmasi'
  | 'dikonfirmasi'
  | 'sedang_disiapkan'
  | 'siap_diambil'
  | 'selesai'
  | 'ditolak'
  | 'dibatalkan';

export interface CustomerOrderItem {
  productId: number;
  name: string;
  categoryName?: string;
  price: number;
  quantity: number;
  subtotal: number;
  notes?: string;
}

export interface CustomerOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  tableNumber?: string;
  notes?: string;
  items: CustomerOrderItem[];
  subtotal: number;
  tax: number;
  totalAmount: number;
  status: OrderStatus;
  statusNotes?: string;
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
  confirmedBy?: string;
  rejectedReason?: string;
  cancelledAt?: string;
}

export interface Transaction {
  id: number;
  invoice_number: string;
  user_id: number;
  cashier_name: string;
  subtotal: number;
  tax: number;
  discount: number;
  total_amount: number;
  cash_received: number;
  change_amount: number;
  payment_method: string;
  payment_status: string;
  customer_name?: string | null;
  notes?: string | null;
  created_at: string;
  total_items?: number;
  cancelled_at?: string | null;
  cancelled_by?: string | null;
  cancel_reason?: string | null;
  items?: TransactionDetail[];
}

export interface TransactionDetail {
  id?: number;
  transaction_id?: number;
  product_id: number;
  product_name: string;
  category_name?: string | null;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface StockMovement {
  id: number;
  product_id: number;
  change_type: 'sale' | 'restock' | 'adjustment' | 'initial' | 'cancellation';
  quantity_change: number;
  previous_stock: number;
  current_stock: number;
  reference_id?: string | null;
  notes?: string | null;
  created_by: string;
  created_at: string;
  product_name?: string;
  category_name?: string;
}

export interface Settings {
  store_name: string;
  store_tagline?: string;
  store_address: string;
  store_phone: string;
  store_email?: string;
  tax_percentage: string;
  currency_symbol: string;
  receipt_footer: string;
}

