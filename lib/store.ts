/**
 * ============================================================
 * UNICOREPAY — In-Memory Store with JSON File Persistence
 * ============================================================
 * 
 * This module is the "brain" of the entire self-healing system.
 * It holds all application state in-memory for fast access, and
 * persists to a JSON file so state survives server restarts.
 * 
 * KEY CONCEPTS FOR HACKATHON PRESENTATION:
 * - Circuit Breaker state (CLOSED / OPEN / HALF_OPEN)
 * - Idempotency map to prevent double-charges
 * - Incident log for the live SRE dashboard
 * - Metrics counters for the health dashboard
 */

import fs from "fs";
import path from "path";

// ============================================================
// TYPE DEFINITIONS
// ============================================================

/** Possible states of the Circuit Breaker pattern */
export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

/** Status of each system component on the health dashboard */
export type ComponentHealth = "healthy" | "degraded" | "down";

/** A single order in the system */
export interface Order {
  id: string;
  tokenNumber: string;
  studentId: string;
  items: { name: string; qty: number; price: number }[];
  totalPrice: number;
  paymentMethod: "upi" | "campus_wallet";
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  tokenGenerated: boolean;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
}

/** An incident log entry displayed on the SRE dashboard */
export interface IncidentLog {
  id: string;
  timestamp: string;
  detected: string;
  diagnosed: string;
  actionTaken: string;
  recovered: boolean;
}

/** Live metrics for the center panel dashboard */
export interface Metrics {
  totalOrders: number;
  failuresInjected: number;
  autoRecoveries: number;
  doubleChargesPrevented: number;
}

/** Health status of all system components */
export interface SystemHealth {
  aiAgent: ComponentHealth;
  upiGateway: ComponentHealth;
  campusWallet: ComponentHealth;
  database: ComponentHealth;
}

/** The complete application state */
export interface AppState {
  orders: Order[];
  incidentLog: IncidentLog[];
  metrics: Metrics;
  health: SystemHealth;
  circuitBreaker: {
    state: CircuitState;
    failureCount: number;
    lastFailureAt: string | null;
    /** When the circuit breaker will attempt to half-open */
    nextRetryAt: string | null;
  };
  wallet: {
    balance: number;
    transactions: { id: string; amount: number; type: "credit" | "debit"; description: string; timestamp: string }[];
  };
  /** Map of idempotency keys to prevent double-processing */
  idempotencyMap: Record<string, { orderId: string; status: string }>;
  /** Simulated chaos state — which failures are currently active */
  chaos: {
    upiTimeout: boolean;
    midPaymentCrash: boolean;
    trafficSpike: boolean;
    backendKilled: boolean;
    /** Timestamp when the chaos was triggered (for auto-expire) */
    upiTimeoutUntil: string | null;
    backendKilledUntil: string | null;
  };
  /** Token counter for generating sequential tokens */
  tokenCounter: number;
}

// ============================================================
// DEFAULT STATE
// ============================================================

const DEFAULT_STATE: AppState = {
  orders: [],
  incidentLog: [],
  metrics: {
    totalOrders: 0,
    failuresInjected: 0,
    autoRecoveries: 0,
    doubleChargesPrevented: 0,
  },
  health: {
    aiAgent: "healthy",
    upiGateway: "healthy",
    campusWallet: "healthy",
    database: "healthy",
  },
  circuitBreaker: {
    state: "CLOSED",
    failureCount: 0,
    lastFailureAt: null,
    nextRetryAt: null,
  },
  wallet: {
    balance: 2500.0, // Starting campus wallet balance: ₹2500
    transactions: [
      {
        id: "init-001",
        amount: 2500.0,
        type: "credit",
        description: "Initial Campus Wallet Load",
        timestamp: new Date().toISOString(),
      },
    ],
  },
  idempotencyMap: {},
  chaos: {
    upiTimeout: false,
    midPaymentCrash: false,
    trafficSpike: false,
    backendKilled: false,
    upiTimeoutUntil: null,
    backendKilledUntil: null,
  },
  tokenCounter: 400,
};

// ============================================================
// PERSISTENCE LAYER
// ============================================================

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "state.json");

function loadState(): AppState {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf-8");
      const saved = JSON.parse(raw) as Partial<AppState>;
      // Merge with defaults to handle schema evolution
      return { ...DEFAULT_STATE, ...saved };
    }
  } catch (err) {
    console.error("[STORE] Failed to load persisted state, using defaults:", err);
  }
  return { ...DEFAULT_STATE };
}

function saveState(state: AppState): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch (err) {
    console.error("[STORE] Failed to persist state:", err);
  }
}

// ============================================================
// SINGLETON STORE — process-global to survive HMR
// ============================================================

// In development, Next.js HMR re-imports modules. We attach to
// globalThis so the store survives hot reloads.
const globalStore = globalThis as unknown as { __unicorepay_state?: AppState };

if (!globalStore.__unicorepay_state) {
  globalStore.__unicorepay_state = loadState();
}

/** Get the current application state (read-only snapshot) */
export function getState(): AppState {
  return globalStore.__unicorepay_state!;
}

/** Update state with a partial patch and persist to disk */
export function setState(patch: Partial<AppState>): AppState {
  globalStore.__unicorepay_state = {
    ...globalStore.__unicorepay_state!,
    ...patch,
  };
  // Persist asynchronously to avoid blocking the response
  saveState(globalStore.__unicorepay_state);
  return globalStore.__unicorepay_state;
}

/** Reset the entire state back to defaults (useful for demo resets) */
export function resetState(): AppState {
  globalStore.__unicorepay_state = { ...DEFAULT_STATE, tokenCounter: 400 };
  saveState(globalStore.__unicorepay_state);
  return globalStore.__unicorepay_state;
}

/** Add an incident to the log */
export function addIncident(incident: Omit<IncidentLog, "id" | "timestamp">): IncidentLog {
  const state = getState();
  const entry: IncidentLog = {
    id: `INC-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    ...incident,
  };
  setState({
    incidentLog: [entry, ...state.incidentLog].slice(0, 50), // Keep last 50
  });
  return entry;
}

/** Generate the next token number */
export function nextToken(): string {
  const state = getState();
  const counter = state.tokenCounter + 1;
  setState({ tokenCounter: counter });
  return `#T-${counter}`;
}
