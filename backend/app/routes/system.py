from fastapi import APIRouter
from typing import List, Dict, Any
from app.models import (
    ChaosActionRequest,
    IncidentLog,
    SystemMetrics,
    SystemHealth,
    CircuitState,
    ComponentHealth
)
from app import db

router = APIRouter(prefix="/system", tags=["SRE & System Resilience"])


@router.get("/status")
async def get_system_status():
    """Retrieve real-time health, circuit breaker state, and SRE metrics."""
    circuit_state = db.get_circuit_state()
    active_chaos = db.get_active_chaos()
    metrics_data = db.get_system_metrics()

    # Determine health components based on state and active chaos
    if circuit_state == "OPEN":
        upi_health = ComponentHealth.DOWN
    elif circuit_state == "HALF_OPEN":
        upi_health = ComponentHealth.DEGRADED
    else:
        upi_health = ComponentHealth.HEALTHY

    db_health = ComponentHealth.DEGRADED if active_chaos == "traffic_spike" else ComponentHealth.HEALTHY
    ai_health = ComponentHealth.DOWN if active_chaos == "kill_backend" else ComponentHealth.HEALTHY

    return {
        "circuit_state": circuit_state,
        "active_chaos": active_chaos if active_chaos != "none" else None,
        "metrics": metrics_data,
        "health": {
            "ai_agent": ai_health.value,
            "upi_gateway": upi_health.value,
            "campus_wallet": ComponentHealth.HEALTHY.value,
            "database": db_health.value,
        }
    }


@router.get("/incidents", response_model=List[IncidentLog])
async def list_incident_logs():
    """Retrieve historical SRE incident events."""
    return db.get_all_incidents()


@router.get("/crm-summary")
async def get_crm_summary():
    """Retrieve CRM analytics, student counts, order timelines, and payment method statistics."""
    return db.get_crm_summary()


@router.post("/chaos")
async def trigger_chaos_action(req: ChaosActionRequest):
    """Inject a chaos fault to test self-healing resilience."""
    action = req.action

    if action == "upi_timeout":
        inc = db.trip_circuit_breaker(reason="Primary UPI Gateway timeout (100% packet loss)")
        return {"status": "triggered", "incident": inc}

    elif action == "mid_payment":
        db.set_active_chaos("mid_payment")
        db.update_system_metric("failures_injected", 1)
        inc = db.record_incident(
            detected="⚡ CHAOS ARMED: Mid-payment transaction corruption armed",
            diagnosed="Next incoming payment will test reconciliation between debit and token",
            action_taken="Self-Repairing Reconciliation Worker armed on standby",
            recovered=False,
            root_cause="Testing orphaned payment detection and automatic recovery.",
            ttd_ms=110,
            ttr_ms=280,
            severity="CRITICAL"
        )
        return {"status": "armed", "incident": inc}

    elif action == "traffic_spike":
        db.set_active_chaos("traffic_spike")
        db.update_system_metric("failures_injected", 1)
        db.update_system_metric("auto_recoveries", 1)
        inc = db.record_incident(
            detected="🌊 CHAOS: Canteen Rush — 200 req/s simulated traffic spike",
            diagnosed="Incoming request burst saturating database connection pool",
            action_taken="Token-bucket rate limiter engaged ➔ Priority queue protected active orders",
            recovered=True,
            root_cause="Traffic burst throttled safely via rate limiter without server crash.",
            ttd_ms=65,
            ttr_ms=180,
            severity="HIGH"
        )
        return {"status": "triggered", "incident": inc}

    elif action == "kill_backend":
        db.set_active_chaos("kill_backend")
        db.update_system_metric("failures_injected", 1)
        db.update_system_metric("auto_recoveries", 1)
        inc = db.record_incident(
            detected="💀 CHAOS: Backend process terminated by SIGKILL",
            diagnosed="Server heartbeat lost — process freeze simulated",
            action_taken="Watchdog timer tripped ➔ Auto-restarted container and restored state",
            recovered=True,
            root_cause="Simulated container crash. Watchdog daemon recovered process and verified state.",
            ttd_ms=140,
            ttr_ms=450,
            severity="CRITICAL"
        )
        return {"status": "triggered", "incident": inc}

    elif action == "rollback":
        db.set_active_chaos("rollback")
        db.update_system_metric("failures_injected", 1)
        inc = db.record_incident(
            detected="⚡ CHAOS ARMED: Post-debit Kitchen Pipeline Abort armed",
            diagnosed="Next incoming payment will deduct funds and then kitchen queue will fail",
            action_taken="Automatic Rollback Engine (Mechanism 8) armed to trigger compensating refund",
            recovered=False,
            root_cause="Testing atomic rollback and immediate wallet refund upon fulfillment failure.",
            ttd_ms=15,
            ttr_ms=25,
            severity="HIGH"
        )
        return {"status": "armed", "incident": inc}

    elif action == "reset":
        db.reset_system_state()
        return {"status": "reset", "message": "System state restored to baseline."}

    return {"status": "unknown_action"}


@router.post("/reset")
async def reset_all_system():
    """Restore all metrics, incidents, and circuit breaker to clean baseline."""
    db.reset_system_state()
    return {"status": "reset", "message": "System restored to baseline."}
