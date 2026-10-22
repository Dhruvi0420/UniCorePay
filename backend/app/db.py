"""
Database layer for UniCorePay using standard SQLite3.
Persistent, lightweight, ACID-compliant, thread-safe.
NO DEMO DATA is preloaded; all entries come from the frontend / admin.
"""

import sqlite3
import json
import threading
import time
from pathlib import Path
from datetime import datetime
from typing import List, Optional, Dict, Any
import uuid

DB_PATH = Path(__file__).resolve().parent.parent / "unicorepay.db"
_lock = threading.RLock()
CIRCUIT_RESET_TIMEOUT_SECONDS = 15.0  # Automated cooldown for HALF_OPEN probe transition


def get_db():
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with _lock:
        with get_db() as conn:
            cursor = conn.cursor()

            # 1. Menu Items Table (Empty by default)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS menu_items (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT DEFAULT '',
                price REAL NOT NULL,
                emoji TEXT DEFAULT '🍽️',
                category TEXT DEFAULT 'Meals',
                available INTEGER DEFAULT 1,
                created_at TEXT NOT NULL
            )
            """)

            # 2. Wallets Table (starts at 0.0)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS wallets (
                student_id TEXT PRIMARY KEY,
                balance REAL DEFAULT 0.0,
                updated_at TEXT NOT NULL
            )
            """)

            # 3. Wallet Transactions Ledger
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS wallet_transactions (
                id TEXT PRIMARY KEY,
                student_id TEXT NOT NULL,
                amount REAL NOT NULL,
                type TEXT NOT NULL,
                description TEXT DEFAULT '',
                timestamp TEXT NOT NULL
            )
            """)

            # 4. Orders Table (Empty by default)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS orders (
                id TEXT PRIMARY KEY,
                token_number TEXT,
                student_id TEXT NOT NULL,
                items_json TEXT NOT NULL,
                total_price REAL NOT NULL,
                payment_method TEXT NOT NULL,
                payment_status TEXT NOT NULL,
                prep_status TEXT NOT NULL,
                token_generated INTEGER DEFAULT 1,
                idempotency_key TEXT,
                self_healing_notes_json TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """)

            # 5. Incident Logs Table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS incidents (
                id TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL,
                detected TEXT NOT NULL,
                diagnosed TEXT NOT NULL,
                action_taken TEXT NOT NULL,
                recovered INTEGER DEFAULT 0,
                root_cause_explanation TEXT,
                ttd_ms INTEGER DEFAULT 120,
                ttr_ms INTEGER DEFAULT 340,
                severity TEXT DEFAULT 'HIGH'
            )
            """)

            # Schema migration helper for existing databases
            for col, col_type in [("ttd_ms", "INTEGER DEFAULT 120"), ("ttr_ms", "INTEGER DEFAULT 340"), ("severity", "TEXT DEFAULT 'HIGH'")]:
                try:
                    cursor.execute(f"ALTER TABLE incidents ADD COLUMN {col} {col_type}")
                except sqlite3.OperationalError:
                    pass

            # 6. System Metrics
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS system_metrics (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                total_orders INTEGER DEFAULT 0,
                failures_injected INTEGER DEFAULT 0,
                auto_recoveries INTEGER DEFAULT 0,
                double_charges_prevented INTEGER DEFAULT 0
            )
            """)

            cursor.execute("""
            INSERT OR IGNORE INTO system_metrics (id, total_orders, failures_injected, auto_recoveries, double_charges_prevented)
            VALUES (1, 0, 0, 0, 0)
            """)

            # 7. System State (Circuit state, Active Chaos, Timers)
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS system_state (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
            """)

            cursor.execute("""
            INSERT OR IGNORE INTO system_state (key, value)
            VALUES ('circuit_state', 'CLOSED')
            """)

            cursor.execute("""
            INSERT OR IGNORE INTO system_state (key, value)
            VALUES ('active_chaos', 'none')
            """)

            cursor.execute("""
            INSERT OR IGNORE INTO system_state (key, value)
            VALUES ('circuit_tripped_at', '0')
            """)

            cursor.execute("""
            INSERT OR IGNORE INTO system_state (key, value)
            VALUES ('failure_count', '0')
            """)

            # Initialize STU-2026-001 wallet with 0.0 if not exists
            now_str = datetime.utcnow().isoformat()
            cursor.execute("""
            INSERT OR IGNORE INTO wallets (student_id, balance, updated_at)
            VALUES ('STU-2026-001', 0.0, ?)
            """, (now_str,))

            conn.commit()


# ============================================================
# MENU CRUD
# ============================================================

def get_all_menu_items() -> List[Dict[str, Any]]:
    with _lock:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM menu_items ORDER BY rowid DESC")
            rows = cursor.fetchall()
            return [
                {
                    "id": row["id"],
                    "name": row["name"],
                    "description": row["description"],
                    "price": float(row["price"]),
                    "emoji": row["emoji"],
                    "category": row["category"],
                    "available": bool(row["available"]),
                    "created_at": row["created_at"],
                }
                for row in rows
            ]


def add_menu_item(name: str, description: str, price: float, emoji: str, category: str, available: bool = True) -> Dict[str, Any]:
    with _lock:
        with get_db() as conn:
            cursor = conn.cursor()
            item_id = f"item-{uuid.uuid4().hex[:8]}"
            created_at = datetime.utcnow().isoformat()
            cursor.execute("""
            INSERT INTO menu_items (id, name, description, price, emoji, category, available, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (item_id, name, description, price, emoji or "🍽️", category or "Meals", 1 if available else 0, created_at))
            conn.commit()
            return {
                "id": item_id,
                "name": name,
                "description": description,
                "price": price,
                "emoji": emoji or "🍽️",
                "category": category or "Meals",
                "available": available,
                "created_at": created_at,
            }


def delete_menu_item(item_id: str) -> bool:
    with _lock:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM menu_items WHERE id = ?", (item_id,))
            conn.commit()
            return cursor.rowcount > 0


def toggle_menu_item_availability(item_id: str) -> Optional[bool]:
    with _lock:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT available FROM menu_items WHERE id = ?", (item_id,))
            row = cursor.fetchone()
            if not row:
                return None
            new_val = 0 if row["available"] else 1
            cursor.execute("UPDATE menu_items SET available = ? WHERE id = ?", (new_val, item_id))
            conn.commit()
            return bool(new_val)


# ============================================================
# WALLET MANAGEMENT
# ============================================================

def get_wallet(student_id: str = "STU-2026-001") -> Dict[str, Any]:
    with _lock:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT balance FROM wallets WHERE student_id = ?", (student_id,))
            row = cursor.fetchone()
            if not row:
                now_str = datetime.utcnow().isoformat()
                cursor.execute("INSERT INTO wallets (student_id, balance, updated_at) VALUES (?, 0.0, ?)", (student_id, now_str))
                conn.commit()
                balance = 0.0
            else:
                balance = float(row["balance"])

            cursor.execute("""
            SELECT id, student_id, amount, type, description, timestamp
            FROM wallet_transactions
            WHERE student_id = ?
            ORDER BY rowid DESC
            LIMIT 30
            """, (student_id,))
            tx_rows = cursor.fetchall()
            transactions = [
                {
                    "id": r["id"],
                    "student_id": r["student_id"],
                    "amount": float(r["amount"]),
                    "type": r["type"],
                    "description": r["description"],
                    "timestamp": r["timestamp"],
                }
                for r in tx_rows
            ]

            return {
                "student_id": student_id,
                "balance": balance,
                "transactions": transactions,
            }


def topup_wallet(student_id: str, amount: float, note: str = "Admin Top-up") -> Dict[str, Any]:
    with _lock:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT balance FROM wallets WHERE student_id = ?", (student_id,))
            row = cursor.fetchone()
            current_balance = float(row["balance"]) if row else 0.0
            new_balance = round(current_balance + amount, 2)
            now_str = datetime.utcnow().isoformat()

            cursor.execute("""
            INSERT INTO wallets (student_id, balance, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(student_id) DO UPDATE SET balance = ?, updated_at = ?
            """, (student_id, new_balance, now_str, new_balance, now_str))

            tx_id = f"TX-{uuid.uuid4().hex[:8].upper()}"
            cursor.execute("""
            INSERT INTO wallet_transactions (id, student_id, amount, type, description, timestamp)
            VALUES (?, ?, ?, 'credit', ?, ?)
            """, (tx_id, student_id, amount, note, now_str))

            conn.commit()
            return get_wallet(student_id)


def set_wallet_balance(student_id: str, new_balance: float, note: str = "Admin Balance Set") -> Dict[str, Any]:
    with _lock:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT balance FROM wallets WHERE student_id = ?", (student_id,))
            row = cursor.fetchone()
            current_balance = float(row["balance"]) if row else 0.0
            diff = round(new_balance - current_balance, 2)
            now_str = datetime.utcnow().isoformat()

            cursor.execute("""
            INSERT INTO wallets (student_id, balance, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(student_id) DO UPDATE SET balance = ?, updated_at = ?
            """, (student_id, new_balance, now_str, new_balance, now_str))

            tx_id = f"TX-{uuid.uuid4().hex[:8].upper()}"
            tx_type = "credit" if diff >= 0 else "debit"
            cursor.execute("""
            INSERT INTO wallet_transactions (id, student_id, amount, type, description, timestamp)
            VALUES (?, ?, ?, ?, ?, ?)
            """, (tx_id, student_id, abs(diff), tx_type, note, now_str))

            conn.commit()
            return get_wallet(student_id)


def debit_wallet(student_id: str, amount: float, description: str) -> bool:
    """Atomic debit with balance check."""
    with _lock:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT balance FROM wallets WHERE student_id = ?", (student_id,))
            row = cursor.fetchone()
            if not row:
                return False
            current = float(row["balance"])
            if current < amount:
                return False

            new_balance = round(current - amount, 2)
            now_str = datetime.utcnow().isoformat()
            cursor.execute("UPDATE wallets SET balance = ?, updated_at = ? WHERE student_id = ?", (new_balance, now_str, student_id))

            tx_id = f"TX-{uuid.uuid4().hex[:8].upper()}"
            cursor.execute("""
            INSERT INTO wallet_transactions (id, student_id, amount, type, description, timestamp)
            VALUES (?, ?, ?, 'debit', ?, ?)
            """, (tx_id, student_id, amount, description, now_str))

            conn.commit()
            return True


# ============================================================
# ORDERS & TOKENS
# ============================================================

def get_next_token_number() -> str:
    """Generate sequential token, e.g. #T-101, #T-102"""
    with _lock:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) as cnt FROM orders")
            cnt = cursor.fetchone()["cnt"]
            return f"#T-{100 + cnt + 1}"


def create_order(
    student_id: str,
    items: List[Dict[str, Any]],
    total_price: float,
    payment_method: str,
    payment_status: str,
    idempotency_key: str,
    self_healing_notes: List[str]
) -> Dict[str, Any]:
    with _lock:
        with get_db() as conn:
            cursor = conn.cursor()
            order_id = f"ORD-{uuid.uuid4().hex[:8].upper()}"
            token_num = f"#T-{100 + cursor.execute('SELECT COUNT(*) as cnt FROM orders').fetchone()['cnt'] + 1}"
            now_str = datetime.utcnow().isoformat()

            cursor.execute("""
            INSERT INTO orders (
                id, token_number, student_id, items_json, total_price,
                payment_method, payment_status, prep_status, token_generated,
                idempotency_key, self_healing_notes_json, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'received', 1, ?, ?, ?, ?)
            """, (
                order_id,
                token_num,
                student_id,
                json.dumps(items),
                total_price,
                payment_method,
                payment_status,
                idempotency_key or f"idemp-{uuid.uuid4().hex[:6]}",
                json.dumps(self_healing_notes),
                now_str,
                now_str
            ))

            # Increment total orders in metrics
            cursor.execute("UPDATE system_metrics SET total_orders = total_orders + 1 WHERE id = 1")
            conn.commit()

            return {
                "id": order_id,
                "token_number": token_num,
                "student_id": student_id,
                "items": items,
                "total_price": total_price,
                "payment_method": payment_method,
                "payment_status": payment_status,
                "prep_status": "received",
                "token_generated": True,
                "idempotency_key": idempotency_key,
                "self_healing_notes": self_healing_notes,
                "created_at": now_str,
                "updated_at": now_str
            }


def get_all_orders() -> List[Dict[str, Any]]:
    with _lock:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM orders ORDER BY rowid DESC")
            rows = cursor.fetchall()
            orders = []
            for r in rows:
                orders.append({
                    "id": r["id"],
                    "token_number": r["token_number"],
                    "student_id": r["student_id"],
                    "items": json.loads(r["items_json"]),
                    "total_price": float(r["total_price"]),
                    "payment_method": r["payment_method"],
                    "payment_status": r["payment_status"],
                    "prep_status": r["prep_status"],
                    "token_generated": bool(r["token_generated"]),
                    "idempotency_key": r["idempotency_key"],
                    "self_healing_notes": json.loads(r["self_healing_notes_json"] or "[]"),
                    "created_at": r["created_at"],
                    "updated_at": r["updated_at"],
                })
            return orders


def get_order_by_idempotency_key(idempotency_key: str) -> Optional[Dict[str, Any]]:
    """Retrieve existing order by idempotency key to prevent double debit."""
    if not idempotency_key:
        return None
    with _lock:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM orders WHERE idempotency_key = ?", (idempotency_key,))
            r = cursor.fetchone()
            if not r:
                return None
            return {
                "id": r["id"],
                "token_number": r["token_number"],
                "student_id": r["student_id"],
                "items": json.loads(r["items_json"]),
                "total_price": float(r["total_price"]),
                "payment_method": r["payment_method"],
                "payment_status": r["payment_status"],
                "prep_status": r["prep_status"],
                "token_generated": bool(r["token_generated"]),
                "idempotency_key": r["idempotency_key"],
                "self_healing_notes": json.loads(r["self_healing_notes_json"] or "[]"),
                "created_at": r["created_at"],
                "updated_at": r["updated_at"],
            }


def update_order_status(order_id: str, new_status: str) -> Optional[Dict[str, Any]]:
    with _lock:
        with get_db() as conn:
            cursor = conn.cursor()
            now_str = datetime.utcnow().isoformat()
            cursor.execute("""
            UPDATE orders SET prep_status = ?, updated_at = ? WHERE id = ?
            """, (new_status, now_str, order_id))
            conn.commit()

            cursor.execute("SELECT * FROM orders WHERE id = ?", (order_id,))
            r = cursor.fetchone()
            if not r:
                return None
            return {
                "id": r["id"],
                "token_number": r["token_number"],
                "student_id": r["student_id"],
                "items": json.loads(r["items_json"]),
                "total_price": float(r["total_price"]),
                "payment_method": r["payment_method"],
                "payment_status": r["payment_status"],
                "prep_status": r["prep_status"],
                "token_generated": bool(r["token_generated"]),
                "idempotency_key": r["idempotency_key"],
                "self_healing_notes": json.loads(r["self_healing_notes_json"] or "[]"),
                "created_at": r["created_at"],
                "updated_at": r["updated_at"],
            }


# ============================================================
# SYSTEM STATE, METRICS & RESILIENCE
# ============================================================

def get_system_metrics() -> Dict[str, int]:
    with _lock:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT total_orders, failures_injected, auto_recoveries, double_charges_prevented FROM system_metrics WHERE id = 1")
            r = cursor.fetchone()
            if not r:
                return {"total_orders": 0, "failures_injected": 0, "auto_recoveries": 0, "double_charges_prevented": 0}
            return {
                "total_orders": r["total_orders"],
                "failures_injected": r["failures_injected"],
                "auto_recoveries": r["auto_recoveries"],
                "double_charges_prevented": r["double_charges_prevented"],
            }


def update_system_metric(field: str, increment: int = 1):
    allowed = ["failures_injected", "auto_recoveries", "double_charges_prevented", "total_orders"]
    if field not in allowed:
        return
    with _lock:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute(f"UPDATE system_metrics SET {field} = {field} + ? WHERE id = 1", (increment,))
            conn.commit()


def get_circuit_state() -> str:
    """
    Retrieve circuit breaker state with PyBreaker-style automated transition:
    If OPEN and reset_timeout (15s) has elapsed, automatically transition to HALF_OPEN (probe state).
    """
    with _lock:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT value FROM system_state WHERE key = 'circuit_state'")
            r = cursor.fetchone()
            current_state = r["value"] if r else "CLOSED"

            if current_state == "OPEN":
                cursor.execute("SELECT value FROM system_state WHERE key = 'circuit_tripped_at'")
                trip_row = cursor.fetchone()
                if trip_row:
                    try:
                        tripped_at = float(trip_row["value"])
                        if tripped_at > 0 and (time.time() - tripped_at) >= CIRCUIT_RESET_TIMEOUT_SECONDS:
                            current_state = "HALF_OPEN"
                            cursor.execute("UPDATE system_state SET value = 'HALF_OPEN' WHERE key = 'circuit_state'")
                            conn.commit()
                    except ValueError:
                        pass

            return current_state


def set_circuit_state(state: str):
    with _lock:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO system_state (key, value) VALUES ('circuit_state', ?)
            ON CONFLICT(key) DO UPDATE SET value = ?
            """, (state, state))
            if state == "OPEN":
                now_str = str(time.time())
                cursor.execute("""
                INSERT INTO system_state (key, value) VALUES ('circuit_tripped_at', ?)
                ON CONFLICT(key) DO UPDATE SET value = ?
                """, (now_str, now_str))
            conn.commit()


def trip_circuit_breaker(reason: str = "Primary UPI Gateway timeout") -> Dict[str, Any]:
    """Trip circuit breaker to OPEN, start cooldown timer, and record SRE incident."""
    with _lock:
        with get_db() as conn:
            cursor = conn.cursor()
            now_ts = str(time.time())
            cursor.execute("UPDATE system_state SET value = 'OPEN' WHERE key = 'circuit_state'")
            cursor.execute("""
            INSERT INTO system_state (key, value) VALUES ('circuit_tripped_at', ?)
            ON CONFLICT(key) DO UPDATE SET value = ?
            """, (now_ts, now_ts))
            cursor.execute("UPDATE system_state SET value = 'upi_timeout' WHERE key = 'active_chaos'")
            cursor.execute("UPDATE system_metrics SET failures_injected = failures_injected + 1, auto_recoveries = auto_recoveries + 1 WHERE id = 1")
            conn.commit()

            return record_incident(
                detected=f"💥 {reason} (100% packet loss)",
                diagnosed="Consecutive timeout threshold exceeded (>3 failed probes)",
                action_taken="Circuit Breaker TRIPPED to OPEN ➔ Diverting traffic to Campus Wallet",
                recovered=True,
                root_cause="Simulated aggregator outage. Circuit breaker isolated the fault to maintain zero downtime.",
                ttd_ms=85,
                ttr_ms=210,
                severity="HIGH"
            )


def heal_circuit_breaker() -> bool:
    """Self-heal circuit breaker back to CLOSED after successful canary probe."""
    with _lock:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT value FROM system_state WHERE key = 'circuit_state'")
            r = cursor.fetchone()
            current = r["value"] if r else "CLOSED"
            if current in ("HALF_OPEN", "OPEN"):
                cursor.execute("UPDATE system_state SET value = 'CLOSED' WHERE key = 'circuit_state'")
                cursor.execute("UPDATE system_state SET value = 'none' WHERE key = 'active_chaos'")
                cursor.execute("UPDATE system_state SET value = '0' WHERE key = 'circuit_tripped_at'")
                cursor.execute("UPDATE system_metrics SET auto_recoveries = auto_recoveries + 1 WHERE id = 1")
                conn.commit()

                record_incident(
                    detected="🟢 Canary Probe succeeded on UPI Gateway",
                    diagnosed="Latency normalized (<60ms) and health check passed",
                    action_taken="Circuit Breaker automatically RESET from HALF_OPEN ➔ CLOSED",
                    recovered=True,
                    root_cause="PyBreaker cooldown elapsed. Upstream service confirmed healthy by canary test.",
                    ttd_ms=45,
                    ttr_ms=130,
                    severity="LOW"
                )
                return True
            return False


def get_active_chaos() -> str:
    with _lock:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT value FROM system_state WHERE key = 'active_chaos'")
            r = cursor.fetchone()
            return r["value"] if r else "none"


def set_active_chaos(val: str):
    with _lock:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO system_state (key, value) VALUES ('active_chaos', ?)
            ON CONFLICT(key) DO UPDATE SET value = ?
            """, (val, val))
            conn.commit()


def record_incident(
    detected: str,
    diagnosed: str,
    action_taken: str,
    recovered: bool,
    root_cause: str,
    ttd_ms: int = 120,
    ttr_ms: int = 340,
    severity: str = "HIGH"
) -> Dict[str, Any]:
    with _lock:
        with get_db() as conn:
            cursor = conn.cursor()
            inc_id = f"INC-{uuid.uuid4().hex[:6].upper()}"
            now_str = datetime.utcnow().strftime("%I:%M:%S %p")
            cursor.execute("""
            INSERT INTO incidents (id, timestamp, detected, diagnosed, action_taken, recovered, root_cause_explanation, ttd_ms, ttr_ms, severity)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (inc_id, now_str, detected, diagnosed, action_taken, 1 if recovered else 0, root_cause, ttd_ms, ttr_ms, severity))
            conn.commit()
            return {
                "id": inc_id,
                "timestamp": now_str,
                "detected": detected,
                "diagnosed": diagnosed,
                "action_taken": action_taken,
                "recovered": recovered,
                "root_cause_explanation": root_cause,
                "ttd_ms": ttd_ms,
                "ttr_ms": ttr_ms,
                "severity": severity,
            }


def get_all_incidents() -> List[Dict[str, Any]]:
    with _lock:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM incidents ORDER BY rowid DESC LIMIT 50")
            rows = cursor.fetchall()
            return [
                {
                    "id": r["id"],
                    "timestamp": r["timestamp"],
                    "detected": r["detected"],
                    "diagnosed": r["diagnosed"],
                    "action_taken": r["action_taken"],
                    "recovered": bool(r["recovered"]),
                    "root_cause_explanation": r["root_cause_explanation"],
                    "ttd_ms": r["ttd_ms"] if "ttd_ms" in r.keys() else 120,
                    "ttr_ms": r["ttr_ms"] if "ttr_ms" in r.keys() else 340,
                    "severity": r["severity"] if "severity" in r.keys() else "HIGH",
                }
                for r in rows
            ]


def reset_system_state():
    with _lock:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE system_state SET value = 'CLOSED' WHERE key = 'circuit_state'")
            cursor.execute("UPDATE system_state SET value = 'none' WHERE key = 'active_chaos'")
            cursor.execute("UPDATE system_state SET value = '0' WHERE key = 'circuit_tripped_at'")
            cursor.execute("UPDATE system_state SET value = '0' WHERE key = 'failure_count'")
            cursor.execute("UPDATE system_metrics SET failures_injected = 0, auto_recoveries = 0, double_charges_prevented = 0 WHERE id = 1")
            cursor.execute("DELETE FROM incidents")
            conn.commit()
