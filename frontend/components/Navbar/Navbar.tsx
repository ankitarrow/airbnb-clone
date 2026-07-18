"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useAuth, DEMO_GUESTS, DEMO_HOSTS } from "@/lib/auth";
import { useToast } from "@/lib/Toast";
import { useIdentityVerification } from "@/lib/IdentityVerification";
import AuthModal from "@/components/Auth/Auth";
import AirbnbLogo from "./AirbnbLogo";
import ThemeSwitcher from "./ThemeSwitcher";
import DesktopNavLinks from "./DesktopNavLinks";
import ProfileMenu from "./ProfileMenu";
import MobileMenuPanel from "./MobileMenuPanel";

export default function Navbar() {
  const { user: activeUser, demoLogin: startDemoLogin, logout: signOutUser, loading: authLoading } = useAuth();
  const { showToast: notify } = useToast();
  const { openVerification: launchVerification } = useIdentityVerification();
  const currentPath = usePathname();
  const navigate = useRouter();

  const [navPanelOpen, setNavPanelOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authFlow, setAuthFlow] = useState<"login" | "signup">("login");

  const runDemoLogin = async (emailAddr: string) => {
    try {
      await startDemoLogin(emailAddr);
      notify("Welcome back!", "success");
      if (/^\/inbox\/\d+/.test(currentPath)) {
        navigate.replace("/inbox");
      }
      setNavPanelOpen(false);
    } catch {
      notify("Demo login failed", "error");
    }
  };

  const launchAuthModal = (flow: "login" | "signup") => {
    setAuthFlow(flow);
    setAuthModalOpen(true);
    setNavPanelOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1760px] items-center justify-between px-4 py-3.5 sm:px-6 md:px-10">
          <Link href="/" className="flex items-center">
            <AirbnbLogo />
          </Link>

          <DesktopNavLinks activeUser={activeUser} />

          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeSwitcher />

            <ProfileMenu activeUser={activeUser} authLoading={authLoading} onLaunchAuth={launchAuthModal} />

            <button
              className="rounded-full p-2 hover:bg-muted"
              onClick={() => setNavPanelOpen((v) => !v)}
              aria-label="Menu"
              aria-expanded={navPanelOpen}
            >
              {navPanelOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      <MobileMenuPanel
        isOpen={navPanelOpen}
        onClose={() => setNavPanelOpen(false)}
        activeUser={activeUser}
        demoGuests={DEMO_GUESTS}
        demoHosts={DEMO_HOSTS}
        onDemoLogin={runDemoLogin}
        onVerifyIdentity={launchVerification}
        onLogout={() => {
          signOutUser();
          notify("Logged out", "info");
        }}
      />

      <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} initialMode={authFlow} />
    </>
  );
}