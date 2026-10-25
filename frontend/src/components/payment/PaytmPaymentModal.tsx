import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  QrCode,
  Smartphone,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  X,
  ArrowRight,
  Clock,
  IndianRupee,
  Receipt,
  CreditCard,
  Wallet,
} from "lucide-react";
import type { CircuitState, OrderItem } from "../../types";

interface PaytmPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: OrderItem[];
  totalAmount: number;
  circuitState: CircuitState;
  activeChaos: string | null;
  walletBalance: number;
  onConfirmOrder: (paymentMethod: "upi" | "campus_wallet") => Promise<boolean>;
}

// Snapshot to preserve order data after cart clears
interface OrderSnapshot {
  items: { name: string; qty: number; price: number; emoji: string }[];
  totalAmount: number;
  paymentMethod: "upi" | "campus_wallet";
  txnId: string;
  timestamp: string;
}

export const PaytmPaymentModal: React.FC<PaytmPaymentModalProps> = ({
  isOpen,
  onClose,
  items,
  totalAmount,
  circuitState,
  activeChaos,
  walletBalance,
  onConfirmOrder,
}) => {
  const [step, setStep] = useState<"qr_scan" | "processing" | "success" | "fallback_recovery">("qr_scan");
  const [countdown, setCountdown] = useState(285);
  const [recoveryLog, setRecoveryLog] = useState<string[]>([]);

  // Snapshot of order at time of payment — immune to cart clearing
  const orderSnapshot = useRef<OrderSnapshot | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep("qr_scan");
      setCountdown(285);
      setRecoveryLog([]);
      orderSnapshot.current = null;
    }
  }, [isOpen]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen || step !== "qr_scan") return;
    const interval = setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, step]);

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const generateTxnId = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let id = "PTM";
    for (let i = 0; i < 12; i++) id += chars[Math.floor(Math.random() * chars.length)];
    return id;
  };

  const handleSimulatePayment = async () => {
    // Snapshot current order state BEFORE payment (cart will clear after success)
    orderSnapshot.current = {
      items: items.map((i) => ({ name: i.name, qty: i.qty, price: i.price, emoji: i.emoji })),
      totalAmount,
      paymentMethod: "upi",
      txnId: generateTxnId(),
      timestamp: new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }),
    };

    setStep("processing");

    const willFail = circuitState === "OPEN" || activeChaos === "upi_timeout";

    await new Promise((r) => setTimeout(r, 1400));

    if (!willFail) {
      const success = await onConfirmOrder("upi");
      if (success) {
        setStep("success");
      } else {
        setStep("qr_scan");
      }
    } else {
      // Gateway outage → self-healing fallback
      setStep("fallback_recovery");
      orderSnapshot.current!.paymentMethod = "campus_wallet";

      setRecoveryLog([
        "⚠️ HTTP 504: Paytm Upstream Aggregator timed out",
        "🔍 Circuit Breaker tripped → OPEN state",
        "⚡ Smart Routing → Campus Wallet Fallback",
      ]);

      await new Promise((r) => setTimeout(r, 1200));

      setRecoveryLog((prev) => [
        ...prev,
        `💳 Campus Wallet balance: ₹${walletBalance.toFixed(2)}`,
      ]);

      await new Promise((r) => setTimeout(r, 1000));

      const success = await onConfirmOrder("campus_wallet");
      if (success) {
        setRecoveryLog((prev) => [
          ...prev,
          `✅ ₹${orderSnapshot.current!.totalAmount.toFixed(2)} debited from Campus Wallet`,
          "🎫 Order Token generated — Zero Downtime!",
        ]);
        setStep("success");
      }
    }
  };

  if (!isOpen) return null;

  // Use snapshot for success screen, live props for others
  const snap = orderSnapshot.current;
  const displayAmount = step === "success" && snap ? snap.totalAmount : totalAmount;
  const displayItems = step === "success" && snap ? snap.items : items;
  const wasFallback = snap?.paymentMethod === "campus_wallet";

  return createPortal(
    <div className="ptm-backdrop" onClick={onClose}>
      <div className="ptm-card" onClick={(e) => e.stopPropagation()}>
        {/* ── Header ── */}
        <div className="ptm-header">
          <div className="ptm-header-top">
            <div className="ptm-brand">
              <span className="ptm-logo">
                pay<span className="ptm-logo-accent">tm</span>
              </span>
              <span className="ptm-divider">|</span>
              <span className="ptm-sub">Payments Bank · UPI</span>
            </div>
            <button className="ptm-x" onClick={onClose} aria-label="Close">
              <X size={16} strokeWidth={2.5} />
            </button>
          </div>

          <div className="ptm-merchant-row">
            <div className="ptm-merchant-info">
              <p className="ptm-merchant-name">UniCore Campus Canteen</p>
              <p className="ptm-merchant-id">
                <ShieldCheck size={11} /> Verified Merchant · PTM-9042
              </p>
            </div>
            <div className="ptm-amount-display">
              <span className="ptm-rs">₹</span>
              <span className="ptm-amount-val">{displayAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="ptm-body">
          {/* ─── QR SCAN STEP ─── */}
          {step === "qr_scan" && (
            <div className="ptm-qr-step">
              {/* Order Summary */}
              {items.length > 0 && (
                <div className="ptm-order-summary">
                  <div className="ptm-summary-label">
                    <Receipt size={13} />
                    <span>Order Summary</span>
                  </div>
                  <div className="ptm-items-list">
                    {items.map((item, i) => (
                      <div key={i} className="ptm-item-row">
                        <span className="ptm-item-emoji">{item.emoji}</span>
                        <span className="ptm-item-name">{item.name}</span>
                        <span className="ptm-item-qty">×{item.qty}</span>
                        <span className="ptm-item-price">₹{(item.price * item.qty).toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="ptm-summary-total">
                    <span>Total</span>
                    <span>₹{totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {/* QR Code */}
              <div className="ptm-qr-container">
                <div className="ptm-qr-frame">
                  <div className="ptm-qr-corners">
                    <div className="ptm-corner ptm-corner-tl"></div>
                    <div className="ptm-corner ptm-corner-tr"></div>
                    <div className="ptm-corner ptm-corner-bl"></div>
                    <div className="ptm-corner ptm-corner-br"></div>
                  </div>
                  <QrCode size={120} className="ptm-qr-icon" strokeWidth={1} />
                  <div className="ptm-qr-brand-pill">paytm</div>
                </div>
                <div className="ptm-qr-timer">
                  <Clock size={12} />
                  <span>Expires in </span>
                  <strong>{formatCountdown(countdown)}</strong>
                </div>
              </div>

              <p className="ptm-scan-label">
                Scan with <strong>Paytm, Google Pay, PhonePe</strong> or any UPI app
              </p>

              {/* UPI App Pills */}
              <div className="ptm-upi-pills">
                <span className="ptm-pill ptm-pill-paytm">Paytm</span>
                <span className="ptm-pill ptm-pill-gpay">GPay</span>
                <span className="ptm-pill ptm-pill-phonepe">PhonePe</span>
                <span className="ptm-pill ptm-pill-bhim">BHIM</span>
              </div>

              {/* Gateway Status */}
              <div
                className={`ptm-gateway-bar ${
                  circuitState === "OPEN" || activeChaos === "upi_timeout"
                    ? "ptm-gateway-down"
                    : "ptm-gateway-ok"
                }`}
              >
                <div className="ptm-gateway-dot"></div>
                <span className="ptm-gateway-label">
                  {circuitState === "OPEN" || activeChaos === "upi_timeout"
                    ? "Gateway Offline · 504 Timeout"
                    : "Gateway Online · ~42ms"}
                </span>
              </div>

              {/* Pay Button */}
              <button className="ptm-pay-btn" onClick={handleSimulatePayment}>
                <Smartphone size={16} />
                <span>Pay ₹{totalAmount.toFixed(2)}</span>
                <ArrowRight size={15} />
              </button>
            </div>
          )}

          {/* ─── PROCESSING STEP ─── */}
          {step === "processing" && (
            <div className="ptm-processing-step">
              <div className="ptm-spinner-wrap">
                <div className="ptm-spinner-ring"></div>
                <IndianRupee size={24} className="ptm-spinner-icon" />
              </div>
              <h3 className="ptm-proc-title">Processing Payment</h3>
              <p className="ptm-proc-sub">Connecting to Paytm UPI switch...</p>
              <div className="ptm-proc-endpoint">
                POST securegw.paytm.in/theia/api/v1/process
              </div>
            </div>
          )}

          {/* ─── FALLBACK RECOVERY STEP ─── */}
          {step === "fallback_recovery" && (
            <div className="ptm-fallback-step">
              <div className="ptm-alert-badge">
                <AlertTriangle size={24} />
              </div>
              <h3 className="ptm-fallback-title">Gateway Outage Detected</h3>
              <p className="ptm-fallback-sub">
                Self-healing engine rescuing your transaction...
              </p>
              <div className="ptm-recovery-log">
                {recoveryLog.map((log, index) => (
                  <div key={index} className="ptm-log-line" style={{ animationDelay: `${index * 0.15}s` }}>
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── SUCCESS STEP ─── */}
          {step === "success" && (
            <div className="ptm-success-step">
              <div className="ptm-success-badge">
                <div className="ptm-success-ring">
                  <CheckCircle2 size={44} strokeWidth={1.8} />
                </div>
              </div>

              <h2 className="ptm-success-title">Payment Successful!</h2>
              <p className="ptm-success-sub">
                {wasFallback ? (
                  <>
                    <Wallet size={14} />
                    <span>Paid via Campus Wallet (Auto Fallback)</span>
                  </>
                ) : (
                  <>
                    <CreditCard size={14} />
                    <span>Paid via Paytm UPI</span>
                  </>
                )}
              </p>

              {/* Receipt Card */}
              <div className="ptm-receipt-card">
                <div className="ptm-receipt-header">
                  <Receipt size={14} />
                  <span>Transaction Receipt</span>
                </div>

                <div className="ptm-receipt-rows">
                  {displayItems.map((item, i) => (
                    <div key={i} className="ptm-receipt-item">
                      <span>
                        {item.emoji} {item.name} ×{item.qty}
                      </span>
                      <span>₹{(item.price * item.qty).toFixed(0)}</span>
                    </div>
                  ))}
                </div>

                <div className="ptm-receipt-divider"></div>

                <div className="ptm-receipt-total-row">
                  <span>Amount Paid</span>
                  <span className="ptm-receipt-total-val">₹{displayAmount.toFixed(2)}</span>
                </div>

                <div className="ptm-receipt-meta">
                  {snap && (
                    <>
                      <div className="ptm-meta-row">
                        <span>Txn ID</span>
                        <span>{snap.txnId}</span>
                      </div>
                      <div className="ptm-meta-row">
                        <span>Time</span>
                        <span>{snap.timestamp}</span>
                      </div>
                      <div className="ptm-meta-row">
                        <span>Method</span>
                        <span>{wasFallback ? "Campus Wallet" : "UPI"}</span>
                      </div>
                      <div className="ptm-meta-row">
                        <span>Items</span>
                        <span>{displayItems.reduce((s, i) => s + i.qty, 0)} item(s)</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <button className="ptm-done-btn" onClick={onClose}>
                Done & View Kitchen Token
              </button>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="ptm-footer">
          <ShieldCheck size={12} />
          <span>256-Bit Encryption · PCI DSS Compliant</span>
        </div>
      </div>
    </div>,
    document.body
  );
};
