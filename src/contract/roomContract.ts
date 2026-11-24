/**
 * Lesson 12 (Practice work #12) – shared contract for the code-based and the low-code solution.
 *
 * One fictional room, a start time, a duration, a blocked flag and a fixed list of bookings.
 * Pure functions only: no DOM, no React, no network, no writes. The UI calls `checkRoom` and
 * renders what it returns; the low-code app (lowcode/appsmith/RoomCheck.js) implements the
 * same rules in the same order.
 *
 * The booking rules are the same as in the previous practices (src/utils.ts):
 *   - start must be strictly after "now"            (AC1)
 *   - duration 1..120 minutes                        (AC2)
 *   - the interval must end by 24:00 (one-day model)
 *   - a blocked room is unavailable                  (AC4)
 *   - overlap with an existing booking is unavailable, touching ends are allowed (AC3, T7)
 */
import { MAX_DURATION, MINUTES_PER_DAY, labelToMinutes, minutesToLabel, overlaps } from "../utils";

export interface ContractBooking {
  readonly id: string;
  readonly title: string;
  readonly start: string; // "HH:MM"
  readonly end: string;   // "HH:MM"
}

/** Raw values as they come from the form. Validation happens here, not in the UI. */
export interface RoomCheckInput {
  startTime: string;               // "HH:MM" from <input type="time">
  durationMinutes: string | number; // text from <input type="number">
  blocked: boolean;
  now: string;                     // simulated current time "HH:MM", so tests are repeatable
}

export type ReasonCode =
  | "AVAILABLE"
  | "INVALID_NOW"
  | "INVALID_START"
  | "INVALID_DURATION"
  | "START_IN_PAST"
  | "ENDS_AFTER_MIDNIGHT"
  | "ROOM_BLOCKED"
  | "OVERLAP"
  | "INVALID_BOOKING_DATA";

export type Status = "AVAILABLE" | "UNAVAILABLE" | "INVALID_INPUT";

export interface RoomCheckResult {
  available: boolean;   // contract output 1
  reasonCode: ReasonCode; // contract output 2
  message: string;      // contract output 3 (never echoes raw user input)
  status: Status;       // AVAILABLE | UNAVAILABLE (decision) or INVALID_INPUT (validation error, AC6)
  interval?: { start: string; end: string };
  conflictId?: string;
}

export const VALIDATION_CODES: readonly ReasonCode[] = [
  "INVALID_NOW",
  "INVALID_START",
  "INVALID_DURATION",
  "START_IN_PAST",
  "ENDS_AFTER_MIDNIGHT",
];

/** Duration must be a whole number of minutes written with digits only ("60", not "6e1" or "60.5"). */
export function parseDuration(raw: string | number): number {
  const text = typeof raw === "number" ? String(raw) : raw.trim();
  if (!/^\d{1,4}$/.test(text)) return NaN;
  return Number(text);
}

type ValidationFailure = { code: ReasonCode; message: string };
type ValidInput = { start: number; end: number };

/** Validation only (AC1, AC2, AC6). Returns the parsed interval or the first failure. */
export function validateInput(input: RoomCheckInput): ValidInput | ValidationFailure {
  const now = labelToMinutes(input.now);
  if (Number.isNaN(now)) {
    return { code: "INVALID_NOW", message: "The current time is not set. Please enter it as HH:MM." };
  }
  const start = labelToMinutes(input.startTime);
  if (Number.isNaN(start)) {
    return { code: "INVALID_START", message: "Please enter a start time as HH:MM (for example 12:00)." };
  }
  const duration = parseDuration(input.durationMinutes);
  if (Number.isNaN(duration) || duration <= 0 || duration > MAX_DURATION) {
    return {
      code: "INVALID_DURATION",
      message: `Duration must be a whole number of minutes from 1 to ${MAX_DURATION}.`,
    };
  }
  if (start <= now) {
    return {
      code: "START_IN_PAST",
      message: `Start time must be in the future (after ${minutesToLabel(now)}).`,
    };
  }
  const end = start + duration;
  if (end > MINUTES_PER_DAY) {
    return { code: "ENDS_AFTER_MIDNIGHT", message: "The booking must end by 24:00 on the same day." };
  }
  return { start, end };
}

/**
 * Availability decision (AC3, AC4, AC5). Reads `bookings` and never writes to it.
 * Order: validation -> blocked -> booking data -> overlap -> available.
 */
export function checkRoom(input: RoomCheckInput, bookings: readonly ContractBooking[]): RoomCheckResult {
  const valid = validateInput(input);
  if ("code" in valid) {
    return { available: false, reasonCode: valid.code, message: valid.message, status: "INVALID_INPUT" };
  }
  const interval = { start: minutesToLabel(valid.start), end: minutesToLabel(valid.end) };

  if (input.blocked) {
    return {
      available: false,
      reasonCode: "ROOM_BLOCKED",
      message: "The room is blocked (for example maintenance), so it cannot be booked at any time.",
      status: "UNAVAILABLE",
      interval,
    };
  }

  const parsed = bookings.map((b) => ({ ...b, s: labelToMinutes(b.start), e: labelToMinutes(b.end) }));
  if (parsed.some((b) => Number.isNaN(b.s) || Number.isNaN(b.e) || b.s >= b.e)) {
    return {
      available: false,
      reasonCode: "INVALID_BOOKING_DATA",
      message: "The booking list is invalid, so availability cannot be confirmed.",
      status: "UNAVAILABLE",
      interval,
    };
  }

  const conflict = parsed.find((b) => overlaps(valid.start, valid.end, b.s, b.e));
  if (conflict) {
    return {
      available: false,
      reasonCode: "OVERLAP",
      message: `Overlaps with "${conflict.title}" (${conflict.start}–${conflict.end}).`,
      status: "UNAVAILABLE",
      interval,
      conflictId: conflict.id,
    };
  }

  return {
    available: true,
    reasonCode: "AVAILABLE",
    message: `The room is free from ${interval.start} to ${interval.end}.`,
    status: "AVAILABLE",
    interval,
  };
}

/** Small stable fingerprint of the booking list, shown in the UI as evidence for T8. */
export function bookingsFingerprint(bookings: readonly ContractBooking[]): string {
  const text = JSON.stringify(bookings);
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0;
  return `${bookings.length} bookings · #${h.toString(16).padStart(8, "0")}`;
}
