import { useState } from "react";
import { useCanteen } from "../../context/CanteenContext";
import { SREDashboard } from "../../components/sre/SREDashboard";
import { KitchenQueue } from "../../components/kitchen/KitchenQueue";
import { ChaosConsole } from "../../components/chaos/ChaosConsole";
import { MenuManager } from "../../components/admin/MenuManager";
import { WalletManager } from "../../components/admin/WalletManager";

export function AdminPortalPage() {
  const [activeTab, setActiveTab] = useState<"kitchen" | "menu" | "wallet" | "sre">("kitchen");

  const {
    menu,
    addMenuItem,
    deleteMenuItem,
    toggleMenuItemAvailability,
    walletBalance,
    walletTransactions,
    topupWallet,
    setWalletBalanceAdmin,
    circuitState,
    activeChaos,
    metrics,
    health,
    kitchenOrders,
    incidents,
    selectedIncident,
    setSelectedIncident,
    triggerChaos,
    advanceKitchenStatus,
    resetAll,
  } = useCanteen();

  const activeOrdersCount = kitchenOrders.filter((o) => o.status !== "completed").length;
  const autoRecoveryRate =
    metrics.failuresInjected > 0
      ? ((metrics.autoRecoveries / metrics.failuresInjected) * 100).toFixed(0)
      : "100";

  return (
    <main className="admin-page">
      <div className="admin-topline">
        <div>
          <p className="eyebrow">Service desk · live operations</p>
          <h1 className="admin-title">Lunch, in motion.</h1>
          <p>
            {activeOrdersCount} active orders · {menu.length} menu items · Student Wallet ₹{walletBalance.toFixed(2)} · {autoRecoveryRate}% recovery rate · Circuit {circuitState.toLowerCase()}
          </p>
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
            className={activeTab === "wallet" ? "active" : ""}
            onClick={() => setActiveTab("wallet")}
          >
            Campus wallet (₹{walletBalance.toFixed(0)})
          </button>
          <button
            className={activeTab === "sre" ? "active" : ""}
            onClick={() => setActiveTab("sre")}
          >
            Service health
          </button>
        </div>
      </div>

      <div className="admin-tools">
        <span>Operational controls & live sync</span>
        <button
          className="admin-reset"
          onClick={resetAll}
          title="Restore wallet and simulated service health"
        >
          Reset system state
        </button>
      </div>

      <div className="admin-grid">
        <section className="admin-panel">
          {activeTab === "kitchen" && (
            <KitchenQueue orders={kitchenOrders} onAdvanceStatus={advanceKitchenStatus} />
          )}
          {activeTab === "menu" && (
            <MenuManager
              menu={menu}
              onAddItem={addMenuItem}
              onDeleteItem={deleteMenuItem}
              onToggleAvailability={toggleMenuItemAvailability}
            />
          )}
          {activeTab === "wallet" && (
            <WalletManager
              walletBalance={walletBalance}
              transactions={walletTransactions}
              onTopup={topupWallet}
              onSetBalance={setWalletBalanceAdmin}
            />
          )}
          {activeTab === "sre" && (
            <SREDashboard
              health={health}
              circuitState={circuitState}
              metrics={metrics}
              incidents={incidents}
              selectedIncident={selectedIncident}
              onSelectIncident={setSelectedIncident}
            />
          )}
        </section>

        <ChaosConsole
          activeChaos={activeChaos}
          selectedIncident={selectedIncident}
          onTriggerChaos={triggerChaos}
        />
      </div>
    </main>
  );
}
