# UniCorePay — Autonomous Self-Healing Campus Payment & Canteen Engine

> **Identity 2026 | BCA 3rd Year Hackathon**  
> **Brief:** Self-Healing Software (Scenario B: Campus Pay)  
> **Tech Stack:** Python 3.14 · FastAPI · React 19 · TypeScript · Vite · SQLite3 (ACID + RLock)

---

## 📌 Executive Summary

During campus lunch rush hours, external UPI payment aggregators experience sudden latency, packet loss, or mid-flight dropouts. Conventional canteen applications fail catastrophically in these conditions—resulting in double debits, stranded students, lost money, and kitchen counter gridlock.

**UniCorePay** is an enterprise-grade, autonomous self-healing payment and canteen order management engine. It detects infrastructure failures in real-time, diagnoses the root cause, triggers automated self-healing mechanisms without human intervention, and guarantees:
1. **Zero Downtime**: Uninterrupted food token issuance even during complete payment gateway blackouts.
2. **Zero Orphaned Debits**: Automated ledger reconciliation for transactions dropped mid-flight.
3. **Zero Double Charges**: Hyperswitch-style idempotency guard protecting student accounts against retry storms.
4. **Sub-Second Recovery**: Measured Mean Time to Recover (**MTTR < 250ms**).

---

## 🏛️ System Architecture

```mermaid
graph TD
    subgraph Client ["Client Layer (React 19 + TypeScript + Vite)"]
        SP["Student Portal & AI Concierge"]
        AP["Kitchen Desk & Operations Portal"]
        SRE["SRE Observability Dashboard"]
        CC["Chaos Monkey Console"]
    end

    subgraph Gateway ["Reverse Proxy & Application Gateway"]
        ViteProxy["Vite Reverse Proxy (:5173 ➔ :8000)"]
        FastAPI["FastAPI ASGI Engine (:8000)"]
    end

    subgraph ResilienceEngine ["Autonomous Self-Healing Core"]
        Idemp["Idempotency Guard<br/>(Deduplication Engine)"]
        PyBreaker["Circuit Breaker FSM<br/>(CLOSED ➔ OPEN ➔ HALF_OPEN)"]
        SmartRouter["Hyperswitch Smart Router<br/>(Dynamic Gateway Fallback)"]
        ReconWorker["Reconciliation Worker<br/>(Orphaned Debit Recovery)"]
        RateLimiter["Token-Bucket Throttler<br/>(Traffic Spike Protection)"]
    end

    subgraph Storage ["Thread-Safe ACID Persistence (SQLite3)"]
        DB[("ACID Thread-Safe Database<br/>• Wallets & Audit Ledger<br/>• Orders & Tokens (#T-101)<br/>• SRE Incidents (TTD/TTR)")]
    end

    Client -->|HTTP / JSON| ViteProxy
    ViteProxy --> FastAPI
    FastAPI --> Idemp
    Idemp --> PyBreaker
    PyBreaker --> SmartRouter
    SmartRouter --> ReconWorker
    FastAPI --> RateLimiter
    ResilienceEngine --> DB
```

---

## 🛠️ The 5 Self-Healing Mechanisms

| # | Failure Mode | Detection Mechanism | Autonomous Healing Action | Measured Recovery Time (TTR) |
| :-: | :--- | :--- | :--- | :-: |
| **1** | **Primary UPI Gateway Outage (100% Packet Drop)** | 3 consecutive probe timeouts trip circuit breaker | **PyBreaker + Smart Fallback:** Circuit flips to `OPEN`. Smart Router instantly diverts payment to atomic Campus Wallet debit. Order issued with zero downtime. | **~25 ms** |
| **2** | **Mid-Payment Crash / Network Disconnect** | Orphaned ledger debit detected without matching order confirmation | **Autonomous Reconciliation Worker:** Reconstructs order state from transaction ledger, issues kitchen token, and writes audit incident. | **~34 ms** |
| **3** | **Canteen Rush Traffic Spike (200+ req/s)** | Connection pool saturation detected | **Rate Limiter & Priority Queue:** Throttles exploratory reads, marks DB `DEGRADED`, and prioritizes in-flight order writes. | **~23 ms** |
| **4** | **Backend Process SIGKILL / Container Crash** | Watchdog daemon detects heartbeat loss | **Watchdog Auto-Restart:** Recovers process, verifies SQLite WAL journal integrity, and restores baseline health metrics. | **~23 ms** |
| **5** | **Client Retry Storm (Double-Click Panic)** | Idempotency key collision | **Hyperswitch Idempotency Guard:** Intercepts duplicate request, prevents second debit, returns original token, increments `double_charges_prevented`. | **~17 ms** |
| **6** | **Fulfillment Interruption (Kitchen Abort)** | Pipeline stall after wallet debit | **Automatic Rollback Engine (Mechanism 8):** Executes atomic compensating transaction, refunds 100% money back to wallet, and registers incident. | **~33 ms** |

---

## ⚡ Automated Circuit Breaker Recovery (PyBreaker Pattern)

Unlike naive systems that stay broken once tripped, UniCorePay features an **autonomous Finite State Machine (FSM)**:
1. **`CLOSED` (Normal)**: All traffic routes through primary payment pathways.
2. **`OPEN` (Tripped)**: Gateways fail ➔ Circuit trips ➔ Instant diversion to Campus Wallet fallback. Cooldown timer (15s) starts.
3. **`HALF_OPEN` (Canary Probe)**: After 15 seconds of cooldown, the circuit auto-transitions to `HALF_OPEN` without human intervention.
4. **Auto-Heal back to `CLOSED`**: The next canary request probes the primary gateway. If successful, the circuit automatically resets to `CLOSED` (Green).

---

## 🚀 How to Run Locally

### Prerequisites
- Python 3.11+ (Python 3.14 verified)
- Node.js 18+ & npm

### Terminal 1: Backend (FastAPI)
```powershell
cd UniCorePay/backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```
> API Docs: Open `http://127.0.0.1:8000/docs` for interactive Swagger UI.

### Terminal 2: Frontend (Vite + React)
```powershell
cd UniCorePay/frontend
npm run dev
```
> App UI: Open `http://localhost:5173` in your browser.

---

## 🧪 Automated Chaos Engineering CLI (`chaos.py`)

Judges and evaluators can verify all self-healing mechanisms directly from the terminal:

```bash
# Run all 5 chaos scenarios sequentially & generate SRE scorecard
python chaos.py --all

# Run specific failure scenarios
python chaos.py --scenario upi_timeout    # Tests Circuit Breaker & Wallet Fallback
python chaos.py --scenario mid_payment    # Tests Reconciliation Worker
python chaos.py --scenario traffic_spike  # Tests Token-Bucket Rate Limiter
python chaos.py --scenario kill_backend   # Tests Container Watchdog Recovery

# Run Idempotency double-charge prevention benchmark
python chaos.py --benchmark

# Reset system state to clean baseline
python chaos.py --reset
```

---

## 📊 Live Verification Evidence (From `chaos.py --all`)

```text
=================================================================
  UNICOREPAY SRE SELF-HEALING BENCHMARK SCORECARD
=================================================================
  * Total Orders Processed      : 7
  * Failures Injected           : 6
  * Auto-Recoveries Completed   : 8
  * Double Charges Prevented    : 2
  * Recorded SRE Incidents      : 9
  * System Uptime               : 99.98%
  * Autonomous Recovery Rate    : 100.0%
  * Mean Time to Recover (MTTR) : 23.4 ms (Target: < 30,000 ms)
=================================================================
```

---

## ⚖️ The Honesty Clause

> *"Show at least one failure your system cannot heal yet, and explain why. Good engineers earn trust by knowing the limits of what they have built."* — **Identity 2026 Brief**

### Known System Limit: Dual Zero-Liquidity Blackout
* **Failure Scenario**: When the external UPI Gateway is `DOWN` **AND** the student's Campus Wallet balance is **₹0.00**.
* **Why Software Cannot Heal This**:
  In a closed financial ledger, software cannot synthesize money out of thin air without committing fraud (violating double-entry bookkeeping). While UniCorePay can gracefully degrade and switch channels, it cannot extend unsecured credit without authorization.
* **Current Mitigation**: The system fails fast, preserves cart state, logs the event, and offers the student a 1-tap "Admin Wallet Top-Up" request prompt.
* **Next Architectural Evolution**: Implement an **"Offline Micro-Overdraft Line"** backed by institutional student ID KYC, allowing small canteen debits up to ₹100 with reconciliation on subsequent top-ups.

---

## 📝 Annexure: AI Use Declaration

| AI Tool | What I Asked It to Do | What I Wrote, Changed or Checked Myself |
| :--- | :--- | :--- |
| **Claude / Gemini** | Explain Circuit Breaker FSM math (`pybreaker`) and Hyperswitch idempotency locking patterns. | Implemented custom `RLock` SQLite transaction layer in `db.py`, designed state transitions, and verified ACID consistency. |
| **Claude / Gemini** | Help write boilerplate argparse CLI structure for `chaos.py`. | Created scenario execution flows, latency benchmarks, Windows encoding fixes, and terminal scorecards. |
| **Claude / Gemini** | Review SRE incident data contract (`Detected ➔ Diagnosed ➔ Action ➔ Recovered`). | Built Pydantic v2 schemas in `models.py`, added database migrations for `ttd_ms` and `ttr_ms`, and wired frontend hooks. |

**Declaration**: *We confirm that this entry is our own work, that every AI tool used is listed above, and that we can explain every part of the submitted code.*

---

## 👥 Authors
* **Department**: BCA 3rd Year
* **Event**: Identity 2026 — Design & Innovation Hackathon (Dezyne École)
* **Challenge**: Scenario B — Campus Pay (Self-Healing Software)
