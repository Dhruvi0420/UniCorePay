import React, { createContext, useContext, useState } from "react";
import type { UserRole } from "../types";

interface AuthContextType {
  role: UserRole;
  isAdminAuthenticated: boolean;
  loginAsAdmin: (passcode: string) => boolean;
  logoutAdmin: () => void;
  switchRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_PASSCODE = "1234";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<UserRole>("student");
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);

  const loginAsAdmin = (passcode: string): boolean => {
    if (passcode.trim() === ADMIN_PASSCODE) {
      setIsAdminAuthenticated(true);
      setRole("admin");
      return true;
    }
    return false;
  };

  const logoutAdmin = () => {
    setIsAdminAuthenticated(false);
    setRole("student");
  };

  const switchRole = (newRole: UserRole) => {
    if (newRole === "admin" && !isAdminAuthenticated) {
      // User must authenticate first
      setRole("admin");
      return;
    }
    setRole(newRole);
  };

  return (
    <AuthContext.Provider
      value={{
        role,
        isAdminAuthenticated,
        loginAsAdmin,
        logoutAdmin,
        switchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
