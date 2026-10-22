import { useState } from "react";
import { useCanteen } from "../../context/CanteenContext";
import { SREDashboard } from "../../components/sre/SREDashboard";
import { KitchenQueue } from "../../components/kitchen/KitchenQueue";
import { ChaosConsole } from "../../components/chaos/ChaosConsole";
import { MenuManager } from "../../components/admin/MenuManager";

export function AdminPortalPage() {
  const [activeTab, setActiveTab] = useState<"kitchen" | "menu" | "sre">("kitchen");

  const {
    menu,
    addMenuItem,
    deleteMenuItem,
    toggleMenuItemAvailability,
    circuitState,
    activeChaos,
    metrics,
    health,
    kitchenOrders,
    advanceKitchenStatus,
    deleteOrder,
    clearAllOrders,
    incidents,
    selectedIncident,
    setSelectedIncident,
    triggerChaos,
    resetAll,
  } = useCanteen();

  const activeOrdersCount = kitchenOrders.filter((o) => o.status !== "completed").length;

  return (
    <main className="admin-page">
      <div className="admin-topline">
        <div>
          <p className="eyebrow">Service desk · live operations</p>
          <h1 className="admin-title">Lunch, in motion.</h1>
          <div style={{ display: "flex", gap: "8px", marginTop: "10px", alignItems: "center" }}>
            <span className="muted-badge">{activeOrdersCount} active orders</span>
            <span
              className="muted-badge"
              style={{
                color: circuitState === "OPEN" ? "#c15b43" : "var(--leaf)",
                fontWeight: 600,
              }}
            >
              ● Circuit {circuitState.toLowerCase()}
            </span>
          </div>
        </div>
        <div className="admin-tabs">
          <button
            className={activeTab === "kitchen" ? "active" : ""}
            onClick={() => setActiveTab("kitchen")}
          >
            Kitchen queue {activeOrdersCount > 0 ? `(${activeOrdersCount})` : ""}
          </button>
          <button
            className={activeTab === "menu" ? "active" : ""}
            onClick={() => setActiveTab("menu")}
          >
            Menu items {menu.length > 0 ? `(${menu.length})` : ""}
          </button>
          <button
            className={activeTab === "sre" ? "active" : ""}
            onClick={() => setActiveTab("sre")}
          >
            Service health & controls
          </button>
        </div>
      </div>

      {activeTab === "kitchen" && (
        <section className="admin-panel" style={{ width: "100%" }}>
          <KitchenQueue
            orders={kitchenOrders}
            onAdvanceStatus={advanceKitchenStatus}
            onDeleteOrder={deleteOrder}
            onClearAllOrders={clearAllOrders}
          />
        </section>
      )}

      {activeTab === "menu" && (
        <section className="admin-panel" style={{ width: "100%" }}>
          <MenuManager
            menu={menu}
            onAddItem={addMenuItem}
            onDeleteItem={deleteMenuItem}
            onToggleAvailability={toggleMenuItemAvailability}
          />
        </section>
      )}

      {activeTab === "sre" && (
        <div className="admin-grid">
          <section className="admin-panel">
            <SREDashboard
              health={health}
              circuitState={circuitState}
              metrics={metrics}
              incidents={incidents}
              selectedIncident={selectedIncident}
              onSelectIncident={setSelectedIncident}
            />
          </section>

          <aside className="admin-rail">
            <ChaosConsole
              activeChaos={activeChaos}
              onTriggerChaos={triggerChaos}
              onResetSystem={resetAll}
            />
          </aside>
        </div>
      )}
    </main>
  );
}
