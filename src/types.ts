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

export interface ValidationResult {
  ok: boolean;
  reason: string;
}

export interface CheckResult {
  decision: Decision;
  reasons: string[];
}
