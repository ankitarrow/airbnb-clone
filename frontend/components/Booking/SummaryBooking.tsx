"use client";

import { differenceInDays, format, parseISO } from "date-fns";
import DateRangePopover from "@/components/Booking/Calender";
import GuestSelectorPopover from "@/components/Booking/GuestSelect";
import { rangeOverlapsBlocked } from "@/lib/date";
import type { AvailabilityRange } from "@/lib/types";

interface Props {
  pricePerNight: number;
  checkIn?: string;
  checkOut?: string;
  adults: number;
  children: number;
  infants: number;
  maxGuests: number;
  blockedRanges?: AvailabilityRange[];
  onDateChange: (checkIn: string | undefined, checkOut: string | undefined) => void;
  onGuestsChange: (counts: { adults: number; children: number; infants: number }) => void;
  onReserve: () => void;
  loading?: boolean;
  className?: string;
}

const CLEANING_FEE = 500;
const GUEST_SERVICE_FEE_RATE = 0.14;
const OCCUPANCY_TAX_RATE = 0.1;
const WEEKLY_STAY_DISCOUNT_RATE = 0.1;
const MONTHLY_STAY_DISCOUNT_RATE = 0.2;
const WEEKLY_STAY_THRESHOLD = 7;
const MONTHLY_STAY_THRESHOLD = 28;

function getStayDiscountRate(nightCount: number) {
  if (nightCount >= MONTHLY_STAY_THRESHOLD) return MONTHLY_STAY_DISCOUNT_RATE;
  if (nightCount >= WEEKLY_STAY_THRESHOLD) return WEEKLY_STAY_DISCOUNT_RATE;
  return 0;
}

export default function BookingSummary({
  pricePerNight,
  checkIn,
  checkOut,
  adults,
  children,
  infants,
  maxGuests,
  blockedRanges = [],
  onDateChange,
  onGuestsChange,
  onReserve,
  loading,
  className = "",
}: Props) {
  const fmt = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: 0 });

  const nightCount =
    checkIn && checkOut ? differenceInDays(parseISO(checkOut), parseISO(checkIn)) : 0;
  const datesUnavailable =
    !!checkIn && !!checkOut && rangeOverlapsBlocked(checkIn, checkOut, blockedRanges);
  const hasValidStay = nightCount > 0 && !datesUnavailable;

  const nightlySubtotal = hasValidStay ? pricePerNight * nightCount : 0;
  const stayDiscountRate = hasValidStay ? getStayDiscountRate(nightCount) : 0;
  const stayDiscountAmount = nightlySubtotal * stayDiscountRate;
  const discountedSubtotal = nightlySubtotal - stayDiscountAmount;
  const guestServiceFee = hasValidStay ? discountedSubtotal * GUEST_SERVICE_FEE_RATE : 0;
  const occupancyTaxes = hasValidStay ? discountedSubtotal * OCCUPANCY_TAX_RATE : 0;
  const totalDue = hasValidStay
    ? discountedSubtotal + CLEANING_FEE + guestServiceFee + occupancyTaxes
    : 0;

  const lineItemClass = "border-b border-dotted border-muted-foreground/50 pb-0.5";

  return (
    <div className={`rounded-2xl border border-border p-6 shadow-lg ${className}`}>
      <div className="mb-4 flex items-baseline gap-1">
        <span className="text-2xl font-semibold">₹{fmt(pricePerNight)}</span>
        <span className="text-muted-foreground">night</span>
      </div>

      <div className="mb-4">
        <DateRangePopover
          checkIn={checkIn}
          checkOut={checkOut}
          blockedRanges={blockedRanges}
          onChange={onDateChange}
        />
      </div>

      <div className="mb-4">
        <GuestSelectorPopover
          variant="field"
          adults={adults}
          children={children}
          infants={infants}
          minAdults={1}
          maxGuestCapacity={maxGuests}
          onChange={(counts) =>
            onGuestsChange({
              adults: counts.adults ?? 1,
              children: counts.children ?? 0,
              infants: counts.infants ?? 0,
            })
          }
        />
      </div>

      <button
        type="button"
        onClick={onReserve}
        disabled={!checkIn || !checkOut || nightCount <= 0 || datesUnavailable || loading}
        className="w-full rounded-xl bg-primary py-3 font-semibold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {datesUnavailable ? "Dates unavailable" : loading ? "Booking..." : "Reserve"}
      </button>
      <p className="mb-4 mt-3 text-center text-xs text-muted-foreground">You won&apos;t be charged yet</p>

      {hasValidStay && (
        <div className="space-y-3 text-sm">
          <p className="font-semibold">Price details</p>

          <div className="space-y-2">
            <div className="flex justify-between">
              <span className={lineItemClass}>
                ₹{fmt(pricePerNight)} × {nightCount} night{nightCount > 1 ? "s" : ""}
              </span>
              <span>₹{fmt(nightlySubtotal)}</span>
            </div>

            {stayDiscountRate > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span className={lineItemClass}>
                  {stayDiscountRate === MONTHLY_STAY_DISCOUNT_RATE ? "Monthly" : "Weekly"} stay discount
                </span>
                <span>-₹{fmt(stayDiscountAmount)}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span className={lineItemClass}>Cleaning fee</span>
              <span>₹{fmt(CLEANING_FEE)}</span>
            </div>
            <div className="flex justify-between">
              <span className={lineItemClass}>Airbnb service fee</span>
              <span>₹{fmt(guestServiceFee)}</span>
            </div>
            <div className="flex justify-between">
              <span className={lineItemClass}>Occupancy taxes and fees</span>
              <span>₹{fmt(occupancyTaxes)}</span>
            </div>
          </div>

          <hr className="border-border" />

          <div className="flex justify-between font-semibold">
            <span>Total (INR)</span>
            <span>₹{fmt(totalDue)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function bookingSummaryLabel(
  pricePerNight: number,
  checkIn?: string,
  checkOut?: string
) {
  const fmt = (n: number) => n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
  if (checkIn && checkOut) {
    return `${format(parseISO(checkIn), "MMM d")} – ${format(parseISO(checkOut), "MMM d")}`;
  }
  return `₹${fmt(pricePerNight)} night`;
}