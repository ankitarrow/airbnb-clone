"use client";

import Link from "next/link";
import { useEffect } from "react";
import { BadgeCheck, Warehouse, User, Home } from "lucide-react";

type DemoAccount = { email: string; label: string };

type NavUser = {
  name: string;
  is_host?: boolean;
  identity_verified?: boolean;
} | null | undefined;

function DemoAccountGroup({
  title,
  accounts,
  onSelect,
  icon: IconComponent,
  showDivider = false,
}: {
  title: string;
  accounts: DemoAccount[];
  onSelect: (email: string) => void;
  icon: React.ComponentType<{ className?: string }>;
  showDivider?: boolean;
}) {
  return (
    <div className={showDivider ? "mt-4 border-t border-border/40 pt-4" : ""}>
      <p className="px-4 mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      <div className="space-y-0.5">
        {accounts.map((acct) => (
          <button
            key={acct.email}
            type="button"
            onClick={() => onSelect(acct.email)}
            className="w-full rounded-xl px-4 py-3 text-left text-sm font-medium transition flex items-center gap-3 hover:bg-muted text-foreground/90 hover:text-foreground"
          >
            <IconComponent className="h-4.5 w-4.5 text-muted-foreground/80 shrink-0" />
            <span className="flex-1 truncate">{acct.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function MobileMenuPanel({
  isOpen,
  onClose,
  activeUser,
  demoGuests,
  demoHosts,
  onDemoLogin,
  onVerifyIdentity,
  onLogout,
}: {
  isOpen: boolean;
  onClose: () => void;
  activeUser: NavUser;
  demoGuests: DemoAccount[];
  demoHosts: DemoAccount[];
  onDemoLogin: (email: string) => void;
  onVerifyIdentity: () => void;
  onLogout: () => void;
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEscKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]" onClick={onClose} aria-hidden />
      <div className="absolute left-0 right-0 top-[57px] max-h-[min(75vh,560px)] overflow-y-auto border border-border bg-card px-2 py-3.5 shadow-elevated sm:left-auto sm:right-4 sm:top-[65px] sm:w-full sm:max-w-sm sm:rounded-3xl md:right-10">
        <div>
          <DemoAccountGroup
            title="Guest accounts"
            accounts={demoGuests}
            onSelect={onDemoLogin}
            icon={User}
          />
          <DemoAccountGroup
            title="Host accounts"
            accounts={demoHosts}
            onSelect={onDemoLogin}
            icon={Home}
            showDivider
          />
        </div>

        {activeUser && (
          <div className="mt-4 border-t border-border/40 pt-4 px-2 space-y-1 lg:hidden">
            {activeUser.is_host && (
              <Link
                href="/hosts"
                onClick={onClose}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium hover:bg-muted text-foreground/90 hover:text-foreground"
              >
                <Warehouse className="h-4.5 w-4.5 text-muted-foreground/80 shrink-0" />
                <span>Host dashboard</span>
              </Link>
            )}
            {!activeUser.identity_verified && (
              <button
                type="button"
                onClick={() => {
                  onVerifyIdentity();
                  onClose();
                }}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium hover:bg-muted text-foreground/90 hover:text-foreground"
              >
                <BadgeCheck className="h-4.5 w-4.5 text-muted-foreground/80 shrink-0" />
                <span>Verify identity</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="w-full rounded-xl bg-muted/65 hover:bg-muted px-4 py-3 text-sm font-bold text-rose-600 dark:text-rose-400 mt-2 transition"
            >
              Log out ({activeUser.name})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}