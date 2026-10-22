import { useAuth } from "../../context/AuthContext";
import { useCanteen } from "../../context/CanteenContext";

interface NavbarProps {
  isDark: boolean;
  onToggleTheme: () => void;
}

export function Navbar({ isDark, onToggleTheme }: NavbarProps) {
  const { role, isAdminAuthenticated, switchRole, logoutAdmin } = useAuth();
  const { walletBalance } = useCanteen();

  return (
    <header className="site-header">
      <a className="brand" href="#top" aria-label="UniCorePay home">
        <span className="brand-mark">u</span> unicore
      </a>
      <nav className="header-nav" aria-label="Portal navigation">
        <button
          onClick={() => switchRole("student")}
          className={role === "student" ? "active" : ""}
        >
          Order food
        </button>
        <button
          onClick={() => switchRole("admin")}
          className={role === "admin" ? "active" : ""}
        >
          Kitchen desk {isAdminAuthenticated ? "•" : ""}
        </button>
      </nav>
      <div className="header-actions">
        <span className="wallet-mini" title="Live Campus Wallet Balance">
          💳 ₹{walletBalance.toFixed(2)}
        </span>
        <button
          className="theme-toggle"
          aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
          title={`Switch to ${isDark ? "light" : "dark"} mode`}
          onClick={onToggleTheme}
        >
          {isDark ? "☼" : "☾"}
        </button>
        {role === "admin" && isAdminAuthenticated ? (
          <button onClick={logoutAdmin} className="outline-button">
            Lock desk
          </button>
        ) : null}
      </div>
    </header>
  );
}
