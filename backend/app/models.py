"""
UniCorePay - Data Models and Enums using Pydantic v2.
Strictly typed for financial integrity and SRE status tracking.
"""

from enum import Enum
from typing import List, Optional, Dict
from pydantic import BaseModel, Field
from datetime import datetime


# ============================================================
# ENUMS
# ============================================================

class PaymentMethod(str, Enum):
    UPI = "upi"
    CAMPUS_WALLET = "campus_wallet"


class PaymentStatus(str, Enum):
    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"
    REFUNDED = "refunded"


class OrderPreparationStatus(str, Enum):
    RECEIVED = "received"
    PREPARING = "preparing"
    READY = "ready"
    COMPLETED = "completed"


class CircuitState(str, Enum):
    CLOSED = "CLOSED"          # Normal operation - traffic flows to UPI
    OPEN = "OPEN"              # Trips on failure - all traffic diverted to Campus Wallet
    HALF_OPEN = "HALF_OPEN"    # Testing gateway recovery with a probe request


class ComponentHealth(str, Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    DOWN = "down"


# ============================================================
# ORDER & CART MODELS
# ============================================================

class OrderItem(BaseModel):
    name: str
    qty: int = Field(gt=0, le=10)
    price: float = Field(ge=0)
    emoji: str = "🍽️"


class Order(BaseModel):
    id: str
    token_number: Optional[str] = None
    student_id: str = "STU-2026-001"
    items: List[OrderItem]
    total_price: float
    payment_method: PaymentMethod = PaymentMethod.UPI
    payment_status: PaymentStatus = PaymentStatus.PENDING
    prep_status: OrderPreparationStatus = OrderPreparationStatus.RECEIVED
    token_generated: bool = False
    idempotency_key: str
    self_healing_notes: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# ============================================================
# SRE DASHBOARD & INCIDENT MODELS
# ============================================================

class IncidentLog(BaseModel):
    id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    detected: str
    diagnosed: str
    action_taken: str
    recovered: bool = False
    root_cause_explanation: Optional[str] = None


class SystemMetrics(BaseModel):
    total_orders: int = 0
    failures_injected: int = 0
    auto_recoveries: int = 0
    double_charges_prevented: int = 0


class SystemHealth(BaseModel):
    ai_agent: ComponentHealth = ComponentHealth.HEALTHY
    upi_gateway: ComponentHealth = ComponentHealth.HEALTHY
    campus_wallet: ComponentHealth = ComponentHealth.HEALTHY
    database: ComponentHealth = ComponentHealth.HEALTHY


class CircuitBreakerStatus(BaseModel):
    state: CircuitState = CircuitState.CLOSED
    failure_count: int = 0
    last_failure_at: Optional[datetime] = None
    next_retry_at: Optional[datetime] = None


class ChaosState(BaseModel):
    upi_timeout: bool = False
    mid_payment_crash: bool = False
    traffic_spike: bool = False
    backend_killed: bool = False
    upi_timeout_until: Optional[datetime] = None
    backend_killed_until: Optional[datetime] = None


class WalletTransaction(BaseModel):
    id: str
    amount: float
    type: str  # "credit" | "debit"
    description: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class Wallet(BaseModel):
    balance: float = 2500.0
    transactions: List[WalletTransaction] = Field(default_factory=list)


# ============================================================
# API REQUEST & RESPONSE MODELS
# ============================================================

class StudentChatMessage(BaseModel):
    message: str


class OrderStatusUpdateRequest(BaseModel):
    prep_status: OrderPreparationStatus


class ChaosActionRequest(BaseModel):
    action: str  # "upi_timeout" | "mid_payment" | "traffic_spike" | "kill_backend" | "reset"
