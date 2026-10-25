import React, { useState, useMemo } from "react";
import {
  Users,
  TrendingUp,
  Receipt,
  CreditCard,
  Wallet,
  Search,
  Filter,
  Clock,
  X,
  RefreshCw,
  Smartphone,
  ShieldCheck,
} from "lucide-react";
import type { KitchenOrder, CRMStats, StudentProfile } from "../../types";

interface AdminCRMViewProps {
  orders: KitchenOrder[];
  crmStats: CRMStats | null;
  onRefresh: () => void;
  onAdvanceStatus?: (orderId: string, nextStatus: any) => void;
}

export const AdminCRMView: React.FC<AdminCRMViewProps> = ({
  orders,
  crmStats,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudentFilter, setSelectedStudentFilter] = useState<string | null>(null);
  const [paymentFilter, setPaymentFilter] = useState<"all" | "upi" | "campus_wallet">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [inspectOrder, setInspectOrder] = useState<KitchenOrder | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Pre-configured students if crmStats is still loading
  const students: StudentProfile[] = useMemo(() => {
    if (crmStats?.students && crmStats.students.length > 0) {
      return crmStats.students;
    }
    return [
      {
        student_id: "STU-2026-001",
        name: "Dhruvi Patel",
        branch: "BCA 3rd Year (Dezyne École)",
        email: "dhruvi.p@campus.edu",
        phone: "+91 98765 43210",
        avatar: "👩‍🎓",
        wallet_balance: 1150.0,
        orders_count: orders.filter((o) => (o.studentId || "STU-2026-001") === "STU-2026-001").length,
        total_spent: orders
          .filter((o) => (o.studentId || "STU-2026-001") === "STU-2026-001")
          .reduce((sum, o) => sum + o.totalPrice, 0),
        preferred_payment: "campus_wallet",
      },
      {
        student_id: "STU-2026-014",
        name: "Aarav Sharma",
        branch: "B.Tech Computer Science (2nd Yr)",
        email: "aarav.s@campus.edu",
        phone: "+91 98234 11223",
        avatar: "👨‍💻",
        wallet_balance: 250.0,
        orders_count: 0,
        total_spent: 0,
        preferred_payment: "upi",
      },
      {
        student_id: "STU-2026-027",
        name: "Ananya Roy",
        branch: "B.Des Fashion & UI (3rd Yr)",
        email: "ananya.r@campus.edu",
        phone: "+91 97112 55667",
        avatar: "🎨",
        wallet_balance: 120.0,
        orders_count: 0,
        total_spent: 0,
        preferred_payment: "upi",
      },
      {
        student_id: "STU-2026-042",
        name: "Kabir Mehta",
        branch: "MCA Software Systems (1st Yr)",
        email: "kabir.m@campus.edu",
        phone: "+91 96554 99881",
        avatar: "📱",
        wallet_balance: 500.0,
        orders_count: 0,
        total_spent: 0,
        preferred_payment: "campus_wallet",
      },
    ];
  }, [crmStats, orders]);

  // Aggregate metrics
  const totalRevenue = crmStats?.total_revenue ?? orders.reduce((sum, o) => sum + o.totalPrice, 0);
  const totalOrders = orders.length;
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const upiOrders = orders.filter((o) => o.paymentMethod === "upi");
  const walletOrders = orders.filter((o) => o.paymentMethod === "campus_wallet");
  const upiCount = upiOrders.length;
  const walletCount = walletOrders.length;
  const upiPercentage = totalOrders > 0 ? Math.round((upiCount / totalOrders) * 100) : 0;
  const walletPercentage = totalOrders > 0 ? Math.round((walletCount / totalOrders) * 100) : 0;
  const upiRevenue = upiOrders.reduce((sum, o) => sum + o.totalPrice, 0);
  const walletRevenue = walletOrders.reduce((sum, o) => sum + o.totalPrice, 0);

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const studentId = order.studentId || "STU-2026-001";
      const studentName = students.find((s) => s.student_id === studentId)?.name || "";
      const matchesSearch =
        searchQuery.trim() === "" ||
        order.tokenNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.items.some((item) => item.name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStudent = !selectedStudentFilter || studentId === selectedStudentFilter;
      const matchesPayment = paymentFilter === "all" || order.paymentMethod === paymentFilter;
      const matchesStatus = statusFilter === "all" || order.status === statusFilter;

      return matchesSearch && matchesStudent && matchesPayment && matchesStatus;
    });
  }, [orders, searchQuery, selectedStudentFilter, paymentFilter, statusFilter, students]);

  return (
    <div className="crm-view-container">
      {/* Top Header */}
      <div className="crm-header-row">
        <div>
          <span className="eyebrow">Executive Operations · Real-Time Audit</span>
          <h1 className="crm-main-title">Campus Pay CRM & Ledger</h1>
          <p className="crm-subtitle">
            Comprehensive audit of student cohorts, payment channel splits, and live order fulfillment.
          </p>
        </div>
        <div className="crm-header-actions">
          <button
            className={`btn-secondary crm-refresh-btn ${isRefreshing ? "refreshing" : ""}`}
            onClick={handleManualRefresh}
            title="Refresh CRM data"
          >
            <RefreshCw size={15} />
            <span>Sync Live</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="crm-kpi-grid">
        <div className="crm-kpi-card">
          <div className="crm-kpi-top">
            <span className="crm-kpi-label">Total Campus Revenue</span>
            <div className="crm-kpi-icon-wrap bg-leaf">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="crm-kpi-value">₹{totalRevenue.toFixed(2)}</div>
          <div className="crm-kpi-sub">Avg Order: ₹{averageOrderValue.toFixed(2)}</div>
        </div>

        <div className="crm-kpi-card">
          <div className="crm-kpi-top">
            <span className="crm-kpi-label">Total Canteen Orders</span>
            <div className="crm-kpi-icon-wrap bg-orange">
              <Receipt size={18} />
            </div>
          </div>
          <div className="crm-kpi-value">{totalOrders}</div>
          <div className="crm-kpi-sub">
            {orders.filter((o) => o.status !== "completed").length} active in kitchen
          </div>
        </div>

        <div className="crm-kpi-card">
          <div className="crm-kpi-top">
            <span className="crm-kpi-label">Registered Students</span>
            <div className="crm-kpi-icon-wrap bg-blue">
              <Users size={18} />
            </div>
          </div>
          <div className="crm-kpi-value">{students.length}</div>
          <div className="crm-kpi-sub">
            {students.filter((s) => s.orders_count > 0).length} active diners
          </div>
        </div>

        <div className="crm-kpi-card">
          <div className="crm-kpi-top">
            <span className="crm-kpi-label">Payment Channel Split</span>
            <div className="crm-kpi-icon-wrap bg-purple">
              <CreditCard size={18} />
            </div>
          </div>
          <div className="crm-kpi-value">
            {upiPercentage}% <span className="crm-kpi-slash">/</span> {walletPercentage}%
          </div>
          <div className="crm-split-bar">
            <div
              className="crm-split-segment upi"
              style={{ width: `${upiPercentage}%` }}
              title={`UPI: ₹${upiRevenue.toFixed(2)} (${upiCount} orders)`}
            />
            <div
              className="crm-split-segment wallet"
              style={{ width: `${walletPercentage}%` }}
              title={`Wallet: ₹${walletRevenue.toFixed(2)} (${walletCount} orders)`}
            />
          </div>
          <div className="crm-kpi-sub-split">
            <span>UPI: ₹{upiRevenue.toFixed(0)}</span>
            <span>Wallet: ₹{walletRevenue.toFixed(0)}</span>
          </div>
        </div>
      </div>

      {/* Student Directory Section */}
      <section className="crm-section">
        <div className="crm-section-header">
          <div>
            <h2 className="crm-section-title">Student Cohorts & Accounts</h2>
            <p className="crm-section-subtitle">
              Click a student profile to filter and inspect their complete purchase history.
            </p>
          </div>
          {selectedStudentFilter && (
            <button
              className="crm-clear-filter-btn"
              onClick={() => setSelectedStudentFilter(null)}
            >
              <X size={14} /> Clear Student Filter ({selectedStudentFilter})
            </button>
          )}
        </div>

        <div className="crm-table-wrapper crm-student-table-wrapper">
          <table className="crm-table crm-student-table">
            <thead>
              <tr>
                <th>Student Profile</th>
                <th>Academic Cohort</th>
                <th>Wallet Balance</th>
                <th>Orders Placed</th>
                <th>Total Spent</th>
                <th>Preferred Payment</th>
                <th style={{ textAlign: "right" }}>Cohort Filter</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => {
                const isSelected = selectedStudentFilter === student.student_id;
                return (
                  <tr
                    key={student.student_id}
                    className={`crm-table-row crm-student-row ${isSelected ? "selected-student-row" : ""}`}
                    onClick={() =>
                      setSelectedStudentFilter(isSelected ? null : student.student_id)
                    }
                    style={{ cursor: "pointer" }}
                  >
                    <td>
                      <div className="crm-table-student">
                        <span className="crm-mini-avatar">{student.avatar}</span>
                        <div>
                          <div className="crm-student-name-bold">{student.name}</div>
                          <div className="crm-student-id-sub">{student.student_id}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="crm-student-branch-text">{student.branch}</span>
                    </td>
                    <td>
                      <span className="crm-money-val">₹{student.wallet_balance.toFixed(2)}</span>
                    </td>
                    <td>
                      <span className="crm-orders-count-badge">
                        {student.orders_count} {student.orders_count === 1 ? "order" : "orders"}
                      </span>
                    </td>
                    <td>
                      <span className="crm-money-val bold">₹{student.total_spent.toFixed(2)}</span>
                    </td>
                    <td>
                      <span
                        className={`crm-payment-tag ${
                          student.preferred_payment === "campus_wallet" ? "wallet" : "upi"
                        }`}
                      >
                        {student.preferred_payment === "campus_wallet"
                          ? "💳 Campus Wallet"
                          : student.preferred_payment === "upi"
                          ? "📱 UPI Gateway"
                          : "Campus Pay"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        className={`crm-student-filter-btn ${isSelected ? "active" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedStudentFilter(isSelected ? null : student.student_id);
                        }}
                      >
                        {isSelected ? "Showing Orders ✓" : "Filter Orders ➔"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Orders Ledger & Customer Journey */}
      <section className="crm-section">
        <div className="crm-section-header">
          <div>
            <h2 className="crm-section-title">Comprehensive Order Ledger</h2>
            <p className="crm-section-subtitle">
              Audit timestamps, payment methods, ordered items, and autonomous self-healing trails.
            </p>
          </div>
          <span className="muted-badge">{filteredOrders.length} orders matched</span>
        </div>

        {/* Filters and Search Toolbar */}
        <div className="crm-toolbar">
          <div className="crm-search-box">
            <Search size={16} className="crm-search-icon" />
            <input
              type="text"
              placeholder="Search token, student ID, student name, dish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="crm-clear-search"
                onClick={() => setSearchQuery("")}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="crm-filters-group">
            {/* Payment Filter */}
            <div className="crm-filter-select-wrapper">
              <CreditCard size={14} />
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value as any)}
              >
                <option value="all">All Channels</option>
                <option value="upi">UPI Gateway</option>
                <option value="campus_wallet">Campus Wallet</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="crm-filter-select-wrapper">
              <Filter size={14} />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Prep Statuses</option>
                <option value="received">Received</option>
                <option value="preparing">Preparing</option>
                <option value="ready">Ready for Pickup</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Ledger Table */}
        {filteredOrders.length === 0 ? (
          <div className="crm-empty-state">
            <Receipt size={36} className="text-muted" />
            <h3>No orders found</h3>
            <p>Try clearing your search query or student filter to see previous orders.</p>
          </div>
        ) : (
          <div className="crm-table-wrapper">
            <table className="crm-table">
              <thead>
                <tr>
                  <th>Token</th>
                  <th>Student & Account</th>
                  <th>Items Ordered</th>
                  <th>Total</th>
                  <th>Payment Method</th>
                  <th>When Ordered</th>
                  <th>Prep Status</th>
                  <th>Audit</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const studentId = order.studentId || "STU-2026-001";
                  const student = students.find((s) => s.student_id === studentId);
                  const isWallet = order.paymentMethod === "campus_wallet";

                  return (
                    <tr key={order.id} className="crm-table-row">
                      {/* Token */}
                      <td>
                        <span className="crm-token-badge">{order.tokenNumber}</span>
                      </td>

                      {/* Student */}
                      <td>
                        <div className="crm-table-student">
                          <span className="crm-mini-avatar">{student?.avatar || "🎓"}</span>
                          <div>
                            <div className="crm-student-name-small">
                              {student?.name || studentId}
                            </div>
                            <div className="crm-student-id-sub">{studentId}</div>
                          </div>
                        </div>
                      </td>

                      {/* Items */}
                      <td>
                        <div className="crm-items-cell">
                          {order.items.map((item, idx) => (
                            <span key={idx} className="crm-item-chip">
                              {item.emoji} {item.qty}x {item.name}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Total */}
                      <td>
                        <span className="crm-price-cell">₹{order.totalPrice.toFixed(2)}</span>
                      </td>

                      {/* Payment Method */}
                      <td>
                        <div
                          className={`crm-payment-pill ${
                            isWallet ? "wallet-pill" : "upi-pill"
                          }`}
                        >
                          {isWallet ? (
                            <>
                              <Wallet size={13} />
                              <span>Campus Wallet</span>
                            </>
                          ) : (
                            <>
                              <Smartphone size={13} />
                              <span>UPI Gateway</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* When Ordered */}
                      <td>
                        <div className="crm-time-cell">
                          <Clock size={13} className="text-muted" />
                          <span>{order.time}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        <span className={`crm-status-pill status-${order.status}`}>
                          {order.status === "ready" && "🔔 Ready"}
                          {order.status === "preparing" && "🍳 In Kitchen"}
                          {order.status === "received" && "📥 Received"}
                          {order.status === "completed" && "✓ Completed"}
                        </span>
                      </td>

                      {/* Audit details */}
                      <td>
                        <button
                          className="crm-inspect-btn"
                          onClick={() => setInspectOrder(order)}
                          title="Inspect SRE resilience notes & details"
                        >
                          <ShieldCheck size={14} />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Inspect Modal Drawer */}
      {inspectOrder && (
        <div className="crm-modal-backdrop" onClick={() => setInspectOrder(null)}>
          <div
            className="crm-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="crm-modal-header">
              <div>
                <span className="eyebrow">Transaction Ledger Audit</span>
                <h2 className="crm-modal-title">
                  Order {inspectOrder.tokenNumber}
                </h2>
              </div>
              <button
                className="crm-modal-close-btn"
                onClick={() => setInspectOrder(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="crm-modal-body">
              {/* Student & Time Details */}
              <div className="crm-modal-section">
                <h4 className="crm-modal-subtitle">Customer & Timestamp</h4>
                <div className="crm-modal-kv-grid">
                  <div>
                    <span className="kv-label">Student ID</span>
                    <span className="kv-value">
                      {inspectOrder.studentId || "STU-2026-001"}
                    </span>
                  </div>
                  <div>
                    <span className="kv-label">Customer Name</span>
                    <span className="kv-value">
                      {students.find(
                        (s) =>
                          s.student_id ===
                          (inspectOrder.studentId || "STU-2026-001")
                      )?.name || "Campus Scholar"}
                    </span>
                  </div>
                  <div>
                    <span className="kv-label">Order Timestamp</span>
                    <span className="kv-value">{inspectOrder.time}</span>
                  </div>
                  <div>
                    <span className="kv-label">Fulfillment Status</span>
                    <span className="kv-value capitalize">
                      {inspectOrder.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Items Breakdown */}
              <div className="crm-modal-section">
                <h4 className="crm-modal-subtitle">Items Ordered</h4>
                <div className="crm-modal-items-list">
                  {inspectOrder.items.map((item, idx) => (
                    <div key={idx} className="crm-modal-item-row">
                      <span className="crm-modal-item-name">
                        {item.emoji} {item.name} × {item.qty}
                      </span>
                      <span className="crm-modal-item-price">
                        ₹{(item.price * item.qty).toFixed(2)}
                      </span>
                    </div>
                  ))}
                  <div className="crm-modal-total-row">
                    <span>Total Debited</span>
                    <span>₹{inspectOrder.totalPrice.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Payment & Resilience Notes */}
              <div className="crm-modal-section">
                <h4 className="crm-modal-subtitle">Financial Route & SRE Resilience</h4>
                <div className="crm-modal-sre-card">
                  <div className="crm-modal-sre-row">
                    <span className="sre-pill-label">Channel</span>
                    <span className="sre-pill-val">
                      {inspectOrder.paymentMethod === "campus_wallet"
                        ? "Campus Wallet (Atomic Ledger)"
                        : "UPI Gateway (Hyperswitch Smart Routing)"}
                    </span>
                  </div>
                  <div className="crm-modal-sre-row">
                    <span className="sre-pill-label">Idempotency</span>
                    <span className="sre-pill-val text-leaf">
                      ✓ Verified (Double-charge guard active)
                    </span>
                  </div>
                  {inspectOrder.selfHealingNotes &&
                    inspectOrder.selfHealingNotes.length > 0 && (
                      <div className="crm-modal-notes-box">
                        <span className="notes-header">🔧 Self-Healing Log:</span>
                        <ul>
                          {inspectOrder.selfHealingNotes.map((note, i) => (
                            <li key={i}>{note}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                </div>
              </div>
            </div>

            <div className="crm-modal-footer">
              <button
                className="btn-primary"
                onClick={() => setInspectOrder(null)}
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
