import React, { useState } from "react";
import {
  Globe,
  Server,
  AlertCircle,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";
import type { ExternalServiceInfo, CircuitState } from "../../types";

interface ExternalServicesMonitorProps {
  externalServices: ExternalServiceInfo[];
  circuitState: CircuitState;
  activeChaos: string | null;
  onRefresh?: () => void;
}

export const ExternalServicesMonitor: React.FC<ExternalServicesMonitorProps> = ({
  externalServices,
  circuitState,
  activeChaos,
  onRefresh,
}) => {
  const [isPinging, setIsPinging] = useState(false);

  const handlePingAll = async () => {
    setIsPinging(true);
    if (onRefresh) await onRefresh();
    setTimeout(() => setIsPinging(false), 600);
  };

  // Fallback defaults if backend services list is still initializing
  const services: ExternalServiceInfo[] =
    externalServices.length > 0
      ? externalServices
      : [
          {
            id: "paytm_gateway",
            name: "Paytm UPI Payment Gateway",
            provider: "One97 Communications (Paytm PG)",
            endpoint: "https://securegw.paytm.in/theia/api/v1/process",
            type: "External Third-Party Aggregator",
            status:
              circuitState === "OPEN" || activeChaos === "upi_timeout"
                ? "DOWN"
                : "UP",
            http_code:
              circuitState === "OPEN" || activeChaos === "upi_timeout"
                ? 504
                : 200,
            latency_ms:
              circuitState === "OPEN" || activeChaos === "upi_timeout"
                ? 3420
                : 46,
            packet_loss_pct:
              circuitState === "OPEN" || activeChaos === "upi_timeout"
                ? 100
                : 0,
            last_heartbeat: new Date().toISOString(),
          },
          {
            id: "npci_switch",
            name: "NPCI UPI Core Network Switch",
            provider: "National Payments Corporation of India",
            endpoint: "https://upi.npci.org.in/v2/switch",
            type: "National Clearing Switch",
            status: "UP",
            http_code: 200,
            latency_ms: 18,
            packet_loss_pct: 0,
            last_heartbeat: new Date().toISOString(),
          },
          {
            id: "campus_wallet_switch",
            name: "Campus Core Wallet Ledger",
            provider: "UniCore Institutional Banking",
            endpoint: "internal://ledger.campus.bank/v2/debit",
            type: "Internal Atomic Fallback",
            status: "UP",
            http_code: 200,
            latency_ms: 4,
            packet_loss_pct: 0,
            last_heartbeat: new Date().toISOString(),
          },
        ];

  return (
    <section className="external-services-section">
      <div className="external-services-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Globe size={18} className="text-orange" />
            <h3 className="external-services-title">
              External Third-Party Upstream Services
            </h3>
          </div>
          <p className="external-services-subtitle">
            Live telemetry of third-party payment aggregators, bank gateways, and clearing switches.
          </p>
        </div>
        <button
          className={`btn-secondary ping-all-btn ${isPinging ? "pinging" : ""}`}
          onClick={handlePingAll}
          title="Probe external endpoints"
        >
          <RefreshCw size={14} />
          <span>Probe Gateways</span>
        </button>
      </div>

      <div className="external-services-grid">
        {services.map((svc) => {
          const isDown = svc.status === "DOWN" || svc.http_code >= 500;
          const isPaytm = svc.id === "paytm_gateway" || svc.name.toLowerCase().includes("paytm");

          return (
            <div
              key={svc.id}
              className={`external-service-card ${isDown ? "svc-down" : "svc-up"} ${
                isPaytm ? "paytm-card" : ""
              }`}
            >
              <div className="svc-top-row">
                <div className="svc-icon-box">
                  {isPaytm ? (
                    <span className="paytm-svc-mark">paytm</span>
                  ) : (
                    <Server size={18} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="svc-title-row">
                    <h4 className="svc-name">{svc.name}</h4>
                    <span
                      className={`svc-status-pill ${
                        isDown ? "pill-down" : "pill-up"
                      }`}
                    >
                      {isDown ? <WifiOff size={11} /> : <Wifi size={11} />}
                      <span>{isDown ? `HTTP ${svc.http_code} DOWN` : `HTTP ${svc.http_code} OK`}</span>
                    </span>
                  </div>
                  <p className="svc-provider">{svc.provider}</p>
                </div>
              </div>

              <div className="svc-endpoint-bar">
                <code className="svc-endpoint-text" title={svc.endpoint}>
                  {svc.endpoint}
                </code>
              </div>

              <div className="svc-metrics-row">
                <div className="svc-metric-col">
                  <span className="svc-metric-label">Latency</span>
                  <span
                    className={`svc-metric-val ${
                      svc.latency_ms > 1000 ? "text-red" : "text-ink"
                    }`}
                  >
                    {svc.latency_ms} ms
                  </span>
                </div>
                <div className="svc-metric-col">
                  <span className="svc-metric-label">Packet Loss</span>
                  <span
                    className={`svc-metric-val ${
                      svc.packet_loss_pct > 0 ? "text-red" : "text-leaf"
                    }`}
                  >
                    {svc.packet_loss_pct}%
                  </span>
                </div>
                <div className="svc-metric-col">
                  <span className="svc-metric-label">Role</span>
                  <span className="svc-metric-val role-tag">{svc.type}</span>
                </div>
              </div>

              {isPaytm && isDown && (
                <div className="svc-alert-box">
                  <AlertCircle size={14} />
                  <span>
                    Aggregator timed out! PyBreaker has tripped circuit to OPEN to protect student transactions.
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
