import { useState } from "react";
import { useCanteen } from "../../context/CanteenContext";
import { SREDashboard } from "../../components/sre/SREDashboard";
import { KitchenQueue } from "../../components/kitchen/KitchenQueue";
import { ChaosConsole } from "../../components/chaos/ChaosConsole";

export function AdminPortalPage() {
  const [activeTab, setActiveTab] = useState<"kitchen" | "sre">("kitchen");
  const { circuitState, activeChaos, metrics, health, kitchenOrders, incidents, selectedIncident, setSelectedIncident, triggerChaos, advanceKitchenStatus, resetAll } = useCanteen();
  const autoRecoveryRate = metrics.failuresInjected > 0 ? ((metrics.autoRecoveries / metrics.failuresInjected) * 100).toFixed(0) : "100";

  return (
    <main className="admin-page">
      <div className="admin-topline">
        <div><p className="eyebrow">Service desk · live operations</p><h1 className="admin-title">Lunch, in motion.</h1><p>{kitchenOrders.filter((o) => o.status !== "completed").length} active orders · {autoRecoveryRate}% recovery rate · payment circuit {circuitState.toLowerCase()}</p></div>
        <div className="admin-tabs"><button className={activeTab === "kitchen" ? "active" : ""} onClick={() => setActiveTab("kitchen")}>Kitchen queue</button><button className={activeTab === "sre" ? "active" : ""} onClick={() => setActiveTab("sre")}>Service health</button></div>
      </div>
      <div className="admin-tools"><span>Operational controls</span><button className="admin-reset" onClick={resetAll} title="Restore wallet and simulated service health">Reset system state</button></div>
      <div className="admin-grid">
        <section className="admin-panel">{activeTab === "kitchen" ? <KitchenQueue orders={kitchenOrders} onAdvanceStatus={advanceKitchenStatus} /> : <SREDashboard health={health} circuitState={circuitState} metrics={metrics} incidents={incidents} selectedIncident={selectedIncident} onSelectIncident={setSelectedIncident} />}</section>
        <ChaosConsole activeChaos={activeChaos} selectedIncident={selectedIncident} onTriggerChaos={triggerChaos} />
      </div>
    </main>
  );
}
