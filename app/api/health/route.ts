/**
 * ============================================================
 * API ROUTE: /api/health — Live Health Dashboard Data
 * ============================================================
 *
 * This endpoint powers the center panel of the Mission Control.
 * It returns:
 * - Component health statuses
 * - Live metrics counters
 * - Circuit breaker state
 * - Incident log entries
 * - Wallet balance
 * - Active chaos flags
 * - Recent order tokens
 *
 * The frontend polls this every 2 seconds to keep the
 * dashboard live-updating.
 *
 * IMPORTANTLY: This also runs the Watchdog Check (Mechanism 4)
 * and Reconciliation Worker (Mechanism 3) on every poll,
 * simulating continuous background monitoring.
 */

import { getState } from "@/lib/store";
import { watchdogCheck, runReconciliation } from "@/lib/engine";

export async function GET() {
  // Run the watchdog health check (Mechanism 4)
  // This auto-recovers expired chaos flags
  const watchdogResult = watchdogCheck();

  // Run the reconciliation worker (Mechanism 3)
  // This finds and repairs orphaned payments
  const reconciliationResult = runReconciliation();

  const state = getState();

  return Response.json(
    {
      health: state.health,
      metrics: state.metrics,
      circuitBreaker: state.circuitBreaker,
      incidentLog: state.incidentLog.slice(0, 20), // Last 20 incidents
      wallet: {
        balance: state.wallet.balance,
      },
      chaos: state.chaos,
      recentTokens: state.orders
        .filter((o) => o.tokenGenerated && o.tokenNumber)
        .slice(0, 5)
        .map((o) => ({
          token: o.tokenNumber,
          items: o.items.map((i) => `${i.qty}x ${i.name}`).join(", "),
          total: o.totalPrice,
          method: o.paymentMethod,
          time: o.createdAt,
        })),
      watchdog: watchdogResult,
      reconciliation: reconciliationResult,
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
