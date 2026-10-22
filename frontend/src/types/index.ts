// ============================================================
// SHARED DOMAIN TYPES & RBAC ROLES FOR UNICOREPAY
// ============================================================

export type UserRole = "student" | "admin";

export type OrderStatus = "received" | "preparing" | "ready" | "completed";
export type PaymentMethod = "upi" | "campus_wallet";
export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";
export type ComponentHealth = "healthy" | "degraded" | "down";

export interface FoodItem {
  id: string;
  name: string;
  description: string;
  price: number;
  emoji: string;
  category: string;
  available: boolean;
  created_at?: string;
}

export interface OrderItem {
  name: string;
  qty: number;
  price: number;
  emoji: string;
}

export interface KitchenOrder {
  id: string;
  tokenNumber: string;
  items: OrderItem[];
  totalPrice: number;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  time: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "ai" | "system";
  content: string;
  timestamp: string;
  tokenNumber?: string;
  orderSuccess?: boolean;
}

export interface Incident {
  id: string;
  timestamp: string;
  detected: string;
  diagnosed: string;
  actionTaken: string;
  recovered: boolean;
  rootCause: string;
  ttdMs?: number;
  ttrMs?: number;
  severity?: string;
}

export interface WalletTransaction {
  id: string;
  student_id: string;
  amount: number;
  type: "credit" | "debit";
  description: string;
  timestamp: string;
}

export interface SystemHealthState {
  aiAgent: ComponentHealth;
  upiGateway: ComponentHealth;
  campusWallet: ComponentHealth;
  database: ComponentHealth;
}

export interface SystemMetrics {
  totalOrders: number;
  failuresInjected: number;
  autoRecoveries: number;
  doubleChargesPrevented: number;
}
