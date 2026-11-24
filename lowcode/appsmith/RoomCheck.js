// Appsmith JS Object "RoomCheck" – the low-code version of src/contract/roomContract.ts.
// Same rules, same order, same reason codes. Paste into: Queries/JS -> + New JS Object -> rename to RoomCheck.
// Widgets it reads: NowInput, StartInput (Input, type Text), DurationInput (Input, type Number), BlockedSwitch (Switch).
export default {
  MAX_DURATION: 120,
  MINUTES_PER_DAY: 1440,

  // Fixed fictional bookings (same as lowcode/appsmith/bookings.json). Read-only: frozen copies.
  bookings: Object.freeze([
    Object.freeze({ id: "B1", title: "Morning Lecture", start: "08:00", end: "09:00" }),
    Object.freeze({ id: "B2", title: "Thesis Defense", start: "10:00", end: "11:30" }),
    Object.freeze({ id: "B3", title: "Workshop", start: "15:00", end: "16:00" }),
  ]),

  toMinutes(label) {
    const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(label ?? ""));
    return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
  },

  toLabel(min) {
    const h = Math.floor(min / 60), m = min % 60;
    return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
  },

  parseDuration(raw) {
    const text = typeof raw === "number" ? String(raw) : String(raw ?? "").trim();
    return /^\d{1,4}$/.test(text) ? Number(text) : NaN;
  },

  // Pure decision: returns { available, reasonCode, message, status }.
  check(startTime, duration, blocked, nowLabel) {
    const invalid = (reasonCode, message) => ({ available: false, reasonCode, message, status: "INVALID_INPUT" });
    const now = this.toMinutes(nowLabel);
    if (isNaN(now)) return invalid("INVALID_NOW", "The current time is not set. Please enter it as HH:MM.");
    const start = this.toMinutes(startTime);
    if (isNaN(start)) return invalid("INVALID_START", "Please enter a start time as HH:MM (for example 12:00).");
    const d = this.parseDuration(duration);
    if (isNaN(d) || d <= 0 || d > this.MAX_DURATION)
      return invalid("INVALID_DURATION", "Duration must be a whole number of minutes from 1 to " + this.MAX_DURATION + ".");
    if (start <= now) return invalid("START_IN_PAST", "Start time must be in the future (after " + this.toLabel(now) + ").");
    const end = start + d;
    if (end > this.MINUTES_PER_DAY) return invalid("ENDS_AFTER_MIDNIGHT", "The booking must end by 24:00 on the same day.");

    if (blocked === true)
      return { available: false, reasonCode: "ROOM_BLOCKED", status: "UNAVAILABLE",
        message: "The room is blocked (for example maintenance), so it cannot be booked at any time." };

    const parsed = this.bookings.map((b) => ({ b, s: this.toMinutes(b.start), e: this.toMinutes(b.end) }));
    if (parsed.some((x) => isNaN(x.s) || isNaN(x.e) || x.s >= x.e))
      return { available: false, reasonCode: "INVALID_BOOKING_DATA", status: "UNAVAILABLE",
        message: "The booking list is invalid, so availability cannot be confirmed." };

    const hit = parsed.find((x) => start < x.e && x.s < end); // touching ends do not overlap
    if (hit)
      return { available: false, reasonCode: "OVERLAP", status: "UNAVAILABLE",
        message: 'Overlaps with "' + hit.b.title + '" (' + hit.b.start + "–" + hit.b.end + ")." };

    return { available: true, reasonCode: "AVAILABLE", status: "AVAILABLE",
      message: "The room is free from " + this.toLabel(start) + " to " + this.toLabel(end) + "." };
  },

  // "Check availability" button -> onClick: {{RoomCheck.run()}}
  run() {
    const r = this.check(StartInput.text, DurationInput.text, BlockedSwitch.isSwitchedOn, NowInput.text);
    return storeValue("result", r, false);
  },

  fingerprint() {
    const text = JSON.stringify(this.bookings);
    let h = 5381;
    for (let i = 0; i < text.length; i++) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0;
    return this.bookings.length + " bookings · #" + h.toString(16).padStart(8, "0");
  },

  // "Run T1–T8" button -> onClick: {{RoomCheck.runTests()}}  (same inputs as src/contract/data.ts)
  runTests() {
    const cases = [
      ["T1", "Valid free interval", "12:00", "60", false, "AVAILABLE", "AVAILABLE"],
      ["T2", "Overlap with an existing booking", "11:00", "60", false, "UNAVAILABLE", "OVERLAP"],
      ["T3", "Blocked room", "12:00", "60", true, "UNAVAILABLE", "ROOM_BLOCKED"],
      ["T4", "Duration = 0", "12:00", "0", false, "INVALID_INPUT", "INVALID_DURATION"],
      ["T5", "Duration = 121 minutes", "12:00", "121", false, "INVALID_INPUT", "INVALID_DURATION"],
      ["T6", "Start time in the past", "09:00", "30", false, "INVALID_INPUT", "START_IN_PAST"],
      ["T7", "Adjacent interval", "11:30", "60", false, "AVAILABLE", "AVAILABLE"],
    ];
    const before = this.fingerprint();
    const rows = cases.map(([id, title, s, d, bl, st, code]) => {
      const r = this.check(s, d, bl, "09:30");
      return { test: id, case: title, expected: st + " / " + code, observed: r.status + " / " + r.reasonCode,
        result: r.status === st && r.reasonCode === code ? "PASS" : "FAIL" };
    });
    const after = this.fingerprint();
    rows.push({ test: "T8", case: "Bookings unchanged", expected: before, observed: after, result: before === after ? "PASS" : "FAIL" });
    return storeValue("tests", rows, false);
  },
};
