/**
 * ============================================================
 * SELF-HEALING ENGINE — The Heart of the SRE System
 * ============================================================
 *
 * This module implements all 4 self-healing mechanisms:
 *
 * 1. RETRY WITH EXPONENTIAL BACKOFF + IDEMPOTENCY KEY
 *    - Every payment gets a UUID idempotency key
 *    - On failure, we retry at 1s, 2s, 4s intervals
 *    - The idempotency map ensures no double-charges
 *
 * 2. CIRCUIT BREAKER + FALLBACK TO CAMPUS WALLET
 *    - After 3 consecutive UPI failures → circuit OPENS
 *    - Payments auto-redirect to Campus Wallet
 *    - After cooldown → HALF_OPEN → test one request
 *
 * 3. SELF-REPAIRING RECONCILIATION WORKER
 *    - Scans for "orphaned" payments (money deducted, no token)
 *    - Auto-repairs by generating the missing token
 *    - Pushes recovery notice to the incident log
 *
 * 4. HEALTH CHECK WATCHDOG
 *    - Monitors heartbeat every 2 seconds
 *    - Auto-recovers frozen/killed states
 */

import {
  getState,
  setState,
  addIncident,
  nextToken,
  type AppState,
  type CircuitState,
} from "./store";

// ============================================================
// MENU — Canteen item catalog (prices in ₹)
// ============================================================

export const MENU: Record<string, { name: string; price: number; emoji: string }> = {
  masala_dosa: { name: "Masala Dosa", price: 60, emoji: "🥞" },
  idli_sambar: { name: "Idli Sambar", price: 40, emoji: "🍛" },
  cold_coffee: { name: "Cold Coffee", price: 50, emoji: "☕" },
  veg_biryani: { name: "Veg Biryani", price: 120, emoji: "🍚" },
  paneer_roll: { name: "Paneer Roll", price: 80, emoji: "🌯" },
  samosa: { name: "Samosa", price: 20, emoji: "🔺" },
  chai: { name: "Chai", price: 15, emoji: "🍵" },
  maggi: { name: "Maggi", price: 35, emoji: "🍜" },
  chole_bhature: { name: "Chole Bhature", price: 70, emoji: "🫓" },
  pav_bhaji: { name: "Pav Bhaji", price: 65, emoji: "🍲" },
  french_fries: { name: "French Fries", price: 50, emoji: "🍟" },
  pasta: { name: "Pasta", price: 70, emoji: "🍝" },
};

// ============================================================
// MECHANISM 1: Simulated UPI Payment Gateway
// ============================================================

/**
 * Simulates a UPI payment attempt.
 * Checks chaos flags to determine if the gateway should:
 * - Timeout (hang for 10s then fail)
 * - Crash mid-payment (deduct money, then fail before completing)
 * - Succeed normally
 */
export async function simulateUPIPayment(
  amount: number,
  idempotencyKey: string
): Promise<{ success: boolean; error?: string; gatewayRef?: string }> {
  const state = getState();

  // --- IDEMPOTENCY CHECK ---
  // If we've already processed this key, return the cached result
  // This prevents double-charging even if the client retries
  if (state.idempotencyMap[idempotencyKey]) {
    setState({
      metrics: {
        ...state.metrics,
        doubleChargesPrevented: state.metrics.doubleChargesPrevented + 1,
      },
    });
    addIncident({
      detected: `Duplicate payment attempt (key: ${idempotencyKey.slice(0, 8)}...)`,
      diagnosed: "Client retried an already-processed payment",
      actionTaken: "Idempotency key matched — returned cached result, no double-charge",
      recovered: true,
    });
    return { success: true, gatewayRef: `CACHED-${idempotencyKey.slice(0, 8)}` };
  }

  // --- CHAOS: UPI Timeout ---
  if (state.chaos.upiTimeout) {
    // Simulate the gateway hanging
    await delay(2000); // shortened for demo (real would be 10s)
    return { success: false, error: "GATEWAY_TIMEOUT: UPI gateway did not respond within deadline" };
  }

  // --- CHAOS: Mid-payment crash ---
  if (state.chaos.midPaymentCrash) {
    // Money gets deducted but the response never arrives
    // This creates an "orphaned payment" that the reconciliation worker will fix
    await delay(500);
    return { success: false, error: "MID_PAYMENT_CRASH: Gateway deducted ₹" + amount + " but crashed before confirmation" };
  }

  // --- NORMAL SUCCESS ---
  await delay(300); // Simulate network latency
  const gatewayRef = `UPI-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // Cache the result in the idempotency map
  setState({
    idempotencyMap: {
      ...state.idempotencyMap,
      [idempotencyKey]: { orderId: "", status: "paid" },
    },
  });

  return { success: true, gatewayRef };
}

// ============================================================
// MECHANISM 1: Retry with Exponential Backoff
// ============================================================

/**
 * Attempts a payment with exponential backoff retries.
 * Delays: 1s → 2s → 4s between retries.
 * Each retry uses the SAME idempotency key to prevent double-charges.
 */
export async function payWithRetry(
  amount: number,
  idempotencyKey: string,
  maxRetries: number = 3
): Promise<{ success: boolean; attempts: number; error?: string; gatewayRef?: string; usedFallback?: boolean }> {
  const backoffMs = [1000, 2000, 4000]; // Exponential: 1s, 2s, 4s

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await simulateUPIPayment(amount, idempotencyKey);

    if (result.success) {
      if (attempt > 1) {
        // We recovered via retry — log it!
        addIncident({
          detected: `UPI payment failed on attempt ${attempt - 1}`,
          diagnosed: "Transient network/gateway error",
          actionTaken: `Retried with exponential backoff (attempt ${attempt}/${maxRetries}), same idempotency key`,
          recovered: true,
        });
        const s = getState();
        setState({
          metrics: { ...s.metrics, autoRecoveries: s.metrics.autoRecoveries + 1 },
        });
      }
      return { success: true, attempts: attempt, gatewayRef: result.gatewayRef };
    }

    // Log the failure
    console.log(`[PAYMENT] Attempt ${attempt}/${maxRetries} failed: ${result.error}`);

    // Wait before retrying (but not after the last attempt)
    if (attempt < maxRetries) {
      await delay(backoffMs[attempt - 1] || 4000);
    }
  }

  // All retries exhausted — this feeds into the Circuit Breaker
  return { success: false, attempts: maxRetries, error: "All retries exhausted" };
}

// ============================================================
// MECHANISM 2: Circuit Breaker
// ============================================================

const CIRCUIT_FAILURE_THRESHOLD = 3;
const CIRCUIT_COOLDOWN_MS = 15000; // 15 seconds cooldown before half-open

/**
 * Records a UPI failure in the circuit breaker.
 * After 3 consecutive failures, the circuit OPENS and all
 * subsequent payments auto-fallback to Campus Wallet.
 */
export function recordCircuitFailure(): CircuitState {
  const state = getState();
  const cb = state.circuitBreaker;
  const newCount = cb.failureCount + 1;
  const now = new Date();

  if (newCount >= CIRCUIT_FAILURE_THRESHOLD) {
    // TRIP THE CIRCUIT BREAKER!
    const nextRetry = new Date(now.getTime() + CIRCUIT_COOLDOWN_MS);
    setState({
      circuitBreaker: {
        state: "OPEN",
        failureCount: newCount,
        lastFailureAt: now.toISOString(),
        nextRetryAt: nextRetry.toISOString(),
      },
      health: { ...state.health, upiGateway: "down" },
    });
    addIncident({
      detected: `Circuit Breaker TRIPPED after ${newCount} consecutive UPI failures`,
      diagnosed: "UPI Gateway is consistently failing — likely down",
      actionTaken: "Circuit OPENED — all payments auto-redirecting to Campus Wallet fallback",
      recovered: true,
    });
    return "OPEN";
  }

  setState({
    circuitBreaker: {
      ...cb,
      failureCount: newCount,
      lastFailureAt: now.toISOString(),
    },
    health: { ...state.health, upiGateway: newCount >= 2 ? "degraded" : state.health.upiGateway },
  });
  return cb.state;
}

/**
 * Checks if the circuit breaker should allow a request through.
 * - CLOSED: allow all
 * - OPEN: block (use fallback), unless cooldown expired → HALF_OPEN
 * - HALF_OPEN: allow one test request
 */
export function checkCircuit(): CircuitState {
  const state = getState();
  const cb = state.circuitBreaker;

  if (cb.state === "CLOSED") return "CLOSED";

  if (cb.state === "OPEN" && cb.nextRetryAt) {
    if (new Date() >= new Date(cb.nextRetryAt)) {
      // Cooldown expired — transition to HALF_OPEN for a test request
      setState({
        circuitBreaker: { ...cb, state: "HALF_OPEN" },
        health: { ...state.health, upiGateway: "degraded" },
      });
      addIncident({
        detected: "Circuit Breaker cooldown expired",
        diagnosed: "Attempting recovery probe to UPI Gateway",
        actionTaken: "Circuit moved to HALF_OPEN — allowing one test request",
        recovered: false,
      });
      return "HALF_OPEN";
    }
    return "OPEN";
  }

  return cb.state;
}

/**
 * Resets the circuit breaker after a successful payment.
 * Called when a request succeeds in HALF_OPEN state.
 */
export function resetCircuit(): void {
  const state = getState();
  setState({
    circuitBreaker: {
      state: "CLOSED",
      failureCount: 0,
      lastFailureAt: null,
      nextRetryAt: null,
    },
    health: { ...state.health, upiGateway: "healthy" },
  });
  addIncident({
    detected: "UPI Gateway recovery confirmed",
    diagnosed: "Test request in HALF_OPEN state succeeded",
    actionTaken: "Circuit Breaker CLOSED — UPI Gateway restored to normal operation",
    recovered: true,
  });
  const s = getState();
  setState({
    metrics: { ...s.metrics, autoRecoveries: s.metrics.autoRecoveries + 1 },
  });
}

/**
 * Deducts from Campus Wallet as a fallback payment method.
 * Used when the Circuit Breaker is OPEN.
 */
export function payFromWallet(amount: number, description: string): { success: boolean; error?: string } {
  const state = getState();
  if (state.wallet.balance < amount) {
    return { success: false, error: `Insufficient wallet balance (₹${state.wallet.balance.toFixed(2)} < ₹${amount})` };
  }

  setState({
    wallet: {
      balance: state.wallet.balance - amount,
      transactions: [
        {
          id: `TXN-${Date.now()}`,
          amount,
          type: "debit",
          description,
          timestamp: new Date().toISOString(),
        },
        ...state.wallet.transactions,
      ],
    },
  });

  return { success: true };
}

// ============================================================
// MECHANISM 3: Reconciliation Worker
// ============================================================

/**
 * Scans for orphaned payments — orders where money was deducted
 * but the token was never generated (due to a mid-payment crash).
 * Automatically repairs by generating the missing token.
 * 
 * This runs as a periodic background check.
 */
export function runReconciliation(): { repaired: number; errors: string[] } {
  const state = getState();
  let repaired = 0;
  const errors: string[] = [];

  const updatedOrders = state.orders.map((order) => {
    // Find orphaned payments: paid but no token generated
    if (order.paymentStatus === "paid" && !order.tokenGenerated) {
      const token = nextToken();
      repaired++;

      addIncident({
        detected: `Orphaned payment found: Order ${order.id} paid ₹${order.totalPrice} but no token issued`,
        diagnosed: "Mid-payment crash caused token generation to fail",
        actionTaken: `Self-repair: Generated token ${token} and marked order complete`,
        recovered: true,
      });

      return {
        ...order,
        tokenGenerated: true,
        tokenNumber: token,
        updatedAt: new Date().toISOString(),
      };
    }

    // Find stuck pending payments older than 30 seconds
    if (order.paymentStatus === "pending") {
      const orderAge = Date.now() - new Date(order.createdAt).getTime();
      if (orderAge > 30000) {
        repaired++;
        addIncident({
          detected: `Stale pending order ${order.id} (age: ${Math.round(orderAge / 1000)}s)`,
          diagnosed: "Payment request likely lost in transit",
          actionTaken: "Marked as failed — student can re-order safely",
          recovered: true,
        });
        return {
          ...order,
          paymentStatus: "failed" as const,
          updatedAt: new Date().toISOString(),
        };
      }
    }

    return order;
  });

  if (repaired > 0) {
    const s = getState();
    setState({
      orders: updatedOrders,
      metrics: { ...s.metrics, autoRecoveries: s.metrics.autoRecoveries + repaired },
    });
  }

  return { repaired, errors };
}

// ============================================================
// MECHANISM 4: Watchdog Health Check
// ============================================================

/**
 * The watchdog monitors all system components and auto-recovers
 * from chaos-injected failures after their TTL expires.
 * 
 * Called every 2 seconds to check:
 * - Has the UPI timeout expired?
 * - Has the backend kill TTL passed?
 * - Is the traffic spike still active?
 */
export function watchdogCheck(): { recovered: string[] } {
  const state = getState();
  const recovered: string[] = [];
  const now = Date.now();

  // Auto-recover UPI timeout after 10 seconds
  if (state.chaos.upiTimeout && state.chaos.upiTimeoutUntil) {
    if (now >= new Date(state.chaos.upiTimeoutUntil).getTime()) {
      setState({
        chaos: { ...state.chaos, upiTimeout: false, upiTimeoutUntil: null },
        health: { ...getState().health, upiGateway: getState().circuitBreaker.state === "OPEN" ? "down" : "healthy" },
      });
      addIncident({
        detected: "UPI Gateway timeout period expired",
        diagnosed: "Watchdog detected chaos TTL exhausted",
        actionTaken: "Auto-recovered UPI Gateway to operational state",
        recovered: true,
      });
      recovered.push("upiGateway");
      const s = getState();
      setState({ metrics: { ...s.metrics, autoRecoveries: s.metrics.autoRecoveries + 1 } });
    }
  }

  // Auto-recover killed backend after 8 seconds
  if (state.chaos.backendKilled && state.chaos.backendKilledUntil) {
    if (now >= new Date(state.chaos.backendKilledUntil).getTime()) {
      setState({
        chaos: { ...state.chaos, backendKilled: false, backendKilledUntil: null },
        health: { ...getState().health, database: "healthy", aiAgent: "healthy" },
      });
      addIncident({
        detected: "Backend process restart detected",
        diagnosed: "Watchdog auto-restart triggered after process kill",
        actionTaken: "All backend services restored — system fully operational",
        recovered: true,
      });
      recovered.push("backend");
      const s = getState();
      setState({ metrics: { ...s.metrics, autoRecoveries: s.metrics.autoRecoveries + 1 } });
    }
  }

  // Auto-recover traffic spike after it subsides
  if (state.chaos.trafficSpike) {
    // Traffic spike auto-clears after 12 seconds
    // (In real systems, this would be based on actual request rates)
  }

  return { recovered };
}

// ============================================================
// MASTER ORDER FLOW — Ties all mechanisms together
// ============================================================

/**
 * The complete order-and-payment pipeline used by the AI Agent.
 * 
 * Flow:
 * 1. Parse order items and calculate total
 * 2. Generate idempotency key
 * 3. Check circuit breaker state
 * 4. If CLOSED/HALF_OPEN → try UPI with retry + backoff
 * 5. If UPI fails → record circuit failure
 * 6. If circuit OPEN → auto-fallback to Campus Wallet
 * 7. Generate order token on success
 * 8. Return result to AI Agent
 */
export async function processOrder(
  items: { name: string; qty: number; price: number }[],
  studentId: string = "STU-2024-001"
): Promise<{
  success: boolean;
  tokenNumber?: string;
  totalPrice: number;
  paymentMethod: "upi" | "campus_wallet";
  orderId: string;
  error?: string;
  selfHealingUsed: string[];
}> {
  const state = getState();
  const selfHealingUsed: string[] = [];
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const idempotencyKey = crypto.randomUUID();
  const orderId = `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  // Create the order record
  const order: import("./store").Order = {
    id: orderId,
    tokenNumber: "",
    studentId,
    items,
    totalPrice,
    paymentMethod: "upi",
    paymentStatus: "pending",
    tokenGenerated: false,
    idempotencyKey,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  setState({
    orders: [order, ...state.orders],
    metrics: { ...state.metrics, totalOrders: state.metrics.totalOrders + 1 },
  });

  // --- Check if backend is killed (Mechanism 4 scenario) ---
  if (getState().chaos.backendKilled) {
    return {
      success: false,
      totalPrice,
      paymentMethod: "upi",
      orderId,
      error: "Backend process is frozen — Watchdog will auto-restart in a few seconds. Please retry.",
      selfHealingUsed: ["Watchdog monitoring active"],
    };
  }

  // --- STEP 1: Check Circuit Breaker (Mechanism 2) ---
  const circuitState = checkCircuit();
  let paymentSuccess = false;
  let paymentMethod: "upi" | "campus_wallet" = "upi";
  let gatewayRef: string | undefined;

  if (circuitState === "OPEN") {
    // Circuit is OPEN — skip UPI entirely, use Campus Wallet fallback
    selfHealingUsed.push("Circuit Breaker (OPEN) → Campus Wallet Fallback");
    paymentMethod = "campus_wallet";

    const walletResult = payFromWallet(totalPrice, `Order ${orderId}: ${items.map(i => `${i.qty}x ${i.name}`).join(", ")}`);
    if (walletResult.success) {
      paymentSuccess = true;
      addIncident({
        detected: `Payment for ₹${totalPrice} redirected from UPI (circuit OPEN)`,
        diagnosed: "Primary UPI Gateway unavailable",
        actionTaken: "Seamlessly paid via Campus Wallet fallback — no user disruption",
        recovered: true,
      });
    } else {
      return {
        success: false,
        totalPrice,
        paymentMethod: "campus_wallet",
        orderId,
        error: walletResult.error,
        selfHealingUsed,
      };
    }
  } else {
    // Circuit CLOSED or HALF_OPEN — try UPI with retries (Mechanism 1)
    selfHealingUsed.push("Retry with Exponential Backoff + Idempotency Key");

    const retryResult = await payWithRetry(totalPrice, idempotencyKey, 3);

    if (retryResult.success) {
      paymentSuccess = true;
      gatewayRef = retryResult.gatewayRef;

      if (circuitState === "HALF_OPEN") {
        // Recovery confirmed! Close the circuit
        resetCircuit();
        selfHealingUsed.push("Circuit Breaker recovered (HALF_OPEN → CLOSED)");
      }
    } else {
      // All retries failed — record in circuit breaker
      const newState = recordCircuitFailure();
      selfHealingUsed.push(`Circuit Breaker failure recorded (${newState})`);

      if (newState === "OPEN") {
        // Circuit just tripped — try Campus Wallet as immediate fallback
        paymentMethod = "campus_wallet";
        selfHealingUsed.push("Auto-fallback to Campus Wallet");

        const walletResult = payFromWallet(totalPrice, `Order ${orderId} (UPI failed): ${items.map(i => `${i.qty}x ${i.name}`).join(", ")}`);
        if (walletResult.success) {
          paymentSuccess = true;
        } else {
          // Update order status
          updateOrderStatus(orderId, "failed");
          return {
            success: false,
            totalPrice,
            paymentMethod: "campus_wallet",
            orderId,
            error: "Both UPI and Campus Wallet failed: " + walletResult.error,
            selfHealingUsed,
          };
        }
      } else {
        // Not enough failures to trip circuit yet — just fail
        updateOrderStatus(orderId, "failed");
        return {
          success: false,
          totalPrice,
          paymentMethod: "upi",
          orderId,
          error: "UPI payment failed after retries",
          selfHealingUsed,
        };
      }
    }
  }

  // --- STEP 2: Generate Token ---
  if (paymentSuccess) {
    // Check if mid-payment crash chaos is active
    if (getState().chaos.midPaymentCrash) {
      // Money was deducted but we "crash" before token generation
      // The reconciliation worker (Mechanism 3) will fix this later
      updateOrderStatus(orderId, "paid", paymentMethod); // Mark as paid
      selfHealingUsed.push("⚠ Mid-payment crash! Reconciliation Worker will auto-repair");

      addIncident({
        detected: `Mid-payment crash after ₹${totalPrice} deducted (Order ${orderId})`,
        diagnosed: "System crashed between payment confirmation and token generation",
        actionTaken: "Orphaned payment created — Reconciliation Worker will detect and auto-repair",
        recovered: false,
      });

      // Turn off the chaos flag after one occurrence
      setState({ chaos: { ...getState().chaos, midPaymentCrash: false } });

      return {
        success: false,
        totalPrice,
        paymentMethod,
        orderId,
        error: "System crashed after payment — your money is safe! Auto-repair in progress...",
        selfHealingUsed,
      };
    }

    const token = nextToken();
    updateOrderStatus(orderId, "paid", paymentMethod, token);

    return {
      success: true,
      tokenNumber: token,
      totalPrice,
      paymentMethod,
      orderId,
      selfHealingUsed,
    };
  }

  return {
    success: false,
    totalPrice,
    paymentMethod,
    orderId,
    error: "Payment failed",
    selfHealingUsed,
  };
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function updateOrderStatus(
  orderId: string,
  status: "pending" | "paid" | "failed" | "refunded",
  paymentMethod?: "upi" | "campus_wallet",
  token?: string
): void {
  const state = getState();
  setState({
    orders: state.orders.map((o) =>
      o.id === orderId
        ? {
            ...o,
            paymentStatus: status,
            paymentMethod: paymentMethod || o.paymentMethod,
            tokenNumber: token || o.tokenNumber,
            tokenGenerated: !!token,
            updatedAt: new Date().toISOString(),
          }
        : o
    ),
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
