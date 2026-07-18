import { addDays, formatDistanceToNow, isBefore, parseISO, startOfDay } from "date-fns";
import type { AvailabilityRange } from "./types";

/** API datetimes are UTC but often omit the trailing Z. */
export function parseApiDate(iso: string): Date {
  const trimmedIso = iso.trim();
  if (!trimmedIso) return new Date(NaN);
  if (trimmedIso.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(trimmedIso)) {
    return parseISO(trimmedIso);
  }
  return parseISO(`${trimmedIso}Z`);
}

export function formatMessageTimestamp(iso: string): string {
  return parseApiDate(iso).toLocaleString("en-IN", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatRelativeTimestamp(iso: string): string {
  return formatDistanceToNow(parseApiDate(iso), { addSuffix: true });
}

/** True if this calendar night (check-in day) is inside a confirmed booking. */
export function isBlockedStayNight(day: Date, ranges: AvailabilityRange[]) {
  const targetDay = startOfDay(day);
  return ranges.some((bookedRange) => {
    const rangeStart = startOfDay(parseISO(bookedRange.check_in));
    const rangeEnd = startOfDay(parseISO(bookedRange.check_out));
    return !isBefore(targetDay, rangeStart) && isBefore(targetDay, rangeEnd);
  });
}

/** True if any stay night in [checkIn, checkOut) is already booked. */
export function rangeOverlapsBlocked(
  checkIn: string,
  checkOut: string,
  ranges: AvailabilityRange[]
) {
  let currentNight = startOfDay(parseISO(checkIn));
  const lastNight = startOfDay(parseISO(checkOut));
  while (isBefore(currentNight, lastNight)) {
    if (isBlockedStayNight(currentNight, ranges)) return true;
    currentNight = addDays(currentNight, 1);
  }
  return false;
}

/** True if the selected interval conflicts with any confirmed booking. */
export function rangeConflictsWithBookings(
  checkIn: Date,
  checkOut: Date,
  ranges: AvailabilityRange[]
) {
  const requestedCheckIn = startOfDay(checkIn);
  const requestedCheckOut = startOfDay(checkOut);
  return ranges.some((bookedRange) => {
    const rangeStart = startOfDay(parseISO(bookedRange.check_in));
    const rangeEnd = startOfDay(parseISO(bookedRange.check_out));
    return rangeStart < requestedCheckOut && rangeEnd > requestedCheckIn;
  });
}