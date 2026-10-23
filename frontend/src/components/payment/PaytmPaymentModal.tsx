import React, { useState, useEffect } from "react";
import {
  QrCode,
  Smartphone,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  X,
  RefreshCw,
  ArrowRight,
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
  const [countdown, setCountdown] = useState(285); // 4m 45s
  const [recoveryLog, setRecoveryLog] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setStep("qr_scan");
      setCountdown(285);
      setRecoveryLog([]);
    }
  }, [isOpen]);

  // Countdown timer simulation
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

  const handleSimulatePayment = async () => {
    setStep("processing");

    // Check if external UPI service will fail
    const willFail = circuitState === "OPEN" || activeChaos === "upi_timeout";

    // Simulate network delay to external Paytm Gateway API
    await new Promise((r) => setTimeout(r, 1400));

    if (!willFail) {
      // Gateway is healthy -> 200 OK
      const success = await onConfirmOrder("upi");
      if (success) {
        setStep("success");
      } else {
        setStep("qr_scan");
      }
    } else {
      // Gateway Outage -> 504 Timeout -> Trigger Autonomous Self-Healing Fallback
      setStep("fallback_recovery");
      setRecoveryLog([
        "⚠️ HTTP 504: Paytm Upstream Aggregator timed out (100% packet loss)",
        "🔍 PyBreaker FSM detected gateway failure ➔ Circuit Tripped to OPEN",
        "⚡ Hyperswitch Smart Routing engaged: Diverting to Campus Wallet Fallback",
      ]);

      await new Promise((r) => setTimeout(r, 1200));

      setRecoveryLog((prev) => [
        ...prev,
        `💳 Checking Campus Wallet balance (Available: ₹${walletBalance.toFixed(2)})`,
      ]);

      await new Promise((r) => setTimeout(r, 1000));

      const success = await onConfirmOrder("campus_wallet");
      if (success) {
        setRecoveryLog((prev) => [
          ...prev,
          "✓ Compensating Fallback Successful: ₹" + totalAmount.toFixed(2) + " debited from Campus Wallet",
          "🎫 Order Token Generated with ZERO Downtime!",
        ]);
        setStep("success");
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="paytm-modal-backdrop" onClick={onClose}>
      <div className="paytm-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Paytm Header */}
        <div className="paytm-modal-header">
          <div className="paytm-brand-row">
            <div className="paytm-logo-badge">
              <span className="paytm-logo-text">
                pay<span className="paytm-tm">tm</span>
              </span>
              <span className="paytm-tagline">Payments Bank · UPI</span>
            </div>
            <button className="paytm-close-btn" onClick={onClose} title="Cancel">
              <X size={18} />
            </button>
          </div>

          <div className="paytm-merchant-info">
            <div>
              <p className="paytm-merchant-name">UniCore Campus Canteen</p>
              <p className="paytm-merchant-id">Merchant ID: PTM-CANTEEN-9042 · Verified Merchant ✓</p>
            </div>
            <div className="paytm-amount-tag">
              <span className="paytm-rs">₹</span>
              <span className="paytm-val">{totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="paytm-modal-body">
          {step === "qr_scan" && (
            <div className="paytm-qr-view">
              <div className="paytm-qr-box">
                {/* Simulated dynamic SVG QR Code with Paytm icon */}
                <div className="paytm-qr-frame">
                  <QrCode size={140} className="paytm-qr-icon" />
                  <div className="paytm-qr-center-pill">
                    <span>paytm</span>
                  </div>
                </div>
                <div className="paytm-qr-timer">
                  <span>Expiring in: </span>
                  <strong>{formatCountdown(countdown)}</strong>
                </div>
              </div>

              <div className="paytm-scan-hints">
                <p>Scan this dynamic QR using <strong>Paytm, Google Pay, PhonePe,</strong> or any UPI App</p>
                <div className="paytm-upi-apps-row">
                  <span className="upi-app-pill paytm-pill">Paytm</span>
                  <span className="upi-app-pill gpay-pill">GPay</span>
                  <span className="upi-app-pill phonepe-pill">PhonePe</span>
                  <span className="upi-app-pill bhim-pill">BHIM</span>
                </div>
              </div>

              {/* Gateway Status Banner */}
              <div
                className={`paytm-gateway-status-banner ${
                  circuitState === "OPEN" || activeChaos === "upi_timeout"
                    ? "status-banner-alert"
                    : "status-banner-healthy"
                }`}
              >
                <div className="banner-top">
                  <span className="banner-title">
                    External Gateway: <strong>https://securegw.paytm.in</strong>
                  </span>
                  <span className="banner-status-tag">
                    {circuitState === "OPEN" || activeChaos === "upi_timeout" ? "DOWN (504 Timeout)" : "ONLINE (200 OK)"}
                  </span>
                </div>
                <p className="banner-desc">
                  {circuitState === "OPEN" || activeChaos === "upi_timeout"
                    ? "⚠️ Aggregator outage active. UniCorePay will test self-healing smart fallback."
                    : "✓ Primary Paytm UPI switch operational. Typical latency ~42ms."}
                </p>
              </div>

              {/* Primary Action Button */}
              <button
                className="paytm-simulate-pay-btn"
                onClick={handleSimulatePayment}
              >
                <Smartphone size={17} />
                <span>Simulate App Payment (₹{totalAmount.toFixed(2)})</span>
                <ArrowRight size={16} />
              </button>
            </div>
          )}

          {step === "processing" && (
            <div className="paytm-processing-view">
              <div className="paytm-spinner-ring">
                <RefreshCw size={36} className="paytm-spin-icon" />
              </div>
              <h3>Connecting to Paytm UPI Switch...</h3>
              <p>Routing transaction via secure gateway endpoint</p>
              <code className="paytm-endpoint-code">
                POST https://securegw.paytm.in/theia/api/v1/process
              </code>
            </div>
          )}

          {step === "fallback_recovery" && (
            <div className="paytm-fallback-view">
              <div className="paytm-alert-icon-wrap">
                <AlertTriangle size={32} />
              </div>
              <h3 className="paytm-outage-title">External Gateway Outage Intercepted!</h3>
              <p className="paytm-outage-sub">
                Autonomous Self-Healing Engine (Mechanism 1) is rescuing your transaction.
              </p>

              <div className="paytm-recovery-log-box">
                {recoveryLog.map((log, index) => (
                  <div key={index} className="recovery-log-item">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === "success" && (
            <div className="paytm-success-view">
              <div className="paytm-success-circle">
                <CheckCircle2 size={48} />
              </div>
              <h2 className="paytm-success-title">Order Confirmed!</h2>
              <p className="paytm-success-sub">
                {circuitState === "OPEN" || activeChaos === "upi_timeout"
                  ? "Rescued via Campus Wallet Fallback (Zero Downtime!)"
                  : "Paid successfully via Paytm UPI Gateway"}
              </p>

              <div className="paytm-receipt-pill">
                <span>Amount Paid: <strong>₹{totalAmount.toFixed(2)}</strong></span>
                <span>Items: <strong>{items.length} items</strong></span>
              </div>

              <button className="paytm-done-btn" onClick={onClose}>
                Done & View Kitchen Token
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="paytm-modal-footer">
          <div className="paytm-security-badge">
            <ShieldCheck size={14} />
            <span>256-Bit Bank-Grade Encryption · Hyperswitch Idempotency Guard Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};
