"use client";

import { useEffect, useRef, useState } from "react";
import { differenceInDays, format, parseISO } from "date-fns";
import { X, ChevronsRight, Loader2 } from "lucide-react";
import { api } from "@/lib/apis";
import type { Booking, ListingDetail } from "@/lib/types";
import { useToast } from "@/lib/Toast";

type FlowStep = "summary" | "checkout" | "confirmation";

interface Props {
  open: boolean;
  listing: ListingDetail;
  checkIn: string;
  checkOut: string;
  guests: number;
  onClose: () => void;
  onSuccess: () => void;
}

const CLEANING_FEE = 500;
const SERVICE_FEE_RATE = 0.12;
const SLIDE_UNLOCK_THRESHOLD = 0.85;
const THUMB_SIZE = 48;
const TRACK_PADDING = 4;

export default function BookingModal({
  open: isOpen,
  listing: propertyListing,
  checkIn: checkInDate,
  checkOut: checkOutDate,
  guests: guestCount,
  onClose: handleClose,
  onSuccess: notifyBookingSuccess,
}: Props) {
  const { showToast: notify } = useToast();
  const [currentStep, setCurrentStep] = useState<FlowStep>("summary");
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [slideProgress, setSlideProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep("summary");
      setConfirmedBooking(null);
      setSlideProgress(0);
      setIsProcessing(false);
      setIsDragging(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const nightCount = differenceInDays(parseISO(checkOutDate), parseISO(checkInDate));
  const subtotal = propertyListing.price_per_night * nightCount;
  const serviceFee = subtotal * SERVICE_FEE_RATE;
  const totalDue = subtotal + CLEANING_FEE + serviceFee;
  const formatAmount = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: 0 });

  const runPayment = async () => {
    setIsProcessing(true);
    try {
      const result = await api.createBooking({
        listing_id: propertyListing.id,
        check_in: checkInDate,
        check_out: checkOutDate,
        guests_count: guestCount,
      });
      setConfirmedBooking(result);
      setCurrentStep("confirmation");
      notify("Booking confirmed!", "success");
      notifyBookingSuccess();
    } catch (e) {
      notify(e instanceof Error ? e.message : "Booking failed", "error");
      setSlideProgress(0);
    } finally {
      setIsProcessing(false);
    }
  };

  const progressFromPointer = (clientX: number) => {
    if (!trackRef.current) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const usableWidth = rect.width - THUMB_SIZE - TRACK_PADDING * 2;
    const relativeX = clientX - rect.left - TRACK_PADDING - THUMB_SIZE / 2;
    return Math.min(1, Math.max(0, relativeX / usableWidth));
  };

  const handleThumbPointerDown = (e: React.PointerEvent) => {
    if (isProcessing) return;
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleTrackPointerMove = (e: React.PointerEvent) => {
    if (!isDragging || isProcessing) return;
    setSlideProgress(progressFromPointer(e.clientX));
  };

  const handleTrackPointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (slideProgress >= SLIDE_UNLOCK_THRESHOLD) {
      setSlideProgress(1);
      runPayment();
    } else {
      setSlideProgress(0);
    }
  };

  const thumbLeftStyle = {
    left: `calc(${TRACK_PADDING}px + ${slideProgress} * (100% - ${THUMB_SIZE + TRACK_PADDING * 2}px))`,
  };
  const fillWidthStyle = {
    width: `calc(${slideProgress} * (100% - ${THUMB_SIZE + TRACK_PADDING * 2}px) + ${THUMB_SIZE + TRACK_PADDING}px)`,
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold">
            {currentStep === "summary" && "Booking summary"}
            {currentStep === "checkout" && "Checkout"}
            {currentStep === "confirmation" && "You're all set!"}
          </h2>
          <button type="button" onClick={handleClose} className="rounded-full p-2 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5">
          {currentStep === "summary" && (
            <div className="space-y-4">
              <div>
                <p className="font-semibold">{propertyListing.title}</p>
                <p className="text-sm text-muted-foreground">
                  {propertyListing.location_area}, {propertyListing.location_city}
                </p>
              </div>
              <div className="rounded-xl bg-muted/50 p-4 text-sm space-y-2">
                <div className="flex justify-between">
                  <span>Dates</span>
                  <span>
                    {format(parseISO(checkInDate), "MMM d")} – {format(parseISO(checkOutDate), "MMM d, yyyy")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Guests</span>
                  <span>{guestCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Nights</span>
                  <span>{nightCount}</span>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>₹{formatAmount(propertyListing.price_per_night)} × {nightCount} nights</span>
                  <span>₹{formatAmount(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cleaning fee</span>
                  <span>₹{formatAmount(CLEANING_FEE)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Service fee</span>
                  <span>₹{formatAmount(serviceFee)}</span>
                </div>
                <hr className="border-border" />
                <div className="flex justify-between font-semibold text-base">
                  <span>Total</span>
                  <span>₹{formatAmount(totalDue)}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCurrentStep("checkout")}
                className="w-full rounded-xl bg-violet-600 py-3 font-semibold text-white hover:bg-violet-700"
              >
                Continue to payment
              </button>
            </div>
          )}

          {currentStep === "checkout" && (
            <div className="space-y-5">
              <p className="text-sm text-muted-foreground">
                No card needed for this demo — slide to confirm and pay securely.
              </p>

              <div className="flex justify-between rounded-xl bg-muted/50 px-4 py-3 font-semibold">
                <span>Total due</span>
                <span>₹{formatAmount(totalDue)}</span>
              </div>

              <div
                ref={trackRef}
                onPointerMove={handleTrackPointerMove}
                onPointerUp={handleTrackPointerUp}
                onPointerLeave={handleTrackPointerUp}
                className="relative h-14 w-full touch-none select-none overflow-hidden rounded-full bg-violet-100 dark:bg-violet-950"
              >
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-violet-200/80 dark:bg-violet-900"
                  style={{ ...fillWidthStyle, transition: isDragging ? "none" : "width 200ms ease-out" }}
                />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-1 text-sm font-medium text-violet-700 dark:text-violet-300">
                  {isProcessing ? "Processing…" : slideProgress > 0.05 ? "Keep sliding" : "Slide to pay"}
                </div>
                <div
                  onPointerDown={handleThumbPointerDown}
                  style={{ ...thumbLeftStyle, transition: isDragging ? "none" : "left 200ms ease-out" }}
                  className="absolute top-1 flex h-12 w-12 cursor-grab items-center justify-center rounded-full bg-violet-600 text-white shadow-md active:cursor-grabbing"
                >
                  {isProcessing ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <ChevronsRight className="h-5 w-5" />
                  )}
                </div>
              </div>
            </div>
          )}

          {currentStep === "confirmation" && confirmedBooking && (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center">
                <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r="34"
                    fill="none"
                    strokeWidth="4"
                    className="stroke-emerald-100 dark:stroke-emerald-950"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="34"
                    fill="none"
                    strokeWidth="4"
                    strokeLinecap="round"
                    pathLength={100}
                    className="stroke-emerald-500 confirm-ring"
                  />
                </svg>
                <svg viewBox="0 0 80 80" className="absolute h-20 w-20">
                  <path
                    d="M24 41 L35 52 L57 28"
                    fill="none"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    pathLength={100}
                    className="stroke-emerald-500 confirm-tick"
                  />
                </svg>
              </div>
              <p className="text-lg font-semibold">Payment successful</p>
              <p className="text-sm text-muted-foreground">
                Reference <span className="font-mono font-medium text-foreground">#{confirmedBooking.id}</span>
              </p>
              <div className="rounded-xl bg-muted/50 p-4 text-left text-sm space-y-2">
                <div className="flex justify-between">
                  <span>Dates</span>
                  <span>{confirmedBooking.check_in} → {confirmedBooking.check_out}</span>
                </div>
                <div className="flex justify-between">
                  <span>Guests</span>
                  <span>{confirmedBooking.guests_count}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Total paid</span>
                  <span>₹{confirmedBooking.total_price.toLocaleString("en-IN")}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="w-full rounded-xl bg-violet-600 py-3 font-semibold text-white hover:bg-violet-700"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .confirm-ring {
          stroke-dasharray: 100;
          stroke-dashoffset: 100;
          animation: draw-ring 0.5s ease-out forwards;
        }
        .confirm-tick {
          stroke-dasharray: 100;
          stroke-dashoffset: 100;
          animation: draw-tick 0.35s ease-out 0.45s forwards;
        }
        @keyframes draw-ring {
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes draw-tick {
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </div>
  );
}