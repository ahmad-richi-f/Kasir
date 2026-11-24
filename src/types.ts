export interface EmployeeUser {
  id: number;
  username: string;
  fullName: string;
  role: 'admin' | 'kasir';
}

export interface EmployeeRecord extends EmployeeUser {
  isActive: boolean;
  createdAt: string;
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  category: string;
  buyPrice: number;
  sellPrice: number;
  stock: number;
  minStock: number;
  unit: string;
  updatedAt: string;
}

export interface CartItem {
  product: Product;
  qty: number;
}

export interface TransactionItem {
  productId: number;
  sku: string;
  productName: string;
  qty: number;
  unitPrice: number;
  subtotal: number;
}

export interface Transaction {
  id: number;
  invoiceNo: string;
  userId: number;
  cashierName: string;
  paymentMethod: 'cash' | 'qris';
  subtotal: number;
  discount: number;
  totalAmount: number;
  cashPaid: number;
  changeAmount: number;
  qrisRef: string | null;
  items: TransactionItem[];
  createdAt: string;
}

export interface DailyReport {
  date: string;
  summary: {
    totalRevenue: number;
    transactionCount: number;
    cashTotal: number;
    qrisTotal: number;
    itemsSold: number;
  };
  topProducts: Array<{
    sku: string;
    name: string;
    qty: number;
    revenue: number;
  }>;
  transactions: Transaction[];
}

export interface LowStockWarning {
  id: number;
  name: string;
  stock: number;
  minStock: number;
  unit: string;
}

export interface PhpFileEntry {
  path: string;
  content: string;
}
