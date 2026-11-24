import type { ContractBooking, RoomCheckInput } from "./roomContract";

/** The one fictional room used by both solutions (same data as lowcode/appsmith/bookings.json). */
export const CONTRACT_ROOM = { id: "R4", name: "Seminar Room 7", building: "South Wing", capacity: 20 } as const;

/** Simulated "now" so every run of T1–T8 gives the same result. */
export const DEFAULT_NOW = "09:30";

/** Fixed fictional bookings. Frozen: any attempt to change them throws in strict mode. */
export const CONTRACT_BOOKINGS: readonly ContractBooking[] = Object.freeze([
  Object.freeze({ id: "B1", title: "Morning Lecture", start: "08:00", end: "09:00" }),
  Object.freeze({ id: "B2", title: "Thesis Defense", start: "10:00", end: "11:30" }),
  Object.freeze({ id: "B3", title: "Workshop", start: "15:00", end: "16:00" }),
]);

export interface AcceptanceCase {
  id: string;
  title: string;
  input: RoomCheckInput;
  expectStatus: "AVAILABLE" | "UNAVAILABLE" | "INVALID_INPUT";
  expectCode: string;
  ac: string;
}

/** The common test inputs T1–T7 (T8 checks the booking list after running them). */
export const ACCEPTANCE_CASES: AcceptanceCase[] = [
  { id: "T1", title: "Valid free interval", ac: "AC1–AC3, AC5",
    input: { startTime: "12:00", durationMinutes: "60", blocked: false, now: DEFAULT_NOW },
    expectStatus: "AVAILABLE", expectCode: "AVAILABLE" },
  { id: "T2", title: "Overlap with an existing booking", ac: "AC3",
    input: { startTime: "11:00", durationMinutes: "60", blocked: false, now: DEFAULT_NOW },
    expectStatus: "UNAVAILABLE", expectCode: "OVERLAP" },
  { id: "T3", title: "Blocked room", ac: "AC4",
    input: { startTime: "12:00", durationMinutes: "60", blocked: true, now: DEFAULT_NOW },
    expectStatus: "UNAVAILABLE", expectCode: "ROOM_BLOCKED" },
  { id: "T4", title: "Duration = 0", ac: "AC2, AC6",
    input: { startTime: "12:00", durationMinutes: "0", blocked: false, now: DEFAULT_NOW },
    expectStatus: "INVALID_INPUT", expectCode: "INVALID_DURATION" },
  { id: "T5", title: "Duration = 121 minutes", ac: "AC2, AC6",
    input: { startTime: "12:00", durationMinutes: "121", blocked: false, now: DEFAULT_NOW },
    expectStatus: "INVALID_INPUT", expectCode: "INVALID_DURATION" },
  { id: "T6", title: "Start time in the past", ac: "AC1, AC6",
    input: { startTime: "09:00", durationMinutes: "30", blocked: false, now: DEFAULT_NOW },
    expectStatus: "INVALID_INPUT", expectCode: "START_IN_PAST" },
  { id: "T7", title: "Adjacent interval (starts when a booking ends)", ac: "AC3",
    input: { startTime: "11:30", durationMinutes: "60", blocked: false, now: DEFAULT_NOW },
    expectStatus: "AVAILABLE", expectCode: "AVAILABLE" },
];
