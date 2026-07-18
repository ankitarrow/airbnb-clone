"use client";

import { useEffect, useState } from "react";
import { X, Mail, Lock, UserRound, TriangleAlert } from "lucide-react";
import { useAuth } from "@/lib/auth";

interface Props {
  open: boolean;
  onClose: () => void;
  initialMode?: "login" | "signup";
}

export default function AuthModal({ open: isOpen, onClose: handleClose, initialMode: startMode = "login" }: Props) {
  const { login: signIn, register: signUp } = useAuth();
  const [authMode, setAuthMode] = useState<"login" | "signup">(startMode);
  const [fullName, setFullName] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [passwordValue, setPasswordValue] = useState("");
  const [wantsToHost, setWantsToHost] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAuthMode(startMode);
      const raf = requestAnimationFrame(() => setIsVisible(true));
      return () => cancelAnimationFrame(raf);
    }
    setIsVisible(false);
  }, [isOpen, startMode]);

  if (!isOpen) return null;

  const resetForm = () => {
    setErrorMessage("");
    setFullName("");
    setEmailAddress("");
    setPasswordValue("");
    setWantsToHost(false);
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);
    try {
      if (authMode === "login") {
        await signIn(emailAddress.trim(), passwordValue);
      } else {
        await signUp({ name: fullName.trim(), email: emailAddress.trim(), password: passwordValue, is_host: wantsToHost });
      }
      resetForm();
      handleClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200 ${isVisible ? "opacity-100" : "opacity-0"}`}
        onClick={handleClose}
      />
      <div
        className={`relative w-full max-w-md transition-all duration-200 ${
          isVisible ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-[0.98] opacity-0"
        }`}
      >
        <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-card bg-primary text-white shadow-sm">
            <UserRound className="h-6 w-6" />
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-elevated">
          <div className="h-1.5 w-full bg-gradient-to-r from-primary via-primary/60 to-primary" />

          <div className="p-6 pt-9">
            <div className="mb-5 flex items-start justify-between">
              <div className="mx-auto text-center">
                <h2 className="text-xl font-semibold tracking-tight">{authMode === "login" ? "Welcome back" : "Join us"}</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {authMode === "login" ? "Log in to pick up where you left off." : "Create an account to get started."}
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

          <div className="relative mb-6 flex rounded-full border border-border bg-muted/40 p-1">
            <div
              className={`absolute inset-y-1 w-[calc(50%-4px)] rounded-full bg-foreground shadow-sm transition-transform duration-200 ease-out ${
                authMode === "signup" ? "translate-x-[calc(100%+8px)]" : "translate-x-0"
              }`}
            />
            <button
              type="button"
              onClick={() => { setAuthMode("login"); setErrorMessage(""); }}
              className={`relative z-10 flex-1 rounded-full py-2 text-sm font-medium transition-colors ${
                authMode === "login" ? "text-background" : "text-foreground"
              }`}
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode("signup"); setErrorMessage(""); }}
              className={`relative z-10 flex-1 rounded-full py-2 text-sm font-medium transition-colors ${
                authMode === "signup" ? "text-background" : "text-foreground"
              }`}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={submitForm} className="space-y-3.5">
            {authMode === "signup" && (
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="Full name"
                  className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                />
              </div>
            )}
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                required
                placeholder="Email address"
                className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="password"
                value={passwordValue}
                onChange={(e) => setPasswordValue(e.target.value)}
                required
                minLength={6}
                placeholder="Password"
                className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {authMode === "signup" && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-border px-3.5 py-2.5 text-sm">
                <span>I want to host properties</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={wantsToHost}
                  onClick={() => setWantsToHost((prev) => !prev)}
                  className={`inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 transition-colors duration-200 ${
                    wantsToHost ? "border-primary bg-primary" : "border-border bg-muted"
                  }`}
                >
                  <span
                    className={`block h-5 w-5 rounded-full bg-white shadow-sm ring-1 ring-black/10 transition-transform duration-200 ${
                      wantsToHost ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            )}

            {errorMessage && (
              <div className="flex items-start gap-2 rounded-xl bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {isSubmitting ? "Please wait..." : authMode === "login" ? "Log in" : "Create account"}
            </button>
          </form>
          </div>
        </div>
      </div>
    </div>
  );
}