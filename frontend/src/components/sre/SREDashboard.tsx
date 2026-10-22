import type { CircuitState, Incident, SystemHealthState, SystemMetrics } from "../../types";

interface SREDashboardProps { health: SystemHealthState; circuitState: CircuitState; metrics: SystemMetrics; incidents: Incident[]; selectedIncident: Incident | null; onSelectIncident: (incident: Incident) => void; }
const labels: Record<string, readonly [string, string]> = {
  aiAgent: ["Ordering assistant", "AI service"],
  ai_agent: ["Ordering assistant", "AI service"],
  upiGateway: ["Payment gateway", "UPI provider"],
  upi_gateway: ["Payment gateway", "UPI provider"],
  campusWallet: ["Campus wallet", "Fallback payment"],
  campus_wallet: ["Campus wallet", "Fallback payment"],
  database: ["Order ledger", "Transaction store"],
};

export function SREDashboard({ health, circuitState, metrics, incidents, selectedIncident, onSelectIncident }: SREDashboardProps) {
  const healthItems = Object.entries(health) as [keyof SystemHealthState, SystemHealthState[keyof SystemHealthState]][];
  return (
    <div>
      <div className="metrics">
        {[
          [metrics.totalOrders, "Orders today"],
          [metrics.failuresInjected, "Scenarios run"],
          [metrics.autoRecoveries, "Recovered"],
          [metrics.doubleChargesPrevented, "Duplicates stopped"]
        ].map(([value, label]) => (
          <div className="metric" key={label as string}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>
      <div className="panel-title-row">
        <h3>Service health</h3>
        <span className="muted-badge">Circuit {circuitState.toLowerCase()}</span>
      </div>
      <div className="health-grid">
        {healthItems.map(([key, status]) => {
          const itemLabel = labels[key] || [String(key), "System component"];
          return (
            <div className="health-item" key={key}>
              <div>
                <strong>{itemLabel[0]}</strong>
                <small>{itemLabel[1]}</small>
              </div>
              <span className={`health-dot ${status}`} />
            </div>
          );
        })}
      </div>
      <div className="panel-title-row" style={{ marginTop: "22px" }}>
        <h3>Incident notes & self-healing log</h3>
        <span className="muted-badge">{incidents.length} events</span>
      </div>
      <div className="incident-list">
        {incidents.length === 0 ? (
          <div className="empty-panel-box" style={{ padding: "24px" }}>
            <p>No incidents recorded yet. Trigger a chaos test to see real-time recovery logs!</p>
          </div>
        ) : (
          incidents.map((incident) => (
            <article
              key={incident.id}
              onClick={() => onSelectIncident(incident)}
              className={`incident ${selectedIncident?.id === incident.id ? "selected" : ""}`}
            >
              <div className="incident-meta">
                <span>{incident.timestamp}</span>
                <span className="incident-state">
                  {incident.recovered ? "✓ Recovered" : "⚡ Active"}
                </span>
              </div>
              <p style={{ fontWeight: 600, color: "var(--ink)", margin: "4px 0 2px" }}>
                {incident.detected}
              </p>
              {incident.actionTaken && (
                <small style={{ color: "var(--muted)", fontSize: "11px", display: "block" }}>
                  🔧 {incident.actionTaken}
                </small>
              )}
            </article>
          ))
        )}
      </div>
    </div>
  );
}
