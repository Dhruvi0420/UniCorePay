"""
Shared utility functions for UniCorePay backend.
Reusable ID generators, row-to-dict converters, and timestamp helpers.
"""

import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List

import sqlite3


# ============================================================
# ID GENERATORS
# ============================================================

def generate_id(prefix: str = "") -> str:
    """Generate a short unique ID with an optional prefix.

    Examples:
        generate_id("item")  -> "item-a1b2c3d4"
        generate_id("ORD")   -> "ORD-A1B2C3D4"
    """
    short_hex = uuid.uuid4().hex[:8]
    if prefix.isupper():
        return f"{prefix}-{short_hex.upper()}"
    return f"{prefix}-{short_hex}" if prefix else short_hex


def generate_tx_id() -> str:
    """Generate a transaction ID like TX-A1B2C3D4."""
    return generate_id("TX")


def generate_order_id() -> str:
    """Generate an order ID like ORD-A1B2C3D4."""
    return generate_id("ORD")


def generate_incident_id() -> str:
    """Generate an incident ID like INC-A1B2C3."""
    return f"INC-{uuid.uuid4().hex[:6].upper()}"


# ============================================================
# TIMESTAMP HELPERS
# ============================================================

def utc_now_iso() -> str:
    """Return current UTC time as ISO 8601 string."""
    return datetime.now(timezone.utc).isoformat()


def utc_now_time_str() -> str:
    """Return current UTC time formatted as HH:MM:SS AM/PM."""
    return datetime.now(timezone.utc).strftime("%I:%M:%S %p")


# ============================================================
# ROW-TO-DICT CONVERTERS
# ============================================================
# These eliminate the repetitive row["field"] pattern scattered
# across the old monolithic db.py.

def row_to_menu_item(row: sqlite3.Row) -> Dict[str, Any]:
    """Convert a SQLite menu_items row to a clean dictionary."""
    return {
        "id": row["id"],
        "name": row["name"],
        "description": row["description"],
        "price": float(row["price"]),
        "emoji": row["emoji"],
        "category": row["category"],
        "available": bool(row["available"]),
        "created_at": row["created_at"],
    }


def row_to_transaction(row: sqlite3.Row) -> Dict[str, Any]:
    """Convert a SQLite wallet_transactions row to a clean dictionary."""
    return {
        "id": row["id"],
        "student_id": row["student_id"],
        "amount": float(row["amount"]),
        "type": row["type"],
        "description": row["description"],
        "timestamp": row["timestamp"],
    }


def row_to_order(row: sqlite3.Row) -> Dict[str, Any]:
    """Convert a SQLite orders row to a clean dictionary."""
    import json
    return {
        "id": row["id"],
        "token_number": row["token_number"],
        "student_id": row["student_id"],
        "items": json.loads(row["items_json"]),
        "total_price": float(row["total_price"]),
        "payment_method": row["payment_method"],
        "payment_status": row["payment_status"],
        "prep_status": row["prep_status"],
        "token_generated": bool(row["token_generated"]),
        "idempotency_key": row["idempotency_key"],
        "self_healing_notes": json.loads(row["self_healing_notes_json"] or "[]"),
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def row_to_incident(row: sqlite3.Row) -> Dict[str, Any]:
    """Convert a SQLite incidents row to a clean dictionary."""
    keys = row.keys()
    return {
        "id": row["id"],
        "timestamp": row["timestamp"],
        "detected": row["detected"],
        "diagnosed": row["diagnosed"],
        "action_taken": row["action_taken"],
        "recovered": bool(row["recovered"]),
        "root_cause_explanation": row["root_cause_explanation"],
        "ttd_ms": row["ttd_ms"] if "ttd_ms" in keys else 120,
        "ttr_ms": row["ttr_ms"] if "ttr_ms" in keys else 340,
        "severity": row["severity"] if "severity" in keys else "HIGH",
    }
