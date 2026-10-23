import { useState } from "react";
import { useCanteen } from "../../context/CanteenContext";
import { AdminSidebar, type AdminTab } from "../../components/admin/AdminSidebar";
import { AdminCRMView } from "../../components/admin/AdminCRMView";
import { KitchenQueue } from "../../components/kitchen/KitchenQueue";
import { MenuManager } from "../../components/admin/MenuManager";
import { SREDashboard } from "../../components/sre/SREDashboard";
import { ChaosConsole } from "../../components/chaos/ChaosConsole";

export function AdminPortalPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>("crm");

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
    externalServices,
    crmStats,
    refreshAll,
  } = useCanteen();

  const activeOrdersCount = kitchenOrders.filter((o) => o.status !== "completed").length;

  return (
    <div className="admin-layout-container">
      <AdminSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        activeOrdersCount={activeOrdersCount}
        menuItemsCount={menu.length}
        circuitState={circuitState}
        activeChaos={activeChaos}
        totalStudentsCount={crmStats?.total_students || 4}
      />

      <main className="admin-main-content">
        {(activeTab === "crm" || activeTab === "students" || activeTab === "orders") && (
          <AdminCRMView
            orders={kitchenOrders}
            crmStats={crmStats}
            onRefresh={refreshAll}
            onAdvanceStatus={advanceKitchenStatus}
          />
        )}

        {activeTab === "kitchen" && (
          <section className="admin-panel" style={{ width: "100%" }}>
            <div className="admin-panel-header-simple">
              <div>
                <p className="eyebrow">Kitchen Operations · Order Fulfillment</p>
                <h1 className="admin-title">Live Kitchen Queue</h1>
              </div>
              <span className="muted-badge">{activeOrdersCount} in progress</span>
            </div>
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
            <div className="admin-panel-header-simple">
              <div>
                <p className="eyebrow">Inventory & Catalog · Live Pricing</p>
                <h1 className="admin-title">Menu Management</h1>
              </div>
              <span className="muted-badge">{menu.length} catalog dishes</span>
            </div>
            <MenuManager
              menu={menu}
              onAddItem={addMenuItem}
              onDeleteItem={deleteMenuItem}
              onToggleAvailability={toggleMenuItemAvailability}
            />
          </section>
        )}

        {activeTab === "sre" && (
          <div className="sre-layout-wrapper">
            <div className="admin-panel-header-simple" style={{ marginBottom: "16px" }}>
              <div>
                <p className="eyebrow">Reliability Engineering · Fault Injection</p>
                <h1 className="admin-title">System Health & Chaos Controls</h1>
              </div>
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
            <div className="admin-grid">
              <section className="admin-panel">
                <SREDashboard
                  health={health}
                  circuitState={circuitState}
                  metrics={metrics}
                  incidents={incidents}
                  selectedIncident={selectedIncident}
                  onSelectIncident={setSelectedIncident}
                  externalServices={externalServices}
                  activeChaos={activeChaos}
                  onRefresh={refreshAll}
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
          </div>
        )}
      </main>
    </div>
  );
}
