import React, { createContext, useContext } from "react";
import { useCanteenState } from "../hooks/useCanteenState";

type CanteenContextType = ReturnType<typeof useCanteenState>;

const CanteenContext = createContext<CanteenContextType | undefined>(undefined);

export const CanteenProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const canteenState = useCanteenState();
  return (
    <CanteenContext.Provider value={canteenState}>
      {children}
    </CanteenContext.Provider>
  );
};

export const useCanteen = () => {
  const context = useContext(CanteenContext);
  if (!context) {
    throw new Error("useCanteen must be used within a CanteenProvider");
  }
  return context;
};
