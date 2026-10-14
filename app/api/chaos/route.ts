/**
 * ============================================================
 * API ROUTE: /api/chaos — Chaos Monkey Injection Console
 * ============================================================
 *
 * This endpoint handles the Chaos Console buttons.
 * Each button injects a specific failure mode that triggers
 * different self-healing mechanisms.
 *
 * CHAOS ACTIONS:
 * - upi_timeout:     Simulates UPI gateway hanging (Mechanisms 1 & 2)
 * - mid_payment:     Corrupts mid-payment flow (Mechanism 3)
 * - traffic_spike:   Simulates 200 req/s overload (Rate Limiting)
 * - kill_backend:    Freezes backend process (Mechanism 4)
 * - reset:           Clears all chaos and resets system
 */

import { getState, setState, addIncident } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const { action } = await request.json();
    const state = getState();

    switch (action) {
      // ──────────────────────────────────────────
      // 💥 CRASH UPI GATEWAY TIMEOUT
      // ──────────────────────────────────────────
      case "upi_timeout": {
        const expiresAt = new Date(Date.now() + 10000).toISOString(); // 10s TTL
        setState({
          chaos: { ...state.chaos, upiTimeout: true, upiTimeoutUntil: expiresAt },
          health: { ...state.health, upiGateway: "down" },
          metrics: { ...state.metrics, failuresInjected: state.metrics.failuresInjected + 1 },
        });
        addIncident({
          detected: "💥 CHAOS INJECTED: UPI Gateway forced to timeout",
          diagnosed: "Chaos Monkey triggered gateway hang simulation (10s TTL)",
          actionTaken: "Self-healing activated: Retry + Backoff + Circuit Breaker monitoring",
          recovered: false,
        });
        return Response.json({
          success: true,
          message: "UPI Gateway is now timing out! Try placing an order to see self-healing in action.",
          expiresAt,
        });
      }

      // ──────────────────────────────────────────
      // ⚡ CORRUPT MID-PAYMENT GLITCH
      // ──────────────────────────────────────────
      case "mid_payment": {
        setState({
          chaos: { ...state.chaos, midPaymentCrash: true },
          metrics: { ...state.metrics, failuresInjected: state.metrics.failuresInjected + 1 },
        });
        addIncident({
          detected: "⚡ CHAOS INJECTED: Mid-payment crash armed",
          diagnosed: "Next payment will deduct money but crash before token generation",
          actionTaken: "Reconciliation Worker (Mechanism 3) standing by for auto-repair",
          recovered: false,
        });
        return Response.json({
          success: true,
          message: "Mid-payment crash armed! Next order will deduct money but crash before token. Reconciliation will auto-fix!",
        });
      }

      // ──────────────────────────────────────────
      // 🌊 CANTEEN RUSH TRAFFIC SPIKE
      // ──────────────────────────────────────────
      case "traffic_spike": {
        setState({
          chaos: { ...state.chaos, trafficSpike: true },
          health: { ...state.health, database: "degraded" },
          metrics: { ...state.metrics, failuresInjected: state.metrics.failuresInjected + 1 },
        });

        addIncident({
          detected: "🌊 CHAOS INJECTED: Canteen Rush — 200 req/s traffic spike",
          diagnosed: "System under extreme load — queue pressure building",
          actionTaken: "Rate limiter activated, request queue enabled, non-critical ops deprioritized",
          recovered: false,
        });

        // Simulate the spike resolving after a delay
        // (In a real system, this would be based on actual request rates)
        setTimeout(() => {
          const s = getState();
          if (s.chaos.trafficSpike) {
            setState({
              chaos: { ...s.chaos, trafficSpike: false },
              health: { ...s.health, database: "healthy" },
            });
            addIncident({
              detected: "Traffic spike subsided — request rate returning to normal",
              diagnosed: "Rate limiter successfully throttled burst traffic",
              actionTaken: "All systems restored to normal throughput. Queue drained successfully.",
              recovered: true,
            });
            const s2 = getState();
            setState({
              metrics: { ...s2.metrics, autoRecoveries: s2.metrics.autoRecoveries + 1 },
            });
          }
        }, 12000);

        return Response.json({
          success: true,
          message: "Traffic spike simulated! System is rate-limiting. Will auto-recover in ~12 seconds.",
        });
      }

      // ──────────────────────────────────────────
      // 💀 KILL BACKEND PROCESS
      // ──────────────────────────────────────────
      case "kill_backend": {
        const expiresAt = new Date(Date.now() + 8000).toISOString(); // 8s TTL
        setState({
          chaos: { ...state.chaos, backendKilled: true, backendKilledUntil: expiresAt },
          health: { ...state.health, aiAgent: "down", database: "down" },
          metrics: { ...state.metrics, failuresInjected: state.metrics.failuresInjected + 1 },
        });
        addIncident({
          detected: "💀 CHAOS INJECTED: Backend process killed",
          diagnosed: "Simulated server freeze — all backend services unresponsive",
          actionTaken: "Watchdog timer engaged — auto-restart in 8 seconds (Mechanism 4)",
          recovered: false,
        });
        return Response.json({
          success: true,
          message: "Backend killed! Watchdog will auto-restart in ~8 seconds.",
          expiresAt,
        });
      }

      // ──────────────────────────────────────────
      // 🔄 RESET ALL CHAOS
      // ──────────────────────────────────────────
      case "reset": {
        setState({
          chaos: {
            upiTimeout: false,
            midPaymentCrash: false,
            trafficSpike: false,
            backendKilled: false,
            upiTimeoutUntil: null,
            backendKilledUntil: null,
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
        });
        addIncident({
          detected: "🔄 System reset triggered from Chaos Console",
          diagnosed: "Manual override — all chaos flags cleared",
          actionTaken: "All systems restored to healthy state, circuit breaker reset",
          recovered: true,
        });
        return Response.json({
          success: true,
          message: "All chaos cleared! System fully healthy.",
        });
      }

      default:
        return Response.json({ error: "Unknown chaos action" }, { status: 400 });
    }
  } catch (error) {
    console.error("[API/chaos] Error:", error);
    return Response.json({ error: "Failed to inject chaos" }, { status: 500 });
  }
}
