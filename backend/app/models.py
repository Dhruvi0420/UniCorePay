"""
UniCorePay - Data Models and Enums using Pydantic v2.
Strictly typed for financial integrity, menu management, and SRE status tracking.
"""

from enum import Enum
from typing import List, Optional
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
# MENU MODELS
# ============================================================

class FoodItemCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str = Field(default="", max_length=300)
    price: float = Field(gt=0)
    emoji: str = Field(default="🍽️", max_length=10)
    category: str = Field(default="Meals", max_length=50)
    available: bool = True


class FoodItem(BaseModel):
    id: str
    name: str
    description: str
    price: float
    emoji: str = "🍽️"
    category: str = "Meals"
    available: bool = True
    created_at: str


# ============================================================
# ORDER & CART MODELS
# ============================================================

class OrderItem(BaseModel):
    name: str
    qty: int = Field(gt=0, le=20)
    price: float = Field(ge=0)
    emoji: str = "🍽️"


class OrderCreateRequest(BaseModel):
    student_id: str = "STU-2026-001"
    items: List[OrderItem] = Field(min_length=1)
    payment_method: PaymentMethod = PaymentMethod.UPI
    idempotency_key: Optional[str] = None


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
    created_at: str
    updated_at: str


class OrderStatusUpdateRequest(BaseModel):
    prep_status: OrderPreparationStatus


# ============================================================
# WALLET MODELS
# ============================================================

class WalletTopupRequest(BaseModel):
    amount: float = Field(gt=0)
    note: Optional[str] = "Admin top-up"


class WalletSetBalanceRequest(BaseModel):
    balance: float = Field(ge=0)
    note: Optional[str] = "Admin balance adjustment"


class WalletTransaction(BaseModel):
    id: str
    student_id: str
    amount: float
    type: str  # "credit" | "debit"
    description: str
    timestamp: str


class Wallet(BaseModel):
    student_id: str
    balance: float = 0.0
    transactions: List[WalletTransaction] = Field(default_factory=list)


# ============================================================
# SRE DASHBOARD & INCIDENT MODELS
# ============================================================

class IncidentLog(BaseModel):
    id: str
    timestamp: str
    detected: str
    diagnosed: str
    action_taken: str
    recovered: bool = False
    root_cause_explanation: Optional[str] = None
    ttd_ms: int = 120
    ttr_ms: int = 340
    severity: str = "HIGH"


class SystemMetrics(BaseModel):
    total_orders: int = 0
    failures_injected: int = 0
    auto_recoveries: int = 0
    double_charges_prevented: int = 0
    uptime_percentage: float = 99.9
    avg_ttr_ms: int = 245


class SystemHealth(BaseModel):
    ai_agent: ComponentHealth = ComponentHealth.HEALTHY
    upi_gateway: ComponentHealth = ComponentHealth.HEALTHY
    campus_wallet: ComponentHealth = ComponentHealth.HEALTHY
    database: ComponentHealth = ComponentHealth.HEALTHY


class CircuitBreakerStatus(BaseModel):
    state: CircuitState = CircuitState.CLOSED
    failure_count: int = 0
    last_failure_at: Optional[str] = None
    next_retry_at: Optional[str] = None


class ChaosActionRequest(BaseModel):
    action: str  # "upi_timeout" | "mid_payment" | "traffic_spike" | "kill_backend" | "reset"
