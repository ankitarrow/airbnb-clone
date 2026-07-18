"use client";

import { useEffect, useRef, useState } from "react";
import { format, parseISO, isBefore, startOfDay } from "date-fns";
import { DayPicker, type DateRange } from "react-day-picker";
import type { AvailabilityRange } from "@/lib/types";
import { isBlockedStayNight, rangeConflictsWithBookings } from "@/lib/date";
import "react-day-picker/style.css";

interface Props {
  checkIn?: string;
  checkOut?: string;
  blockedRanges?: AvailabilityRange[];
  onChange: (checkIn: string | undefined, checkOut: string | undefined) => void;
  className?: string;
}

function buildDateRange(checkIn?: string, checkOut?: string): DateRange | undefined {
  if (!checkIn) return undefined;
  const from = parseISO(checkIn);
  const to = checkOut ? parseISO(checkOut) : undefined;
  return { from, to };
}

export default function DateRangePopover({
  checkIn,
  checkOut,
  blockedRanges = [],
  onChange,
  className = "",
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [draftRange, setDraftRange] = useState<DateRange | undefined>(() => buildDateRange(checkIn, checkOut));
  const [rangeErrorMessage, setRangeErrorMessage] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setDraftRange(buildDateRange(checkIn, checkOut));
      setRangeErrorMessage(null);
    }
  }, [checkIn, checkOut, isOpen]);

  const todayStart = startOfDay(new Date());

  const handleRangeSelect = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      if (rangeConflictsWithBookings(range.from, range.to, blockedRanges)) {
        setRangeErrorMessage("Some nights in this range are already booked. Pick different dates.");
        setDraftRange({ from: range.from, to: undefined });
        return;
      }
      setRangeErrorMessage(null);
    } else {
      setRangeErrorMessage(null);
    }
    setDraftRange(range);
  };

  const applySelectedDates = () => {
    if (!draftRange?.from || !draftRange?.to) return;
    if (rangeConflictsWithBookings(draftRange.from, draftRange.to, blockedRanges)) {
      setRangeErrorMessage("Some nights in this range are already booked. Pick different dates.");
      return;
    }
    onChange(format(draftRange.from, "yyyy-MM-dd"), format(draftRange.to, "yyyy-MM-dd"));
    setIsOpen(false);
  };

  const clearDraft = () => {
    setDraftRange(undefined);
    setRangeErrorMessage(null);
  };

  const formatDateLabel = (value: string | undefined, fallback: string) =>
    value ? format(parseISO(value), "MMM d, yyyy") : fallback;

  const headerStatusText = rangeErrorMessage
    ? rangeErrorMessage
    : !draftRange?.from
      ? "Select check-in"
      : !draftRange?.to
        ? "Select checkout"
        : `${format(draftRange.from, "MMM d")} – ${format(draftRange.to, "MMM d")}`;

  const renderCalendar = (monthCount: number) => (
    <>
      <p className={`mb-3 text-sm font-medium ${rangeErrorMessage ? "text-rose-600" : ""}`}>
        {headerStatusText}
      </p>
      <DayPicker
        mode="range"
        selected={draftRange}
        onSelect={handleRangeSelect}
        numberOfMonths={monthCount}
        disabled={(day) => isBefore(day, todayStart) || isBlockedStayNight(day, blockedRanges)}
        classNames={{
          root: "rdp-root text-sm",
          months: monthCount > 1 ? "flex flex-col gap-4 sm:flex-row sm:gap-6" : undefined,
          month_caption: "font-semibold mb-2",
          day_button: "h-9 w-9 rounded-full hover:bg-violet-100 dark:hover:bg-violet-900/40",
          selected: "bg-violet-600 text-white rounded-full",
          range_start: "bg-violet-600 text-white rounded-full",
          range_end: "bg-violet-600 text-white rounded-full",
          range_middle: "bg-violet-100 dark:bg-violet-900/30 rounded-full",
          disabled: "text-muted-foreground/40 line-through opacity-40",
          today: "font-bold text-violet-600",
        }}
      />
      <div className="mt-2 flex justify-end gap-2 border-t border-border pt-3">
        <button type="button" onClick={clearDraft} className="rounded-lg px-3 py-1.5 text-sm underline">
          Clear
        </button>
        {monthCount === 1 ? null : (
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="rounded-lg border border-border px-3 py-1.5 text-sm"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={applySelectedDates}
          disabled={!draftRange?.from || !draftRange?.to || !!rangeErrorMessage}
          className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm text-white hover:bg-violet-700 disabled:opacity-40"
        >
          Done
        </button>
      </div>
    </>
  );

  const hasBookedConflict =
    !!checkIn && !!checkOut && rangeConflictsWithBookings(parseISO(checkIn), parseISO(checkOut), blockedRanges);

  return (
    <div ref={popoverRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="grid w-full grid-cols-2 rounded-xl border border-border text-left transition hover:border-violet-300 hover:shadow-sm"
      >
        <div className="border-r border-border px-3 py-2.5">
          <span className="block text-[10px] font-bold uppercase tracking-wide">Check-in</span>
          <span className="text-sm">{formatDateLabel(checkIn, "Add date")}</span>
        </div>
        <div className="px-3 py-2.5">
          <span className="block text-[10px] font-bold uppercase tracking-wide">Checkout</span>
          <span className="text-sm">{formatDateLabel(checkOut, "Add date")}</span>
        </div>
      </button>

      {hasBookedConflict && (
        <p className="mt-2 text-xs text-rose-600">These dates include nights that are already booked.</p>
      )}

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[80] bg-black/40 sm:hidden"
            onClick={() => setIsOpen(false)}
            aria-hidden
          />
          <div
            className="fixed inset-x-0 bottom-0 z-[90] max-h-[85vh] overflow-y-auto rounded-t-3xl border border-border bg-card p-4 shadow-elevated sm:hidden"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted" />
            {renderCalendar(1)}
          </div>
          <div
            className="absolute left-0 right-0 z-50 mt-2 hidden rounded-2xl border border-border bg-card p-4 shadow-elevated sm:left-auto sm:right-0 sm:block sm:min-w-[640px]"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {renderCalendar(2)}
          </div>
        </>
      )}
    </div>
  );
}