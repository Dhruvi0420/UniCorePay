interface ChaosConsoleProps {
  activeChaos: string | null;
  onTriggerChaos: (type: string) => void;
  onResetSystem?: () => void;
}

const actions = [
  ["upi_timeout", "⚡ UPI Gateway Outage", "Circuit breaker routes to Campus Wallet"],
  ["mid_payment", "🔄 Mid-Payment Crash", "Reconciliation worker issues token"],
  ["traffic_spike", "🌊 Lunch Rush Surge", "Rate limiter protects DB connection pool"],
  ["kill_backend", "💀 Process Crash", "Watchdog restarts & validates WAL integrity"],
  ["rollback", "🛡️ Kitchen Pipeline Abort", "Compensating transaction refunds wallet"],
] as const;

export function ChaosConsole({
  activeChaos,
  onTriggerChaos,
  onResetSystem,
}: ChaosConsoleProps) {
  return (
    <aside className="chaos-panel">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
        <h2 style={{ margin: 0, fontSize: "20px" }}>Service Controls</h2>
        {onResetSystem && (
          <button
            type="button"
            className="outline-button"
            style={{
              padding: "4px 10px",
              fontSize: "11px",
              color: "#dbd8cf",
              borderColor: "#4a4a3e",
              borderRadius: "999px",
              cursor: "pointer",
              background: "transparent",
            }}
            onClick={onResetSystem}
            title="Reset system to clean baseline"
          >
            ↺ Reset
          </button>
        )}
      </div>
      <p style={{ margin: "4px 0 16px", color: "#9e9b93", fontSize: "12px" }}>
        Inject failure scenarios to test autonomous self-healing.
      </p>

      <div className="chaos-list" style={{ gap: "7px" }}>
        {actions.map(([key, title, description]) => {
          const isActive = activeChaos === key;
          return (
            <button
              className="chaos-action"
              key={key}
              onClick={() => onTriggerChaos(key)}
              style={{
                padding: "10px 12px",
                borderColor: isActive ? "var(--orange)" : "#3a3a30",
                background: isActive ? "#3a3528" : "#24241d",
              }}
            >
              <strong style={{ fontSize: "12px", color: isActive ? "#f0c268" : "#fff" }}>
                {isActive ? "● Active: " : ""}
                {title}
              </strong>
              <span style={{ fontSize: "10px", color: "#9a968e", marginTop: "2px" }}>
                {description}
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
