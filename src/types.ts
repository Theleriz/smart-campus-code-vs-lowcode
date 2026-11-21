export interface Room {
  id: string;
  name: string;
  building: string;
  capacity: number;
  blocked: boolean;
}

export interface Booking {
  id: string;
  roomId: string;
  start: number; // minutes since midnight
  end: number;   // minutes since midnight
  title: string;
}

export type Decision = "available" | "unavailable" | null;

/**
 * Machine-readable reason for a decision. One code per failed rule, in the same
 * order as the human-readable `reasons`. "AVAILABLE" means every rule passed.
 */
export type ReasonCode =
  | "AVAILABLE"
  | "NO_ROOM"
  | "INVALID_TIME"
  | "OUT_OF_RANGE"
  | "START_NOT_BEFORE_END"
  | "START_NOT_AFTER_NOW"
  | "TOO_LONG"
  | "ROOM_BLOCKED"
  | "INVALID_BOOKING_DATA"
  | "OVERLAP";

export interface ValidationResult {
  ok: boolean;
  reason: string;
  code?: ReasonCode;
}

export interface CheckResult {
  decision: Decision;
  reasons: string[];
}

/** CheckResult plus one ReasonCode per reason (codes[i] explains reasons[i]). */
export interface DetailedCheckResult extends CheckResult {
  codes: ReasonCode[];
}
