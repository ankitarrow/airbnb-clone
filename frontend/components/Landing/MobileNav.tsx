"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Building2, CircleUserRound, House, MessageCircle, Plane, Star, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import AuthModal from "@/components/Auth/Auth";

function buildTabClassName(active: boolean) {
  return `flex flex-1 flex-col items-center gap-0.5 py-1 text-[10px] font-medium ${
    active ? "text-rose-600" : "text-muted-foreground"
  }`;
}

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { user, loading: isAuthLoading } = useAuth();
  const [isProfileSheetOpen, setIsProfileSheetOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authFlow, setAuthFlow] = useState<"login" | "signup">("login");

  if (pathname.startsWith("/listing/")) return null;

  const isActiveTab = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  const openAuthFlow = (flow: "login" | "signup") => {
    setAuthFlow(flow);
    setIsAuthModalOpen(true);
  };

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1">
          <Link href="/" className={buildTabClassName(isActiveTab("/"))}>
            <House className={`h-6 w-6 ${isActiveTab("/") ? "fill-rose-600/15" : ""}`} />
            Explore
          </Link>
          <Link href="/wishlists" className={buildTabClassName(isActiveTab("/wishlists"))}>
            <Star className={`h-6 w-6 ${isActiveTab("/wishlists") ? "fill-rose-600/15" : ""}`} />
            Wishlists
          </Link>
          <Link href="/trips" className={buildTabClassName(isActiveTab("/trips"))}>
            <Plane className="h-6 w-6" />
            Trips
          </Link>
          {user ? (
            <Link href="/inbox" className={buildTabClassName(isActiveTab("/inbox"))}>
              <MessageCircle className="h-6 w-6" />
              Inbox
            </Link>
          ) : (
            <button type="button" className={buildTabClassName(false)} onClick={() => openAuthFlow("login")}>
              <MessageCircle className="h-6 w-6" />
              Inbox
            </button>
          )}
          {user?.is_host && (
            <Link href="/hosts" className={buildTabClassName(isActiveTab("/hosts"))}>
              <Building2 className={`h-6 w-6 ${isActiveTab("/hosts") ? "fill-rose-600/15" : ""}`} />
              Hosting
            </Link>
          )}
          {user ? (
            <Link href="/profile" className={buildTabClassName(isActiveTab("/profile"))}>
              <CircleUserRound className={`h-6 w-6 ${isActiveTab("/profile") ? "fill-rose-600/15" : ""}`} />
              Profile
            </Link>
          ) : (
            <button type="button" className={buildTabClassName(isProfileSheetOpen)} onClick={() => setIsProfileSheetOpen(true)}>
              <CircleUserRound className="h-6 w-6" />
              Profile
            </button>
          )}
        </div>
      </nav>

      {isProfileSheetOpen && !user && (
        <div className="fixed inset-0 z-[85] lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsProfileSheetOpen(false)} aria-hidden />
          <div className="absolute inset-x-0 bottom-0 rounded-t-3xl border border-border bg-card p-5 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Profile</h2>
              <button
                type="button"
                onClick={() => setIsProfileSheetOpen(false)}
                className="rounded-full p-2 hover:bg-muted"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {isAuthLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    openAuthFlow("login");
                    setIsProfileSheetOpen(false);
                  }}
                  className="w-full rounded-xl bg-rose-600 py-2.5 text-sm font-semibold text-white hover:bg-rose-700"
                >
                  Log in
                </button>
                <button
                  type="button"
                  onClick={() => {
                    openAuthFlow("signup");
                    setIsProfileSheetOpen(false);
                  }}
                  className="w-full rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-muted"
                >
                  Sign up
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <AuthModal open={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} initialMode={authFlow} />
    </>
  );
}