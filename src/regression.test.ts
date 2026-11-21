import { describe, it, expect } from "vitest";
import { checkAvailability, overlaps } from "./utils";
import type { Booking, Room } from "./types";

// Practice #08 regression tests for BUG-A and BUG-B.
// Taken from the no-skill answer (R1, R2) after review; the AC5 freeze test already covers B's frozen-array idea.
const CURRENT_TIME = 540; // 09:00

function defaultRoom(): Room {
  return { id: "R2", name: "Study Room 204", building: "Library", capacity: 8, blocked: false };
}

function defaultBookings(): Booking[] {
  return [{ id: "B1", roomId: "R2", start: 600, end: 660, title: "Sample" }];
}

describe("Practice 08 regression", () => {
  it("R1 (BUG-A): touching endpoints are free, one minute inside overlaps", () => {
    expect(overlaps(660, 720, 600, 660)).toBe(false);
    expect(overlaps(570, 600, 600, 660)).toBe(false);
    expect(overlaps(659, 720, 600, 660)).toBe(true);
    expect(overlaps(570, 601, 600, 660)).toBe(true);
  });

  it("R2 (BUG-B): the same check twice gives the same answer and leaves bookings unchanged", () => {
    const room = defaultRoom();
    const bookings = defaultBookings();
    const snapshot = structuredClone(bookings);

    const first = checkAvailability(room, 720, 780, CURRENT_TIME, bookings);
    const second = checkAvailability(room, 720, 780, CURRENT_TIME, bookings);

    expect(first).toEqual({ decision: "available", reasons: [] });
    expect(second).toEqual(first);
    expect(bookings).toEqual(snapshot);
  });
});
