import React from "react";
import {
  LayoutDashboard,
  Users,
  UtensilsCrossed,
  BookOpen,
  Activity,
  Receipt,
  Store,
} from "lucide-react";
import type { CircuitState } from "../../types";

export type AdminTab = "crm" | "students" | "orders" | "kitchen" | "menu" | "sre";

interface AdminSidebarProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  activeOrdersCount: number;
  menuItemsCount: number;
  circuitState: CircuitState;
  activeChaos: string | null;
  totalStudentsCount?: number;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeTab,
  onTabChange,
  activeOrdersCount,
  menuItemsCount,
  circuitState,
  activeChaos,
  totalStudentsCount = 4,
}) => {
  return (
    <aside className="admin-sidebar-root">
      <div className="admin-sidebar-header">
        <div className="admin-sidebar-brand-icon">
          <Store size={20} />
        </div>
        <div>
          <h2 className="admin-sidebar-brand-title">UniCore Desk</h2>
          <p className="admin-sidebar-brand-subtitle">Campus Pay CRM & Ops</p>
        </div>
      </div>

      <nav className="admin-sidebar-nav">
        <div className="admin-sidebar-section-label">Analytics & CRM</div>

        <button
          className={`admin-sidebar-btn ${activeTab === "crm" ? "active" : ""}`}
          onClick={() => onTabChange("crm")}
        >
          <span className="admin-sidebar-icon">
            <LayoutDashboard size={18} />
          </span>
          <span className="admin-sidebar-label">Dashboard & CRM</span>
        </button>

        <button
          className={`admin-sidebar-btn ${activeTab === "students" ? "active" : ""}`}
          onClick={() => onTabChange("students")}
        >
          <span className="admin-sidebar-icon">
            <Users size={18} />
          </span>
          <span className="admin-sidebar-label">Student Directory</span>
          <span className="admin-sidebar-badge">{totalStudentsCount}</span>
        </button>

        <button
          className={`admin-sidebar-btn ${activeTab === "orders" ? "active" : ""}`}
          onClick={() => onTabChange("orders")}
        >
          <span className="admin-sidebar-icon">
            <Receipt size={18} />
          </span>
          <span className="admin-sidebar-label">Order Ledger</span>
        </button>

        <div className="admin-sidebar-section-label">Operations</div>

        <button
          className={`admin-sidebar-btn ${activeTab === "kitchen" ? "active" : ""}`}
          onClick={() => onTabChange("kitchen")}
        >
          <span className="admin-sidebar-icon">
            <UtensilsCrossed size={18} />
          </span>
          <span className="admin-sidebar-label">Kitchen Queue</span>
          {activeOrdersCount > 0 && (
            <span className="admin-sidebar-badge alert">{activeOrdersCount}</span>
          )}
        </button>

        <button
          className={`admin-sidebar-btn ${activeTab === "menu" ? "active" : ""}`}
          onClick={() => onTabChange("menu")}
        >
          <span className="admin-sidebar-icon">
            <BookOpen size={18} />
          </span>
          <span className="admin-sidebar-label">Menu Items</span>
          <span className="admin-sidebar-badge">{menuItemsCount}</span>
        </button>

        <div className="admin-sidebar-section-label">Reliability & Controls</div>

        <button
          className={`admin-sidebar-btn ${activeTab === "sre" ? "active" : ""}`}
          onClick={() => onTabChange("sre")}
        >
          <span className="admin-sidebar-icon">
            <Activity size={18} />
          </span>
          <span className="admin-sidebar-label">Service Health & SRE</span>
          <span
            className={`admin-sidebar-status-dot ${
              circuitState === "OPEN" ? "open" : circuitState === "HALF_OPEN" ? "half" : "closed"
            }`}
          />
        </button>
      </nav>

      <div className="admin-sidebar-footer">
        <div className="admin-sidebar-status-card">
          <div className="admin-sidebar-status-row">
            <span className="admin-sidebar-status-indicator">
              <span className={`status-pulse ${circuitState === "OPEN" ? "pulse-red" : "pulse-green"}`} />
              Circuit {circuitState}
            </span>
          </div>
          {activeChaos && (
            <div className="admin-sidebar-chaos-pill">
              ⚡ Chaos: {activeChaos}
            </div>
          )}
          <div className="admin-sidebar-node-info">Node: core-canteen-prod-01</div>
        </div>
      </div>
    </aside>
  );
};
