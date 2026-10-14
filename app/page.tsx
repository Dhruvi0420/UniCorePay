"use client";

/**
 * ============================================================
 * UNICOREPAY — Mission Control Dashboard (Main Page)
 * ============================================================
 *
 * This is the single-screen "Mission Control" layout with 3 columns:
 *
 * LEFT   → Student UI + AI Canteen Agent (Chat + Quick Prompts + Tokens)
 * CENTER → SRE Live Health Dashboard (Status Cards + Metrics + Incident Log)
 * RIGHT  → Chaos Monkey Console (Demo Buttons to break the system)
 *
 * All panels update in real-time by polling /api/health every 2 seconds.
 */

import { useState, useEffect, useRef, useCallback } from "react";

// ============================================================
// TYPE DEFINITIONS (matching API responses)
// ============================================================

interface HealthData {
  health: {
    aiAgent: string;
    upiGateway: string;
    campusWallet: string;
    database: string;
  };
  metrics: {
    totalOrders: number;
    failuresInjected: number;
    autoRecoveries: number;
    doubleChargesPrevented: number;
  };
  circuitBreaker: {
    state: string;
    failureCount: number;
    lastFailureAt: string | null;
    nextRetryAt: string | null;
  };
  incidentLog: {
    id: string;
    timestamp: string;
    detected: string;
    diagnosed: string;
    actionTaken: string;
    recovered: boolean;
  }[];
  wallet: { balance: number };
  chaos: {
    upiTimeout: boolean;
    midPaymentCrash: boolean;
    trafficSpike: boolean;
    backendKilled: boolean;
  };
  recentTokens: {
    token: string;
    items: string;
    total: number;
    method: string;
    time: string;
  }[];
}

interface ChatMessage {
  id: string;
  role: "user" | "ai" | "system";
  content: string;
  timestamp: string;
  tokenNumber?: string;
  orderSuccess?: boolean;
}

// ============================================================
// QUICK PROMPT PRESETS
// ============================================================

const QUICK_PROMPTS = [
  { label: "2 Dosa + Coffee ☕", message: "Bhai 2 masala dosa aur 1 cold coffee de UPI se pay kar" },
  { label: "Samosa Party 🔺", message: "4 samosa aur 2 chai order kar" },
  { label: "Biryani Combo 🍚", message: "1 veg biryani aur 1 cold coffee" },
  { label: "Quick Maggi 🍜", message: "2 maggi aur 1 chai" },
  { label: "Show Menu 📋", message: "menu dikha" },
  { label: "Check Balance 💰", message: "wallet balance check kar" },
];

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function MissionControlDashboard() {
  // --- State ---
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "ai",
      content:
        "👋 Namaste! Main hun **UniCorePay AI Agent** — tera campus canteen buddy!\n\nMujhe Hinglish ya English mein bol kya khana hai. Example:\n• \"2 masala dosa aur 1 coffee\"\n• \"menu dikha\"\n• \"wallet balance check kar\"\n\nLet's go! 🚀",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [chaosLoading, setChaosLoading] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // --- Poll health data every 2 seconds ---
  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch("/api/health");
      if (res.ok) {
        const data = await res.json();
        setHealthData(data);
      }
    } catch {
      // Silently handle — the watchdog will recover
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 2000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  // --- Auto-scroll chat ---
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // --- Send message to AI Agent ---
  const sendMessage = async (message: string) => {
    if (!message.trim() || isProcessing) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: message.trim(),
      timestamp: new Date().toISOString(),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsProcessing(true);

    try {
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim() }),
      });

      const data = await res.json();

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: "ai",
        content: data.aiResponse || "Something went wrong 😅",
        timestamp: new Date().toISOString(),
        tokenNumber: data.tokenNumber,
        orderSuccess: data.type === "order_success",
      };

      setChatMessages((prev) => [...prev, aiMsg]);

      // Refresh health data immediately after an order
      await fetchHealth();
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "system",
          content: "⚠️ Network error — could not reach the server. Retry karo!",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsProcessing(false);
      inputRef.current?.focus();
    }
  };

  // --- Trigger chaos action ---
  const triggerChaos = async (action: string) => {
    setChaosLoading(action);
    try {
      await fetch("/api/chaos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      await fetchHealth();
    } catch {
      // ignore
    } finally {
      setChaosLoading(null);
    }
  };

  // --- Reset system ---
  const resetSystem = async () => {
    setChaosLoading("reset");
    try {
      await fetch("/api/reset", { method: "POST" });
      setChatMessages([
        {
          id: "reset-" + Date.now(),
          role: "system",
          content: "🔄 System has been fully reset! Wallet balance restored to ₹2500. Ready for demo!",
          timestamp: new Date().toISOString(),
        },
      ]);
      await fetchHealth();
    } catch {
      // ignore
    } finally {
      setChaosLoading(null);
    }
  };

  const successRate =
    healthData && healthData.metrics.failuresInjected > 0
      ? (
          (healthData.metrics.autoRecoveries /
            healthData.metrics.failuresInjected) *
          100
        ).toFixed(1)
      : "100.0";

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* ═══════════════════════════════════════════
          TOP BAR — Project Title & Status
          ═══════════════════════════════════════════ */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-glass)] backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-500/20">
            U
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-[var(--text-primary)]">
              UniCorePay{" "}
              <span className="text-[var(--text-muted)] font-normal">
                — Self-Healing Campus Canteen
              </span>
            </h1>
            <p className="text-[0.65rem] text-[var(--text-muted)] font-mono">
              Mission Control Dashboard • Identity Hackathon 2026
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Live clock */}
          <LiveClock />
          {/* Circuit Breaker State Pill */}
          {healthData && (
            <div
              className={`px-3 py-1 rounded-full text-[0.65rem] font-mono font-bold border ${
                healthData.circuitBreaker.state === "CLOSED"
                  ? "border-green-500/30 text-green-400 bg-green-500/10"
                  : healthData.circuitBreaker.state === "OPEN"
                  ? "border-red-500/30 text-red-400 bg-red-500/10 animate-pulse"
                  : "border-amber-500/30 text-amber-400 bg-amber-500/10"
              }`}
            >
              CB: {healthData.circuitBreaker.state}
            </div>
          )}
          <button
            onClick={resetSystem}
            disabled={chaosLoading === "reset"}
            className="px-3 py-1.5 rounded-lg text-[0.7rem] font-semibold bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-white hover:border-blue-500/40 transition-all"
          >
            {chaosLoading === "reset" ? "Resetting..." : "🔄 Reset All"}
          </button>
        </div>
      </header>

      {/* ═══════════════════════════════════════════
          3-COLUMN MISSION GRID
          ═══════════════════════════════════════════ */}
      <div className="mission-grid flex-1 overflow-hidden">
        {/* ─────────────────────────────────────────
            LEFT PANEL: AI Canteen Agent
            ───────────────────────────────────────── */}
        <div className="glass-card flex flex-col overflow-hidden">
          {/* Panel Header */}
          <div className="px-4 py-3 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2">
              <span className="text-lg">🤖</span>
              <div>
                <h2 className="text-sm font-bold text-[var(--text-primary)]">
                  AI Canteen Agent
                </h2>
                <p className="text-[0.6rem] text-[var(--text-muted)]">
                  Hinglish + English • Campus Wallet: ₹
                  {healthData?.wallet.balance.toFixed(2) || "---"}
                </p>
              </div>
              {isProcessing && (
                <div className="ml-auto flex gap-1">
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                </div>
              )}
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {chatMessages.map((msg) => (
              <div key={msg.id} className={`animate-slide-up ${msg.role === "user" ? "flex justify-end" : ""}`}>
                {msg.role === "user" ? (
                  <div className="chat-user">
                    <p className="text-[0.8rem] text-blue-100 whitespace-pre-wrap">
                      {msg.content}
                    </p>
                  </div>
                ) : msg.role === "system" ? (
                  <div className="px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200 text-[0.75rem]">
                    {msg.content}
                  </div>
                ) : (
                  <div>
                    <div className="chat-ai">
                      <p className="text-[0.8rem] text-slate-200 whitespace-pre-wrap">
                        {formatAIMessage(msg.content)}
                      </p>
                    </div>
                    {msg.tokenNumber && (
                      <div className="token-card mt-2 flex items-center gap-3">
                        <span className="text-2xl">🎫</span>
                        <div>
                          <p className="text-xs text-green-300/60 font-medium">
                            YOUR TOKEN
                          </p>
                          <p className="text-xl font-mono font-bold text-green-400">
                            {msg.tokenNumber}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Prompts */}
          <div className="px-4 py-2 border-t border-[var(--border-subtle)]">
            <div className="flex gap-1.5 overflow-x-auto pb-2">
              {QUICK_PROMPTS.map((qp) => (
                <button
                  key={qp.label}
                  onClick={() => sendMessage(qp.message)}
                  disabled={isProcessing}
                  className="quick-prompt"
                >
                  {qp.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chat Input */}
          <div className="px-4 py-3 border-t border-[var(--border-subtle)]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(inputValue);
              }}
              className="flex gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder='Bol kya khayega... e.g. "2 dosa aur 1 chai"'
                disabled={isProcessing}
                className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-blue-500/50 transition-colors"
              />
              <button
                type="submit"
                disabled={isProcessing || !inputValue.trim()}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-semibold hover:from-blue-500 hover:to-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/20"
              >
                {isProcessing ? "⏳" : "Send"}
              </button>
            </form>
          </div>

          {/* Active Tokens */}
          {healthData && healthData.recentTokens.length > 0 && (
            <div className="px-4 py-2 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)]/30">
              <p className="text-[0.6rem] text-[var(--text-muted)] font-semibold uppercase tracking-wider mb-1.5">
                Active Tokens
              </p>
              <div className="flex gap-2 overflow-x-auto">
                {healthData.recentTokens.map((t) => (
                  <div
                    key={t.token}
                    className="flex-shrink-0 px-2.5 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 font-mono text-xs font-bold"
                  >
                    {t.token}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ─────────────────────────────────────────
            CENTER PANEL: SRE Health Dashboard
            ───────────────────────────────────────── */}
        <div className="flex flex-col gap-4 overflow-y-auto">
          {/* Component Status Cards */}
          <div className="glass-card p-4">
            <h3 className="section-header">⚙️ System Component Status</h3>
            <div className="grid grid-cols-2 gap-3">
              <StatusCard
                label="AI Agent Brain"
                icon="🧠"
                status={healthData?.health.aiAgent || "healthy"}
              />
              <StatusCard
                label="UPI Payment Gateway"
                icon="💳"
                status={healthData?.health.upiGateway || "healthy"}
                extra={
                  healthData?.circuitBreaker.state !== "CLOSED"
                    ? `CB: ${healthData?.circuitBreaker.state}`
                    : undefined
                }
              />
              <StatusCard
                label="Campus Wallet"
                icon="👛"
                status={healthData?.health.campusWallet || "healthy"}
                extra={`₹${healthData?.wallet.balance.toFixed(2) || "---"}`}
              />
              <StatusCard
                label="Database & TX Worker"
                icon="🗄️"
                status={healthData?.health.database || "healthy"}
              />
            </div>
          </div>

          {/* Live Metrics */}
          <div className="glass-card p-4">
            <h3 className="section-header">📊 Live Metrics</h3>
            <div className="grid grid-cols-4 gap-3">
              <MetricCard
                label="Orders"
                value={healthData?.metrics.totalOrders ?? 0}
                color="blue"
              />
              <MetricCard
                label="Failures"
                value={healthData?.metrics.failuresInjected ?? 0}
                color="red"
              />
              <MetricCard
                label="Auto-Healed"
                value={healthData?.metrics.autoRecoveries ?? 0}
                color="green"
                subtext={`${successRate}% rate`}
              />
              <MetricCard
                label="Dedup'd"
                value={healthData?.metrics.doubleChargesPrevented ?? 0}
                color="purple"
              />
            </div>
          </div>

          {/* Incident Log */}
          <div className="glass-card p-4 flex-1 overflow-hidden flex flex-col">
            <h3 className="section-header">
              📋 Structured Incident Log{" "}
              <span className="text-[var(--text-muted)] font-normal ml-2">
                ({healthData?.incidentLog.length || 0} events)
              </span>
            </h3>
            <div className="flex-1 overflow-y-auto space-y-0">
              {healthData?.incidentLog.length === 0 && (
                <p className="text-sm text-[var(--text-muted)] text-center py-8">
                  No incidents yet. Use the Chaos Console →<br />
                  to inject failures and watch self-healing! 🔧
                </p>
              )}
              {healthData?.incidentLog.map((log) => (
                <div key={log.id} className="log-row">
                  <div className="text-[var(--text-muted)]">
                    {new Date(log.timestamp).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-amber-300/90">
                      <span className="text-[var(--text-muted)]">DETECTED:</span>{" "}
                      {log.detected}
                    </p>
                    <p className="text-slate-400">
                      <span className="text-[var(--text-muted)]">DIAGNOSED:</span>{" "}
                      {log.diagnosed}
                    </p>
                    <p className="text-blue-300/90">
                      <span className="text-[var(--text-muted)]">ACTION:</span>{" "}
                      {log.actionTaken}
                    </p>
                    <p>
                      <span className="text-[var(--text-muted)]">RECOVERED:</span>{" "}
                      <span
                        className={
                          log.recovered ? "text-green-400" : "text-red-400"
                        }
                      >
                        {log.recovered ? "✅ Yes" : "⏳ Pending"}
                      </span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────
            RIGHT PANEL: Chaos Monkey Console
            ───────────────────────────────────────── */}
        <div className="glass-card flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border-subtle)]">
            <h2 className="text-sm font-bold text-[var(--text-primary)]">
              🐒 Chaos Monkey Console
            </h2>
            <p className="text-[0.6rem] text-[var(--text-muted)]">
              Inject failures live to demo self-healing
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {/* Chaos Button 1: UPI Timeout */}
            <ChaosButton
              emoji="💥"
              title="Crash UPI Gateway Timeout"
              description="Forces the UPI gateway to hang for 10s. Triggers Retry + Circuit Breaker."
              mechanism="Mechanisms 1 & 2"
              onClick={() => triggerChaos("upi_timeout")}
              isLoading={chaosLoading === "upi_timeout"}
              isActive={healthData?.chaos.upiTimeout}
            />

            {/* Chaos Button 2: Mid-Payment Crash */}
            <ChaosButton
              emoji="⚡"
              title="Corrupt Mid-Payment Glitch"
              description="Deducts money but crashes before token. Triggers Reconciliation Worker."
              mechanism="Mechanism 3"
              onClick={() => triggerChaos("mid_payment")}
              isLoading={chaosLoading === "mid_payment"}
              isActive={healthData?.chaos.midPaymentCrash}
            />

            {/* Chaos Button 3: Traffic Spike */}
            <ChaosButton
              emoji="🌊"
              title="Canteen Rush Spike (200 req/s)"
              description="Simulates extreme traffic. Triggers Rate Limiting & Queue."
              mechanism="Rate Limiter"
              onClick={() => triggerChaos("traffic_spike")}
              isLoading={chaosLoading === "traffic_spike"}
              isActive={healthData?.chaos.trafficSpike}
            />

            {/* Chaos Button 4: Kill Backend */}
            <ChaosButton
              emoji="💀"
              title="Kill Backend Process"
              description="Freezes backend for 8s. Watchdog auto-restarts."
              mechanism="Mechanism 4"
              onClick={() => triggerChaos("kill_backend")}
              isLoading={chaosLoading === "kill_backend"}
              isActive={healthData?.chaos.backendKilled}
            />

            {/* Divider */}
            <div className="border-t border-[var(--border-subtle)] my-2" />

            {/* Reset Chaos */}
            <button
              onClick={() => triggerChaos("reset")}
              disabled={chaosLoading === "reset"}
              className="w-full px-4 py-3 rounded-xl border border-blue-500/20 bg-blue-500/5 text-blue-300 text-sm font-semibold hover:bg-blue-500/10 hover:border-blue-500/40 transition-all"
            >
              {chaosLoading === "reset" ? "Clearing..." : "🔄 Reset All Chaos"}
            </button>
          </div>

          {/* Healing Mechanisms Legend */}
          <div className="px-4 py-3 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)]/30">
            <p className="text-[0.6rem] text-[var(--text-muted)] font-semibold uppercase tracking-wider mb-2">
              Self-Healing Mechanisms
            </p>
            <div className="space-y-1.5">
              <MechanismBadge num={1} label="Retry + Backoff + Idempotency" />
              <MechanismBadge num={2} label="Circuit Breaker → Wallet Fallback" />
              <MechanismBadge num={3} label="Reconciliation Worker (Auto-Repair)" />
              <MechanismBadge num={4} label="Watchdog Health Check (Auto-Restart)" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

/** Live updating clock in the header */
function LiveClock() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const update = () =>
      setTime(
        new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="text-xs font-mono text-[var(--text-muted)]">{time}</span>
  );
}

/** Status card for each system component */
function StatusCard({
  label,
  icon,
  status,
  extra,
}: {
  label: string;
  icon: string;
  status: string;
  extra?: string;
}) {
  const dotClass =
    status === "healthy" ? "green" : status === "degraded" ? "amber" : "red";
  const statusLabel =
    status === "healthy"
      ? "Operational"
      : status === "degraded"
      ? "Degraded"
      : "Down";

  return (
    <div className="glass-card-sm p-3 flex items-center gap-3">
      <span className="text-xl">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
          {label}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <div className={`status-dot ${dotClass}`} />
          <span
            className={`text-[0.65rem] font-medium ${
              status === "healthy"
                ? "text-green-400"
                : status === "degraded"
                ? "text-amber-400"
                : "text-red-400"
            }`}
          >
            {statusLabel}
          </span>
        </div>
      </div>
      {extra && (
        <span className="text-[0.6rem] font-mono text-[var(--text-muted)] bg-[var(--bg-secondary)] px-2 py-0.5 rounded">
          {extra}
        </span>
      )}
    </div>
  );
}

/** Metric counter card */
function MetricCard({
  label,
  value,
  color,
  subtext,
}: {
  label: string;
  value: number;
  color: string;
  subtext?: string;
}) {
  return (
    <div className="metric-card text-center">
      <p className={`metric-value ${color}`}>{value}</p>
      <p className="text-[0.6rem] font-semibold text-[var(--text-muted)] uppercase tracking-wider mt-1">
        {label}
      </p>
      {subtext && (
        <p className="text-[0.55rem] text-[var(--text-muted)] font-mono mt-0.5">
          {subtext}
        </p>
      )}
    </div>
  );
}

/** Chaos injection button */
function ChaosButton({
  emoji,
  title,
  description,
  mechanism,
  onClick,
  isLoading,
  isActive,
}: {
  emoji: string;
  title: string;
  description: string;
  mechanism: string;
  onClick: () => void;
  isLoading: boolean;
  isActive?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={isLoading || isActive} className="chaos-btn">
      <div className="flex items-start gap-3">
        <span className="text-xl mt-0.5">{emoji}</span>
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[0.82rem]">{title}</span>
            {isActive && (
              <span className="px-1.5 py-0.5 rounded text-[0.55rem] font-bold bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">
                ACTIVE
              </span>
            )}
          </div>
          <p className="text-[0.68rem] text-[var(--text-muted)] mt-0.5">
            {description}
          </p>
          <p className="text-[0.6rem] text-purple-400/70 mt-1 font-mono">
            → {mechanism}
          </p>
        </div>
      </div>
    </button>
  );
}

/** Legend badge for healing mechanisms */
function MechanismBadge({ num, label }: { num: number; label: string }) {
  const colors = [
    "",
    "from-blue-500/20 to-blue-500/5 border-blue-500/20 text-blue-300",
    "from-amber-500/20 to-amber-500/5 border-amber-500/20 text-amber-300",
    "from-green-500/20 to-green-500/5 border-green-500/20 text-green-300",
    "from-purple-500/20 to-purple-500/5 border-purple-500/20 text-purple-300",
  ];
  return (
    <div
      className={`flex items-center gap-2 px-2 py-1 rounded-lg bg-gradient-to-r border text-[0.65rem] ${colors[num]}`}
    >
      <span className="font-mono font-bold text-[0.6rem] opacity-60">M{num}</span>
      <span>{label}</span>
    </div>
  );
}

// ============================================================
// HELPER: Format AI message (basic markdown → HTML)
// ============================================================

function formatAIMessage(content: string): React.ReactNode {
  // Simple markdown rendering for bold and line breaks
  const parts = content.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-bold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    // Handle newlines
    return part.split("\n").map((line, j) => (
      <span key={`${i}-${j}`}>
        {j > 0 && <br />}
        {line}
      </span>
    ));
  });
}
