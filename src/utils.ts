import type { Booking, Room, CheckResult, ValidationResult } from "./types";

export const MINUTES_PER_DAY = 1440;
export const MAX_DURATION = 120;

export function minutesToLabel(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function labelToMinutes(label: string): number {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(label);
  if (!match) return NaN;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function validateInterval(start: number, end: number, currentTime: number): ValidationResult {
  if (![start, end, currentTime].every(Number.isInteger)) {
    return { ok: false, reason: "Please enter valid times." };
  }
  if (start < 0 || end > MINUTES_PER_DAY) {
    return { ok: false, reason: "Times must be within 00:00–24:00." };
  }
  if (start >= end) {
    return { ok: false, reason: "Start time must be before end time." };
  }
  if (start <= currentTime) {
    return { ok: false, reason: `Start time must be after current time (${minutesToLabel(currentTime)}).` };
  }
  if (end - start > MAX_DURATION) {
    return { ok: false, reason: `Booking cannot exceed ${MAX_DURATION} minutes (2 hours).` };
  }
  return { ok: true, reason: "" };
}

export function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  // Touching endpoints are allowed (== not overlap).
  return aStart < bEnd && bStart < aEnd;
}

export function checkAvailability(
  room: Room | null,
  start: number,
  end: number,
  currentTime: number,
  bookings: Booking[],
): CheckResult {
  if (!room) {
    return { decision: "unavailable", reasons: ["Select a room to check."] };
  }

  const reasons: string[] = [];

  const validation = validateInterval(start, end, currentTime);
  if (!validation.ok) {
    reasons.push(validation.reason);
  }

  if (room.blocked) {
    reasons.push(`Room "${room.name}" is currently blocked and cannot be booked.`);
  }

  const roomBookings = bookings.filter((b) => b.roomId === room.id);
  if (roomBookings.some((b) => !Number.isInteger(b.start) || !Number.isInteger(b.end) || b.start >= b.end)) {
    reasons.push("This room has invalid booking data, so availability cannot be confirmed.");
  }

  const conflicts = roomBookings.filter((b) => overlaps(start, end, b.start, b.end));
  if (conflicts.length > 0) {
    const first = conflicts[0];
    reasons.push(
      `Overlaps with "${first.title}" (${minutesToLabel(first.start)}–${minutesToLabel(first.end)}).`,
    );
  }

  const decision = reasons.length === 0 ? "available" : "unavailable";
  return { decision, reasons };
}
