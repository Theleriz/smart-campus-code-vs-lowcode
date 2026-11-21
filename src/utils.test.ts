import { describe, it, expect } from "vitest";
import { checkAvailability } from "./utils";
import type { Booking, Room } from "./types";

// ---- Default fixture (fresh per test via helpers) ----
const CURRENT_TIME = 540; // 09:00

function defaultRoom(overrides: Partial<Room> = {}): Room {
  return {
    id: "R2",
    name: "Study Room 204",
    building: "Library",
    capacity: 8,
    blocked: false,
    ...overrides,
  };
}

function defaultBookings(): Booking[] {
  return [
    { id: "B1", roomId: "R2", start: 600, end: 660, title: "Sample" },
  ];
}

function deepClone<T>(v: T): T {
  return structuredClone(v);
}

// Helper: assert bookings array is deep-equal to a snapshot taken before any calls.
// (Review: removed Bolt's `expect(b).not.toBe(snapshot[i])` – snapshot is a structuredClone,
// so those references always differ and the assertion could never fail.)
function expectBookingsUnchanged(bookings: Booking[], snapshot: Booking[]) {
  expect(bookings).toEqual(snapshot);
}

// Helper: run a check, assert decision + reasons + data preservation.
function checkAndAssert(
  room: Room,
  start: number,
  end: number,
  bookings: Booking[],
  expectedDecision: "available" | "unavailable",
  reasonPatterns: RegExp[],
) {
  const snapshot = deepClone(bookings);
  const result = checkAvailability(room, start, end, CURRENT_TIME, bookings);

  expect(result.decision).toBe(expectedDecision);

  if (expectedDecision === "available") {
    expect(result.reasons).toEqual([]);
  } else {
    expect(result.reasons.length).toBe(reasonPatterns.length);
    reasonPatterns.forEach((pat, i) => {
      expect(result.reasons[i]).toMatch(pat);
    });
  }

  expectBookingsUnchanged(bookings, snapshot);
  return result;
}

// =========================================================================
// AC1: Accept only when 0 <= start < end <= 1440 and start > currentTime
// =========================================================================

describe("AC1 – interval validity", () => {
  it("T02: start == currentTime (540–570) -> unavailable", () => {
    const room = defaultRoom();
    const bookings = defaultBookings();
    checkAndAssert(room, 540, 570, bookings, "unavailable", [/after current time/]);
  });

  it("T03: zero duration (720–720) -> unavailable", () => {
    const room = defaultRoom();
    const bookings = defaultBookings();
    checkAndAssert(room, 720, 720, bookings, "unavailable", [/before end time/]);
  });

  it("T04: reversed (750–720) -> unavailable", () => {
    const room = defaultRoom();
    const bookings = defaultBookings();
    checkAndAssert(room, 750, 720, bookings, "unavailable", [/before end time/]);
  });

  it("T05: past day end (1380–1441) -> unavailable", () => {
    const room = defaultRoom();
    const bookings = defaultBookings();
    checkAndAssert(room, 1380, 1441, bookings, "unavailable", [/00:00–24:00/]);
  });

  it("T15: ends exactly at 24:00 (1320–1440) -> available", () => {
    const room = defaultRoom();
    const bookings = defaultBookings();
    checkAndAssert(room, 1320, 1440, bookings, "available", []);
  });
});

// =========================================================================
// AC2: Reject bookings longer than 120 minutes
// =========================================================================

describe("AC2 – max duration", () => {
  it("T06: exactly 120 min (720–840) -> available", () => {
    const room = defaultRoom();
    const bookings = defaultBookings();
    checkAndAssert(room, 720, 840, bookings, "available", []);
  });

  it("T07: 121 min (720–841) -> unavailable", () => {
    const room = defaultRoom();
    const bookings = defaultBookings();
    checkAndAssert(room, 720, 841, bookings, "unavailable", [/exceed 120/]);
  });
});

// =========================================================================
// AC3: Reject when room is blocked
// =========================================================================

describe("AC3 – blocked room", () => {
  it("T13: 660–720 with blocked=true -> unavailable", () => {
    const room = defaultRoom({ blocked: true });
    const bookings = defaultBookings();
    // 660–720 touches after B1 (600–660) so only the blocked reason is expected.
    checkAndAssert(room, 660, 720, bookings, "unavailable", [/blocked/]);
  });
});

// =========================================================================
// AC4: Reject overlapping intervals; touching endpoints allowed
// =========================================================================

describe("AC4 – overlap detection", () => {
  it("T01: touching after (660–720) -> available", () => {
    const room = defaultRoom();
    const bookings = defaultBookings();
    checkAndAssert(room, 660, 720, bookings, "available", []);
  });

  it("T08: touching before (570–600) -> available", () => {
    const room = defaultRoom();
    const bookings = defaultBookings();
    checkAndAssert(room, 570, 600, bookings, "available", []);
  });

  it("T09: partial overlap (630–690) -> unavailable", () => {
    const room = defaultRoom();
    const bookings = defaultBookings();
    checkAndAssert(room, 630, 690, bookings, "unavailable", [/Overlaps/]);
  });

  it("T10: contains booking (570–690) -> unavailable", () => {
    const room = defaultRoom();
    const bookings = defaultBookings();
    checkAndAssert(room, 570, 690, bookings, "unavailable", [/Overlaps/]);
  });

  it("T11: inside booking (615–645) -> unavailable", () => {
    const room = defaultRoom();
    const bookings = defaultBookings();
    checkAndAssert(room, 615, 645, bookings, "unavailable", [/Overlaps/]);
  });

  it("T12: identical interval (600–660) -> unavailable", () => {
    const room = defaultRoom();
    const bookings = defaultBookings();
    checkAndAssert(room, 600, 660, bookings, "unavailable", [/Overlaps/]);
  });

  it("T14: would-be overlap but no bookings (630–690, []) -> available", () => {
    const room = defaultRoom();
    const bookings: Booking[] = [];
    checkAndAssert(room, 630, 690, bookings, "available", []);
  });

  it("T16: overlaps second booking not first (690–750) -> unavailable", () => {
    const room = defaultRoom();
    const bookings: Booking[] = [
      { id: "B1", roomId: "R2", start: 600, end: 660, title: "Sample" },
      { id: "B2", roomId: "R2", start: 720, end: 780, title: "Follow-up" },
    ];
    // 690–750 does not overlap B1 (600–660) but overlaps B2 (720–780).
    checkAndAssert(room, 690, 750, bookings, "unavailable", [/Overlaps/]);
  });

  it("T17: overlap belongs to another room (630–690, R4 booking) -> available", () => {
    const room = defaultRoom();
    const bookings: Booking[] = [
      { id: "BX", roomId: "R4", start: 600, end: 660, title: "Other Room" },
    ];
    // The only booking is in R4, not R2, so it must not block the selected room.
    checkAndAssert(room, 630, 690, bookings, "available", []);
  });
});

// =========================================================================
// AC5: Decision is Available/Unavailable; booking data unchanged
// =========================================================================

describe("AC5 – decision + data preservation", () => {
  it("runs multiple checks (available + unavailable) without mutating bookings", () => {
    const room = defaultRoom();
    const bookings = defaultBookings();
    // Review: freeze the array and every booking, so any write inside checkAvailability
    // (push, splice, b.start = ...) throws a TypeError instead of passing silently.
    Object.freeze(bookings);
    bookings.forEach((b) => Object.freeze(b));
    const snapshot = deepClone(bookings);

    // Available case
    let result = checkAvailability(room, 660, 720, CURRENT_TIME, bookings);
    expect(result.decision).toBe("available");
    expect(result.reasons).toEqual([]);

    // Unavailable case (overlap)
    result = checkAvailability(room, 630, 690, CURRENT_TIME, bookings);
    expect(result.decision).toBe("unavailable");
    expect(result.reasons[0]).toMatch(/Overlaps/);

    // Unavailable case (blocked)
    const blockedRoom = defaultRoom({ blocked: true });
    result = checkAvailability(blockedRoom, 660, 720, CURRENT_TIME, bookings);
    expect(result.decision).toBe("unavailable");
    expect(result.reasons[0]).toMatch(/blocked/);

    // Unavailable case (validation)
    result = checkAvailability(room, 540, 570, CURRENT_TIME, bookings);
    expect(result.decision).toBe("unavailable");
    expect(result.reasons[0]).toMatch(/after current time/);

    // After all calls, bookings must be deep-equal to the original snapshot.
    expectBookingsUnchanged(bookings, snapshot);
  });
});
