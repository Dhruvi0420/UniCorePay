import { useEffect, useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { CanteenProvider } from "./context/CanteenContext";
import { Navbar } from "./components/common/Navbar";
import { StudentPortalPage } from "./portals/student/StudentPortalPage";
import { AdminPortalPage } from "./portals/admin/AdminPortalPage";
import { AdminAuthGate } from "./portals/admin/AdminAuthGate";

function MainContent() {
  const { role, isAdminAuthenticated } = useAuth();
  const [isDark, setIsDark] = useState(() => window.localStorage.getItem("unicorepay-theme") === "dark");

  useEffect(() => {
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
    window.localStorage.setItem("unicorepay-theme", isDark ? "dark" : "light");
  }, [isDark]);

  return (
    <div className="app-shell">
      <Navbar isDark={isDark} onToggleTheme={() => setIsDark((current) => !current)} />
      <div key={`${role}-${isAdminAuthenticated}`} className="portal-transition">
        {role === "student" ? <StudentPortalPage /> : !isAdminAuthenticated ? <AdminAuthGate /> : <AdminPortalPage />}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CanteenProvider>
        <MainContent />
      </CanteenProvider>
    </AuthProvider>
  );
}
