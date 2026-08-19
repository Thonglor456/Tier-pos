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

const STORAGE_KEY = "tier_current_staff";

export function StaffProvider({ children }: { children: React.ReactNode }) {
  const [currentStaff, setCurrentStaffState] = useState<StaffSession | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const setCurrentStaff = (staff: StaffSession | null) => {
    setCurrentStaffState(staff);
    if (staff) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(staff));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

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
