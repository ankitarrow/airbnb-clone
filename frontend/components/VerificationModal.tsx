"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ShieldCheck, Upload, X } from "lucide-react";
import { api } from "@/lib/apis";
import { useAuth } from "@/lib/auth";
import { useIdentityVerification } from "@/lib/IdentityVerification";
import { useToast } from "@/lib/Toast";

export default function IdentityVerificationModal() {
  const { open: isOpen, closeVerification: closeVerificationModal } = useIdentityVerification();
  const { user, refreshSession } = useAuth();
  const { showToast: notify } = useToast();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [idDocumentUrl, setIdDocumentUrl] = useState<string | null>(null);
  const [selfieFileUrl, setSelfieFileUrl] = useState<string | null>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [isUploadingSelfie, setIsUploadingSelfie] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const raf = requestAnimationFrame(() => setIsVisible(true));
      return () => cancelAnimationFrame(raf);
    }
    setIsVisible(false);
  }, [isOpen]);

  if (!isOpen || !user) return null;

  const resetFlow = () => {
    setCurrentStep(1);
    setIdDocumentUrl(null);
    setSelfieFileUrl(null);
    setIsUploadingDoc(false);
    setIsUploadingSelfie(false);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetFlow();
    closeVerificationModal();
  };

  const submitVerification = async () => {
    setIsSubmitting(true);
    try {
      await new Promise((r) => setTimeout(r, 1200));
      await api.verifyIdentity();
      await refreshSession();
      setCurrentStep(3);
      notify("Identity verified successfully", "success");
    } catch {
      notify("Verification failed. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setUrl: (url: string | null) => void,
    setLoading: (loading: boolean) => void
  ) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setLoading(true);
    try {
      const res = await api.uploadImage(file);
      if (res.url) {
        setUrl(res.url);
        notify("File uploaded to Cloudinary successfully", "success");
      }
    } catch (err) {
      notify("Failed to upload file to Cloudinary", "error");
    } finally {
      setLoading(false);
    }
  };

  const isVerified = user.identity_verified || currentStep === 3;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div
        className={`relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-elevated transition-all duration-200 ${
          isVisible ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-[0.98] opacity-0"
        }`}
      >
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-full p-1 hover:bg-muted"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-600/10">
            <ShieldCheck className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Identity verification</h2>
            <p className="text-sm text-muted-foreground">Required before booking (mock flow)</p>
          </div>
        </div>

        {!isVerified && (
          <div className="mb-5 flex items-center gap-2">
            {[1, 2].map((stepNumber) => (
              <div key={stepNumber} className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full bg-emerald-600 transition-all duration-500 ease-out ${
                    currentStep >= stepNumber ? "w-full" : "w-0"
                  }`}
                />
              </div>
            ))}
          </div>
        )}

        {isVerified ? (
          <div key="done" className="verification-step py-6 text-center">
            <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
            <p className="mt-4 text-lg font-semibold">You&apos;re verified</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Your identity has been confirmed. You can now book stays.
            </p>
            <button
              type="button"
              onClick={handleClose}
              className="mt-6 w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Done
            </button>
          </div>
        ) : currentStep === 1 ? (
          <div key="step-1" className="verification-step space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload a government ID (passport, Aadhaar, or driver&apos;s licence).
            </p>
            {idDocumentUrl ? (
              <div className="relative overflow-hidden rounded-xl border border-border bg-muted p-2 text-center">
                <img src={idDocumentUrl} alt="ID Document Preview" className="h-40 w-full object-cover rounded-lg" />
                <button
                  type="button"
                  onClick={() => setIdDocumentUrl(null)}
                  className="absolute right-4 top-4 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80 shadow-md"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-10 text-sm font-medium transition hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30">
                {isUploadingDoc ? (
                  <span className="animate-pulse text-muted-foreground">Uploading ID...</span>
                ) : (
                  <>
                    <Upload className="h-5 w-5 text-emerald-600" />
                    <span>Upload ID document</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, setIdDocumentUrl, setIsUploadingDoc)}
                  disabled={isUploadingDoc}
                />
              </label>
            )}
            <button
              type="button"
              disabled={!idDocumentUrl || isUploadingDoc}
              onClick={() => setCurrentStep(2)}
              className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-40 disabled:hover:bg-emerald-600"
            >
              Continue
            </button>
          </div>
        ) : (
          <div key="step-2" className="verification-step space-y-4">
            <p className="text-sm text-muted-foreground">
              Take a selfie to match your ID.
            </p>
            {selfieFileUrl ? (
              <div className="relative overflow-hidden rounded-xl border border-border bg-muted p-2 text-center">
                <img src={selfieFileUrl} alt="Selfie Preview" className="h-40 w-full object-cover rounded-lg" />
                <button
                  type="button"
                  onClick={() => setSelfieFileUrl(null)}
                  className="absolute right-4 top-4 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80 shadow-md"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-10 text-sm font-medium transition hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30">
                {isUploadingSelfie ? (
                  <span className="animate-pulse text-muted-foreground">Uploading Selfie...</span>
                ) : (
                  <>
                    <Upload className="h-5 w-5 text-emerald-600" />
                    <span>Upload selfie</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, setSelfieFileUrl, setIsUploadingSelfie)}
                  disabled={isUploadingSelfie}
                />
              </label>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="flex-1 rounded-xl border border-border py-3 text-sm font-medium hover:bg-muted"
              >
                Back
              </button>
              <button
                type="button"
                disabled={!selfieFileUrl || isSubmitting || isUploadingSelfie}
                onClick={submitVerification}
                className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-40 disabled:hover:bg-emerald-600"
              >
                {isSubmitting ? "Verifying..." : "Submit for review"}
              </button>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .verification-step {
          animation: step-fade-in 220ms ease-out;
        }
        @keyframes step-fade-in {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}