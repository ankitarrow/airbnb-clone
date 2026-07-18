"use client";

import { useEffect, useState } from "react";
import { X, AlertTriangle, CalendarDays, IndianRupee } from "lucide-react";
import type { Booking, RefundPreview } from "@/lib/types";
import { api } from "@/lib/apis";

interface Props {
  booking: Booking;
  open: boolean;
  onClose: () => void;
  onCancelled: (updated: Booking) => void;
}

export default function CancelBookingModal({
  booking,
  open: isOpen,
  onClose: handleClose,
  onCancelled: onBookingCancelled,
}: Props) {
  const [refundPreview, setRefundPreview] = useState<RefundPreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoadingPreview(true);
    api
      .getRefundPreview(booking.id)
      .then(setRefundPreview)
      .catch(() => setRefundPreview(null))
      .finally(() => setIsLoadingPreview(false));
  }, [isOpen, booking.id]);

  if (!isOpen) return null;

  const confirmCancellation = async () => {
    setIsCancelling(true);
    try {
      const updated = await api.cancelBooking(booking.id);
      onBookingCancelled(updated);
      handleClose();
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative w-full max-w-md">
        <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1/2">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-card bg-rose-600 text-white shadow-sm">
            <AlertTriangle className="h-6 w-6" />
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-elevated">
          <div className="h-1.5 w-full bg-gradient-to-r from-rose-600 via-rose-400 to-rose-600" />

          <div className="p-6 pt-9">
            <button
              type="button"
              onClick={handleClose}
              className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-5 text-center">
              <h2 className="text-xl font-semibold tracking-tight">Cancel this booking?</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">This can&apos;t be undone once confirmed.</p>
            </div>

            <div className="mb-4 flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background">
                <CalendarDays className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{booking.listing_title}</p>
                <p className="text-xs text-muted-foreground">
                  {booking.check_in} → {booking.check_out}
                </p>
              </div>
            </div>

            {isLoadingPreview ? (
              <div className="mb-4 rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                Calculating refund...
              </div>
            ) : refundPreview ? (
              <div
                className={`mb-4 rounded-xl border p-4 ${
                  refundPreview.late_cancel
                    ? "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40"
                    : "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40"
                }`}
              >
                <div className="flex items-center gap-2">
                  <IndianRupee
                    className={`h-4 w-4 ${refundPreview.late_cancel ? "text-amber-600" : "text-emerald-600"}`}
                  />
                  <p className="text-sm font-semibold">
                    Refund: ₹{refundPreview.refund_amount.toLocaleString("en-IN")}{" "}
                    <span className="font-normal text-muted-foreground">
                      ({refundPreview.refund_percent}%)
                    </span>
                  </p>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {refundPreview.late_cancel
                    ? "Cancellations within 24 hours of check-in receive a 50% refund."
                    : "Full refund — you're cancelling more than 24 hours before check-in."}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Original total: ₹{refundPreview.total_price.toLocaleString("en-IN")}
                </p>
              </div>
            ) : null}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 rounded-xl border border-border py-3 text-sm font-medium transition hover:bg-muted"
              >
                Keep booking
              </button>
              <button
                type="button"
                onClick={confirmCancellation}
                disabled={isCancelling || isLoadingPreview}
                className="flex-1 rounded-xl bg-rose-600 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50"
              >
                {isCancelling ? "Cancelling..." : "Confirm cancel"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}