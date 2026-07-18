"use client";

import Link from "next/link";
import { useState } from "react";
import { CircleUserRound } from "lucide-react";

type NavUser = {
  name: string;
} | null | undefined;

export default function ProfileMenu({
  activeUser,
  authLoading,
  onLaunchAuth,
}: {
  activeUser: NavUser;
  authLoading: boolean;
  onLaunchAuth: (flow: "login" | "signup") => void;
}) {
  const [guestPanelOpen, setGuestPanelOpen] = useState(false);

  if (activeUser) {
    return (
      <div className="relative hidden lg:block">
        <Link
          href="/profile"
          className="flex items-center rounded-full border border-border p-1.5 shadow-sm transition hover:shadow-md"
          aria-label="Profile"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {activeUser.name.slice(0, 1).toUpperCase()}
          </div>
        </Link>
      </div>
    );
  }

  return (
    <div className="relative hidden lg:block">
      <button
        onClick={() => setGuestPanelOpen(!guestPanelOpen)}
        className="flex items-center rounded-full border border-border p-1.5 shadow-sm transition hover:shadow-md"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
          <CircleUserRound className="h-4 w-4" />
        </div>
      </button>

      {guestPanelOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-border bg-card p-4 shadow-elevated">
          {authLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <div className="space-y-2">
              <button
                onClick={() => {
                  onLaunchAuth("login");
                  setGuestPanelOpen(false);
                }}
                className="w-full rounded-xl bg-foreground py-2.5 text-sm font-semibold text-background"
              >
                Log in
              </button>
              <button
                onClick={() => {
                  onLaunchAuth("signup");
                  setGuestPanelOpen(false);
                }}
                className="w-full rounded-xl border border-border py-2.5 text-sm font-medium"
              >
                Sign up
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}