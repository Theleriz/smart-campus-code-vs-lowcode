// Checks that the Appsmith JS Object implements exactly the same rules as the code-based core.
// It runs the pasted Appsmith code outside Appsmith, so it proves the logic, not the platform UI.
import { describe, expect, it } from "vitest";
// @ts-expect-error plain JS file written for Appsmith, no type declarations
import RoomCheck from "./RoomCheck.js";
import { checkRoom } from "../../src/contract/roomContract";
import { ACCEPTANCE_CASES, CONTRACT_BOOKINGS } from "../../src/contract/data";
import bookingsJson from "./bookings.json";

type Out = { available: boolean; reasonCode: string; message: string; status: string };
const lowcode = (s: string, d: string, b: boolean, now: string): Out => RoomCheck.check(s, d, b, now);

describe("Appsmith RoomCheck == code-based checkRoom", () => {
  it("uses the same fictional bookings", () => {
    expect(JSON.parse(JSON.stringify(RoomCheck.bookings))).toEqual(CONTRACT_BOOKINGS);
    expect(bookingsJson).toEqual(CONTRACT_BOOKINGS);
  });

  it.each(ACCEPTANCE_CASES.map((c) => [c.id, c] as const))("%s gives the same result", (_id, c) => {
    const code = checkRoom(c.input, CONTRACT_BOOKINGS);
    const low = lowcode(c.input.startTime, String(c.input.durationMinutes), c.input.blocked, c.input.now);
    expect(low).toEqual({ available: code.available, reasonCode: code.reasonCode, message: code.message, status: code.status });
  });

  it("agrees on 3 000 generated inputs (times, durations, blocked flag, odd strings)", () => {
    const times = ["", "9:00", "24:00", "07:59", "09:30", "09:31", "10:00", "11:29", "11:30", "14:00", "14:01", "15:59", "22:00", "23:59", "<b>x</b>"];
    const durations = ["", " 60 ", "-1", "0", "1", "29", "30", "60", "90", "119", "120", "121", "999", "1e2", "60.0", "abc"];
    let n = 0;
    for (let i = 0; i < 3000; i++) {
      const s = times[(i * 7) % times.length];
      const d = durations[(i * 13) % durations.length];
      const b = i % 5 === 0;
      const now = ["09:30", "12:00", "x"][i % 3];
      const code = checkRoom({ startTime: s, durationMinutes: d, blocked: b, now }, CONTRACT_BOOKINGS);
      const low = lowcode(s, d, b, now);
      expect(low, `${s} ${d} ${b} ${now}`).toEqual({ available: code.available, reasonCode: code.reasonCode, message: code.message, status: code.status });
      n++;
    }
    expect(n).toBe(3000);
  });

  it("runTests() inside the JS Object reports 8 / 8 PASS", async () => {
    let stored: Array<{ result: string }> = [];
    (globalThis as Record<string, unknown>).storeValue = (_k: string, v: typeof stored) => {
      stored = v;
      return Promise.resolve();
    };
    await RoomCheck.runTests();
    expect(stored).toHaveLength(8);
    expect(stored.every((r) => r.result === "PASS")).toBe(true);
  });
});
