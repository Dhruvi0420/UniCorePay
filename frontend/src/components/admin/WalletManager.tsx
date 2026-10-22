import { useState } from "react";
import type { WalletTransaction } from "../../types";

interface WalletManagerProps {
  walletBalance: number;
  transactions: WalletTransaction[];
  onTopup: (amount: number, note?: string) => Promise<boolean>;
  onSetBalance: (newBalance: number, note?: string) => Promise<boolean>;
}

export function WalletManager({
  walletBalance,
  transactions,
  onTopup,
  onSetBalance,
}: WalletManagerProps) {
  const [topupAmount, setTopupAmount] = useState("");
  const [topupNote, setTopupNote] = useState("");
  const [exactBalance, setExactBalance] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState("");

  const handleQuickTopup = async (amt: number) => {
    setIsSubmitting(true);
    const ok = await onTopup(amt, `Quick top-up (+₹${amt})`);
    if (ok) {
      setFeedbackMsg(`✅ ₹${amt} added successfully! New Balance: ₹${(walletBalance + amt).toFixed(2)}`);
      setTimeout(() => setFeedbackMsg(""), 3500);
    }
    setIsSubmitting(false);
  };

  const handleCustomTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(topupAmount);
    if (isNaN(amt) || amt <= 0) return;

    setIsSubmitting(true);
    const ok = await onTopup(amt, topupNote.trim() || `Recharge (+₹${amt})`);
    if (ok) {
      setTopupAmount("");
      setTopupNote("");
      setFeedbackMsg(`✅ ₹${amt} added successfully!`);
      setTimeout(() => setFeedbackMsg(""), 3500);
    }
    setIsSubmitting(false);
  };

  const handleSetExactBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    const bal = parseFloat(exactBalance);
    if (isNaN(bal) || bal < 0) return;

    setIsSubmitting(true);
    const ok = await onSetBalance(bal, `Admin set exact balance to ₹${bal}`);
    if (ok) {
      setExactBalance("");
      setFeedbackMsg(`✅ Balance updated directly to ₹${bal.toFixed(2)}!`);
      setTimeout(() => setFeedbackMsg(""), 3500);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="wallet-manager">
      <div className="panel-title-row">
        <div>
          <h3 style={{ margin: 0 }}>Campus Wallet Desk</h3>
          <small style={{ color: "var(--muted)" }}>
            Manage student wallet funds, top-up balances, and view the live transaction ledger.
          </small>
        </div>
        <span className="muted-badge">STU-2026-001</span>
      </div>

      {feedbackMsg && <div className="form-success-banner">{feedbackMsg}</div>}

      {/* Hero Wallet Card */}
      <div className="admin-wallet-banner">
        <div>
          <span className="admin-wallet-tag">CURRENT STUDENT BALANCE</span>
          <h2 className="admin-wallet-balance">₹{walletBalance.toFixed(2)}</h2>
          <small style={{ color: "var(--muted)" }}>
            Student Account: <b>STU-2026-001</b> · Linked with UPI Fallback Circuit
          </small>
        </div>
        <div className="quick-topup-actions">
          <span>Quick Top-up:</span>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "6px" }}>
            {[100, 250, 500, 1000].map((amt) => (
              <button
                type="button"
                key={amt}
                className="quick-pill-btn"
                onClick={() => handleQuickTopup(amt)}
                disabled={isSubmitting}
              >
                +₹{amt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Two Column Forms: Top-up vs Direct Set */}
      <div className="wallet-forms-grid">
        {/* Form 1: Add funds */}
        <form onSubmit={handleCustomTopup} className="admin-subcard">
          <h4 style={{ margin: "0 0 10px", fontSize: "13px" }}>💰 Add Funds (Recharge)</h4>
          <p style={{ margin: "0 0 12px", fontSize: "11px", color: "var(--muted)" }}>
            Adds money on top of current balance.
          </p>

          <div className="form-field">
            <label>Amount to Add (₹) *</label>
            <input
              type="number"
              step="1"
              min="1"
              placeholder="e.g. 350"
              value={topupAmount}
              onChange={(e) => setTopupAmount(e.target.value)}
              required
            />
          </div>

          <div className="form-field" style={{ marginTop: "10px" }}>
            <label>Remark / Note (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Monthly stipend, Cash deposit"
              value={topupNote}
              onChange={(e) => setTopupNote(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="primary-button"
            disabled={isSubmitting || !topupAmount}
            style={{ marginTop: "14px", width: "100%", padding: "9px" }}
          >
            {isSubmitting ? "Processing..." : "+ Recharge Student Wallet"}
          </button>
        </form>

        {/* Form 2: Direct set exact balance */}
        <form onSubmit={handleSetExactBalance} className="admin-subcard">
          <h4 style={{ margin: "0 0 10px", fontSize: "13px" }}>⚙️ Set Exact Balance</h4>
          <p style={{ margin: "0 0 12px", fontSize: "11px", color: "var(--muted)" }}>
            Overrides balance directly (e.g., reset to ₹0 or set ₹2500).
          </p>

          <div className="form-field">
            <label>New Exact Balance (₹) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g. 2500"
              value={exactBalance}
              onChange={(e) => setExactBalance(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="outline-button"
            disabled={isSubmitting || exactBalance === ""}
            style={{ marginTop: "42px", width: "100%", padding: "9px", fontWeight: "700" }}
          >
            {isSubmitting ? "Updating..." : "Update Exact Balance"}
          </button>
        </form>
      </div>

      {/* Transaction History Ledger */}
      <div style={{ marginTop: "28px" }}>
        <h4 style={{ margin: "0 0 12px", fontSize: "14px" }}>Recent Transactions Ledger</h4>

        {transactions.length === 0 ? (
          <div className="empty-panel-box">
            <span style={{ fontSize: "32px" }}>🧾</span>
            <h4>No transactions recorded yet</h4>
            <p>Wallet top-ups and order payment debits will be logged here.</p>
          </div>
        ) : (
          <div className="transactions-table-wrap">
            <table className="transactions-table">
              <thead>
                <tr>
                  <th>TX ID</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Description / Note</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>
                      <code>{tx.id}</code>
                    </td>
                    <td>
                      <span className={`tx-badge ${tx.type}`}>
                        {tx.type === "credit" ? "+ Credit" : "- Debit"}
                      </span>
                    </td>
                    <td className="tx-amount">
                      <b style={{ color: tx.type === "credit" ? "var(--leaf)" : "var(--red)" }}>
                        {tx.type === "credit" ? "+" : "-"}₹{tx.amount.toFixed(2)}
                      </b>
                    </td>
                    <td style={{ color: "var(--ink)", fontSize: "12px" }}>{tx.description}</td>
                    <td style={{ color: "var(--muted)", fontSize: "11px" }}>
                      {new Date(tx.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
