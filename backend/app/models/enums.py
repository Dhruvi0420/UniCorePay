"""
Shared enums used across UniCorePay backend.
Defined separately so any module can import without circular dependencies.
"""

from enum import Enum


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
