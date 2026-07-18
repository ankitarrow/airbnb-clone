"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface IdentityVerificationContextType {
  open: boolean;
  openVerification: () => void;
  closeVerification: () => void;
}

const VerificationDialogContext = createContext<IdentityVerificationContextType | null>(null);

export function IdentityVerificationProvider({ children }: { children: ReactNode }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <VerificationDialogContext.Provider
      value={{
        open: isDialogOpen,
        openVerification: () => setIsDialogOpen(true),
        closeVerification: () => setIsDialogOpen(false),
      }}
    >
      {children}
    </VerificationDialogContext.Provider>
  );
}

export function useIdentityVerification() {
  const verificationContextValue = useContext(VerificationDialogContext);
  if (!verificationContextValue) throw new Error("useIdentityVerification must be used within IdentityVerificationProvider");
  return verificationContextValue;
}