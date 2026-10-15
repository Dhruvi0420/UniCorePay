import { useState } from "react";
import { useAuth } from "../../context/AuthContext";

export function AdminAuthGate() {
  const { loginAsAdmin, switchRole } = useAuth();
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState(false);
  const handleSubmit = (event: React.FormEvent) => { event.preventDefault(); if (!loginAsAdmin(passcode)) { setError(true); setPasscode(""); } };
  return <main className="auth-page"><div className="auth-card"><div className="auth-icon">✦</div><h1>Kitchen desk</h1><p>A calm view of service, orders, and the systems that keep campus lunch moving.</p><form onSubmit={handleSubmit}><label className="auth-label">Access code</label><input className="auth-input" type="password" maxLength={8} value={passcode} onChange={(event) => { setPasscode(event.target.value); setError(false); }} placeholder="••••" autoFocus />{error && <p className="auth-error">That code didn’t match. For this demo, use 1234.</p>}<button type="submit" className="primary-button">Open kitchen desk</button></form><div className="auth-footer"><button onClick={() => switchRole("student")}>Back to ordering</button><button onClick={() => loginAsAdmin("1234")}>Use demo code</button></div></div></main>;
}
