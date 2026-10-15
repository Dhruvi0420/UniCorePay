import type { Incident } from "../../types";

interface ChaosConsoleProps { activeChaos: string | null; selectedIncident: Incident | null; onTriggerChaos: (type: string) => void; }

const actions = [
  ["upi_timeout", "Payment gateway timeout", "Route traffic through the campus wallet"],
  ["mid_payment", "Interrupt a payment", "Test the reconciliation worker"],
  ["traffic_spike", "Lunch rush", "Simulate a 200 request per second spike"],
  ["kill_backend", "Restart the service", "Test recovery after a process crash"],
] as const;

export function ChaosConsole({ activeChaos, selectedIncident, onTriggerChaos }: ChaosConsoleProps) {
  return <aside className="chaos-panel"><h2>Service controls</h2><p>Run a reliability check. Each scenario updates service health and incident history.</p><div className="chaos-list">{actions.map(([key, title, description]) => <button className="chaos-action" key={key} onClick={() => onTriggerChaos(key)}><strong>{activeChaos === key ? "Running · " : ""}{title}</strong><span>{description}</span></button>)}</div><div className="diagnosis"><h4>Latest diagnosis</h4><p>{selectedIncident ? selectedIncident.rootCause : "No incidents have been recorded yet."}</p></div></aside>;
}
