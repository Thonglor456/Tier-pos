import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface Branch {
  id: number;
  name: string;
}

interface BranchContextValue {
  currentBranch: Branch | null;
  setCurrentBranch: (branch: Branch) => void;
  clearBranch: () => void;
}

export const BranchContext = createContext<BranchContextValue>({
  currentBranch: null,
  setCurrentBranch: () => {},
  clearBranch: () => {},
});

const STORAGE_KEY = "tier_active_branch";

export function BranchProvider({ children }: { children: ReactNode }) {
  const [currentBranch, setCurrentBranchState] = useState<Branch | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const setCurrentBranch = (branch: Branch) => {
    setCurrentBranchState(branch);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(branch));
  };

  const clearBranch = () => {
    setCurrentBranchState(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <BranchContext.Provider value={{ currentBranch, setCurrentBranch, clearBranch }}>
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  return useContext(BranchContext);
}
