import { describe, expect, it } from "vitest";
import { ACCEPTANCE_CASES, CONTRACT_BOOKINGS, DEFAULT_NOW } from "./data";
import { bookingsFingerprint, checkRoom, parseDuration, type ContractBooking } from "./roomContract";

const base = { startTime: "12:00", durationMinutes: "60", blocked: false, now: DEFAULT_NOW };

describe("Lesson 12 acceptance tests T1–T8 (code-based)", () => {
  for (const c of ACCEPTANCE_CASES) {
    it(`${c.id}: ${c.title} -> ${c.expectStatus} / ${c.expectCode}`, () => {
      const r = checkRoom(c.input, CONTRACT_BOOKINGS);
      expect(r.status).toBe(c.expectStatus);
      expect(r.reasonCode).toBe(c.expectCode);
      expect(r.available).toBe(c.expectStatus === "AVAILABLE");
      expect(r.message.length).toBeGreaterThan(10);
    });
  }

  it("T8: booking data is unchanged after running T1–T7", () => {
    const before = JSON.stringify(CONTRACT_BOOKINGS);
    const fp = bookingsFingerprint(CONTRACT_BOOKINGS);
    for (const c of ACCEPTANCE_CASES) checkRoom(c.input, CONTRACT_BOOKINGS);
    expect(JSON.stringify(CONTRACT_BOOKINGS)).toBe(before);
    expect(bookingsFingerprint(CONTRACT_BOOKINGS)).toBe(fp);
    expect(Object.isFrozen(CONTRACT_BOOKINGS)).toBe(true);
  });
});

describe("messages and reasons (AC5, AC6)", () => {
  it("T2 names the conflicting booking", () => {
    const r = checkRoom({ ...base, startTime: "11:00" }, CONTRACT_BOOKINGS);
    expect(r.conflictId).toBe("B2");
    expect(r.message).toContain("Thesis Defense");
  });
  it("T6 explains the current time", () => {
    expect(checkRoom({ ...base, startTime: "09:00" }, CONTRACT_BOOKINGS).message).toContain("09:30");
  });
  it("start equal to now is not in the future", () => {
    expect(checkRoom({ ...base, startTime: "09:30" }, CONTRACT_BOOKINGS).reasonCode).toBe("START_IN_PAST");
  });
  it("blocked check comes after validation: blocked + invalid duration is a validation error", () => {
    const r = checkRoom({ ...base, blocked: true, durationMinutes: "0" }, CONTRACT_BOOKINGS);
    expect(r.status).toBe("INVALID_INPUT");
  });
});

describe("boundaries", () => {
  it.each([
    ["1", "AVAILABLE"],
    ["120", "AVAILABLE"],
    ["-5", "INVALID_DURATION"],
    ["60.5", "INVALID_DURATION"],
    ["6e1", "INVALID_DURATION"],
    ["", "INVALID_DURATION"],
  ])("duration %s -> %s", (d, code) => {
    // 12:00 + up to 120 min ends at 14:00, before the 15:00 Workshop.
    expect(checkRoom({ ...base, durationMinutes: d }, CONTRACT_BOOKINGS).reasonCode).toBe(code);
  });
  it("adjacent before a booking (14:00 + 60 ends at 15:00) is available", () => {
    expect(checkRoom({ ...base, startTime: "14:00" }, CONTRACT_BOOKINGS).available).toBe(true);
  });
  it("one minute of overlap is unavailable", () => {
    expect(checkRoom({ ...base, startTime: "14:01" }, CONTRACT_BOOKINGS).reasonCode).toBe("OVERLAP");
  });
  it("a booking that runs past midnight is rejected", () => {
    expect(checkRoom({ ...base, startTime: "23:30", durationMinutes: "60" }, CONTRACT_BOOKINGS).reasonCode).toBe(
      "ENDS_AFTER_MIDNIGHT",
    );
  });
  it("numeric duration input is accepted", () => {
    expect(parseDuration(45)).toBe(45);
  });
});

describe("security: hostile input is rejected and never echoed (XSS/injection)", () => {
  const payloads = [
    "<img src=x onerror=alert(1)>",
    "<script>alert(1)</script>",
    "12:00'; DROP TABLE bookings;--",
    "{{ appsmith.store }}",
    "javascript:alert(1)",
  ];
  it.each(payloads)("start time %s", (p) => {
    const r = checkRoom({ ...base, startTime: p }, CONTRACT_BOOKINGS);
    expect(r.reasonCode).toBe("INVALID_START");
    expect(r.message).not.toContain(p);
    expect(r.message).not.toMatch(/[<>]/);
  });
  it.each(payloads)("duration %s", (p) => {
    const r = checkRoom({ ...base, durationMinutes: p }, CONTRACT_BOOKINGS);
    expect(r.reasonCode).toBe("INVALID_DURATION");
    expect(r.message).not.toContain(p);
  });
  it("invalid booking data fails closed", () => {
    const bad: ContractBooking[] = [{ id: "X", title: "Broken", start: "11:00", end: "10:00" }];
    expect(checkRoom(base, bad)).toMatchObject({ available: false, reasonCode: "INVALID_BOOKING_DATA" });
  });
  it("the frozen booking list cannot be modified", () => {
    expect(() => (CONTRACT_BOOKINGS as ContractBooking[]).push({ id: "X", title: "x", start: "12:00", end: "13:00" })).toThrow();
  });
});
