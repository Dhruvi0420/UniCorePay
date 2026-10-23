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
  studentId?: string;
  items: OrderItem[];
  totalPrice: number;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  time: string;
  createdAt?: string;
  selfHealingNotes?: string[];
}

export interface StudentProfile {
  student_id: string;
  name: string;
  branch: string;
  email: string;
  phone?: string;
  avatar: string;
  wallet_balance: number;
  orders_count: number;
  total_spent: number;
  last_order_at?: string | null;
  preferred_payment: string;
}

export interface CRMStats {
  total_orders: number;
  total_revenue: number;
  total_students: number;
  active_ordering_students: number;
  average_order_value: number;
  payment_stats: {
    upi: { count: number; amount: number; percentage: number };
    campus_wallet: { count: number; amount: number; percentage: number };
  };
  prep_stats: {
    received: number;
    preparing: number;
    ready: number;
    completed: number;
  };
  students: StudentProfile[];
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

export interface ExternalServiceInfo {
  id: string;
  name: string;
  provider: string;
  endpoint: string;
  type: string;
  status: "UP" | "DOWN" | "DEGRADED";
  http_code: number;
  latency_ms: number;
  packet_loss_pct: number;
  last_heartbeat: string;
}
