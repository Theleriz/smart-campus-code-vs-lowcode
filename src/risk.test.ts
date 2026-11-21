import { describe, it, expect } from "vitest";
import { checkAvailability, labelToMinutes } from "./utils";
import type { Booking, Room } from "./types";

// Practice 10 – R1 regression tests: the checker must fail closed on input it cannot trust.
const room: Room = { id: "R2", name: "Study Room 204", building: "Library", capacity: 8, blocked: false };
const NOW = 540; // 09:00
const valid: Booking[] = [{ id: "B1", roomId: "R2", start: 600, end: 660, title: "Sample" }];

describe("Practice 10 – R1 fail-closed validation", () => {
  it("R1-1: a non-numeric current time is rejected, not treated as 'no past check'", () => {
    const r = checkAvailability(room, 700, 760, NaN, valid);
    expect(r.decision).toBe("unavailable");
    expect(r.reasons.join(" ")).toMatch(/valid times/);
  });

  it("R1-2: fractional minutes are rejected (times are whole minutes)", () => {
    expect(checkAvailability(room, 700.5, 760, NOW, valid).decision).toBe("unavailable");
  });

  it("R1-3: a malformed booking of the selected room blocks the check", () => {
    const bad: Booking[] = [{ id: "X", roomId: "R2", start: NaN, end: 700, title: "Broken" }];
    const r = checkAvailability(room, 600, 660, NOW, bad);
    expect(r.decision).toBe("unavailable");
    expect(r.reasons.join(" ")).toMatch(/invalid booking data/);
  });

  it("R1-4: a reversed booking (end before start) blocks the check", () => {
    const bad: Booking[] = [{ id: "X", roomId: "R2", start: 700, end: 600, title: "Reversed" }];
    expect(checkAvailability(room, 620, 650, NOW, bad).decision).toBe("unavailable");
  });

  it("R1-5: a malformed booking of another room does not block this room", () => {
    const other: Booking[] = [{ id: "X", roomId: "R4", start: NaN, end: 700, title: "Broken" }];
    const r = checkAvailability(room, 700, 760, NOW, other);
    expect(r).toEqual({ decision: "available", reasons: [] });
  });

  it("R1-6: labelToMinutes accepts only HH:MM from 00:00 to 23:59", () => {
    expect(labelToMinutes("09:05")).toBe(545);
    expect(labelToMinutes("23:59")).toBe(1439);
    for (const bad of ["10:75", "25:99", "-1:30", "10:30:59", "9", ""]) {
      expect(labelToMinutes(bad)).toBeNaN();
    }
  });
});
