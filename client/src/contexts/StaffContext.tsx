import React, { createContext, useContext, useState } from "react";

export type StaffSession = {
  id: number;
  name: string;
  role: "staff" | "manager" | "admin";
  branchId?: number | null;
};

type StaffContextType = {
  currentStaff: StaffSession | null;
  setCurrentStaff: (staff: StaffSession | null) => void;
  logout: () => void;
};

const StaffContext = createContext<StaffContextType>({
  currentStaff: null,
  setCurrentStaff: () => {},
  logout: () => {},
});

export function StaffProvider({ children }: { children: React.ReactNode }) {
  const [currentStaff, setCurrentStaff] = useState<StaffSession | null>(null);

  const logout = () => setCurrentStaff(null);

  return (
    <StaffContext.Provider value={{ currentStaff, setCurrentStaff, logout }}>
      {children}
    </StaffContext.Provider>
  );
}

export function useStaff() {
  return useContext(StaffContext);
}

