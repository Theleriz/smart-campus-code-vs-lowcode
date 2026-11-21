// Practice #11 – input/output contract for the optional "Explain availability" feature.
// Pure functions only: this file runs in the browser AND in the server-side adapter.
// The deterministic rule engine (src/utils.ts) decides availability; nothing here can change it.
import { ROOMS } from "../data";
import type { DetailedCheckResult, ReasonCode } from "../types";
import { minutesToLabel, primaryReasonCode } from "../utils";

export const LIMITS = {
  /** Longest room label we accept (characters). */
  roomLabelMax: 60,
  /** Longest raw JSON request body the server accepts (bytes). */
  requestBytesMax: 1024,
  /** Longest raw model output we even look at (characters). */
  rawOutputMax: 2000,
  /** Longest explanation shown to the student (characters, after whitespace cleanup). */
  explanationMax: 300,
  maxSentences: 2,
  /** Client-side timeout for one explanation request. */
  timeoutMs: 5000,
} as const;

export const REASON_CODES: readonly ReasonCode[] = [
  "AVAILABLE",
  "NO_ROOM",
  "INVALID_TIME",
  "OUT_OF_RANGE",
  "START_NOT_BEFORE_END",
  "START_NOT_AFTER_NOW",
  "TOO_LONG",
  "ROOM_BLOCKED",
  "INVALID_BOOKING_DATA",
  "OVERLAP",
];

/** Codes that can be explained. NO_ROOM / INVALID_TIME / OUT_OF_RANGE never produce a valid request. */
export const EXPLAINABLE_CODES: readonly ReasonCode[] = REASON_CODES.filter(
  (c) => c !== "NO_ROOM" && c !== "INVALID_TIME" && c !== "OUT_OF_RANGE",
);

/** Only the fictional rooms of this prototype can be explained (allowlist, not a pattern). */
export const KNOWN_ROOM_LABELS: readonly string[] = ROOMS.map((r) => r.name);

/** Input contract: minimal, structured facts from the rule engine. No booking titles, no personal data. */
export interface ExplainRequest {
  roomLabel: string;
  start: string; // "HH:MM", 00:00–24:00
  end: string;   // "HH:MM", 00:00–24:00
  isAvailable: boolean;
  reasonCode: ReasonCode;
}

/** Output contract of every adapter (mock, server, model). */
export interface ExplainResponse {
  explanation: string;
}

export type Validated<T> = { ok: true; value: T } | { ok: false; error: string };

const REQUEST_KEYS = ["roomLabel", "start", "end", "isAvailable", "reasonCode"] as const;
const TIME_RE = /^(?:(?:[01]\d|2[0-3]):[0-5]\d|24:00)$/;
const ROOM_LABEL_RE = /^[A-Za-z0-9][A-Za-z0-9 ,'()&-]*$/;

function timeToMinutes(t: string): number {
  return Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
}

/** Builds the request from the deterministic result. Never invents a status. */
export function buildExplainRequest(
  roomLabel: string,
  start: number,
  end: number,
  result: DetailedCheckResult,
): ExplainRequest {
  return {
    roomLabel,
    start: minutesToLabel(start),
    end: minutesToLabel(end),
    isAvailable: result.decision === "available",
    reasonCode: primaryReasonCode(result),
  };
}

/**
 * AC3 – rejects empty, malformed, inconsistent or overly long input.
 * Used on the client before calling an adapter and again on the server (the trust boundary).
 */
export function validateExplainRequest(
  input: unknown,
  allowedRoomLabels: readonly string[] = KNOWN_ROOM_LABELS,
): Validated<ExplainRequest> {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: "Request must be a JSON object." };
  }
  const obj = input as Record<string, unknown>;
  const keys = Object.keys(obj);
  const extra = keys.filter((k) => !(REQUEST_KEYS as readonly string[]).includes(k));
  if (extra.length > 0) return { ok: false, error: `Unexpected field: ${extra[0].slice(0, 30)}.` };
  for (const k of REQUEST_KEYS) {
    if (!(k in obj)) return { ok: false, error: `Missing field: ${k}.` };
  }

  const { roomLabel, start, end, isAvailable, reasonCode } = obj;
  if (typeof roomLabel !== "string" || roomLabel.trim() === "") {
    return { ok: false, error: "Room label is empty." };
  }
  if (roomLabel.length > LIMITS.roomLabelMax) {
    return { ok: false, error: `Room label is longer than ${LIMITS.roomLabelMax} characters.` };
  }
  if (!ROOM_LABEL_RE.test(roomLabel)) {
    return { ok: false, error: "Room label contains characters that are not allowed." };
  }
  if (!allowedRoomLabels.includes(roomLabel)) {
    return { ok: false, error: "Unknown room." };
  }
  if (typeof start !== "string" || !TIME_RE.test(start) || typeof end !== "string" || !TIME_RE.test(end)) {
    return { ok: false, error: "Start and end must be times in HH:MM format (00:00–24:00)." };
  }
  if (typeof isAvailable !== "boolean") {
    return { ok: false, error: "isAvailable must be true or false." };
  }
  if (typeof reasonCode !== "string" || !(EXPLAINABLE_CODES as readonly string[]).includes(reasonCode)) {
    return { ok: false, error: "Unknown or unexplainable reason code." };
  }
  // The status and the reason code must agree – the explainer may not receive a contradiction.
  if (isAvailable !== (reasonCode === "AVAILABLE")) {
    return { ok: false, error: "isAvailable does not match the reason code." };
  }
  if (isAvailable && timeToMinutes(start) >= timeToMinutes(end)) {
    return { ok: false, error: "An available slot must start before it ends." };
  }
  return { ok: true, value: { roomLabel, start, end, isAvailable, reasonCode: reasonCode as ReasonCode } };
}

// ---- Output validation (model output is untrusted data) ----

const FORBIDDEN_MARKUP_RE = /[<>`{}*#[\]|\\]|https?:|www\./i;
const NEGATIVE_RE =
  /\b(unavailable|not available|isn't available|not free|cannot be booked|can't be booked|blocked|overlap\w*|conflict\w*|occupied|already booked|taken|rejected|denied)\b/i;
const POSITIVE_RE =
  /\b(is free|is open|is yours|you can (book|use|have)|can be booked|go ahead|meets every|passes every|all (the )?rules)\b/i;
/** "available" that is not part of "unavailable" and not negated ("not available"). */
const BARE_AVAILABLE_RE = /(?<!\bnot |\bun|\bnot\s)available\b/i;
const UNAVAILABLE_STATUS_RE = /\b(unavailable|not available|cannot be booked|can't be booked)\b/i;
/** Review fix F8: printable ASCII plus en dash and typographic apostrophe; no bidi, zero-width or look-alike letters. */
const ALLOWED_CHARS_RE = /^[\x20-\x7E–’]*$/;
/** Review fix F2: words that identify each reason. The explanation must use its own and no other reason's. */
const REASON_KEYWORDS: Partial<Record<ReasonCode, RegExp>> = {
  OVERLAP: /\b(overlap\w*|existing booking|already booked)\b/i,
  ROOM_BLOCKED: /\b(blocked|closed)\b/i,
  START_NOT_AFTER_NOW: /\b(current time|in the past|already (passed|started)|now)\b/i,
  TOO_LONG: /\b(120-minute|120 minutes|two hours|too long|longer than)\b/i,
  START_NOT_BEFORE_END: /\b(end time|before the end|after the end)\b/i,
  INVALID_BOOKING_DATA: /\b(invalid|booking data)\b/i,
};
/** Mid-sentence capitalised words that are not part of the room label look like invented names (F2). */
function inventedProperNoun(text: string, roomLabel: string): string | null {
  const labelWords = new Set(roomLabel.split(/\s+/));
  for (const sentence of text.split(/[.!?]+(?:\s+|$)/)) {
    const words = sentence.trim().split(/\s+/).slice(1);
    for (const w of words) {
      const word = w.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, "");
      if (/^[A-Z]/.test(word) && !labelWords.has(word)) return word;
    }
  }
  return null;
}
const ACTION_CLAIM_RE =
  /\b(i|i've|i have|we|we've|we have)\s+(booked|reserved|confirmed|cancel+ed|changed|moved)\b|\b(has|have) been (booked|reserved|confirmed|cancel+ed) for you\b|\breserved for you\b|\bbooking (is )?confirmed\b/i;
const TIME_TOKEN_RE = /\b\d{1,2}:\d{2}\b/g;
const AM_PM_RE = /\b\d{1,2}\s?(?:am|pm|a\.m\.|p\.m\.)/i;

export function countSentences(text: string): number {
  return text.split(/[.!?]+(?:\s+|$)/).filter((s) => s.trim() !== "").length;
}

/**
 * AC2 / AC5 – accepts a model explanation only if it is short plain text that agrees with the
 * deterministic decision and mentions no facts (times, numbers) that were not supplied.
 */
export function validateExplanation(raw: unknown, req: ExplainRequest): Validated<string> {
  if (typeof raw !== "string") return { ok: false, error: "Explanation is not text." };
  if (raw.length > LIMITS.rawOutputMax) return { ok: false, error: "Explanation is too long." };
  const text = raw.replace(/\s+/g, " ").trim();
  if (text === "") return { ok: false, error: "Explanation is empty." };
  if (text.length > LIMITS.explanationMax) return { ok: false, error: "Explanation is too long." };
  if (!ALLOWED_CHARS_RE.test(text)) return { ok: false, error: "Explanation contains characters that are not allowed." };
  if (countSentences(text) > LIMITS.maxSentences) return { ok: false, error: "Explanation has more than two sentences." };
  if (FORBIDDEN_MARKUP_RE.test(text)) return { ok: false, error: "Explanation contains markup or links." };
  if (ACTION_CLAIM_RE.test(text)) return { ok: false, error: "Explanation claims a booking action." };

  // Agreement with the deterministic decision (AC2).
  if (req.isAvailable && NEGATIVE_RE.test(text)) {
    return { ok: false, error: "Explanation contradicts the decision (says unavailable)." };
  }
  if (!req.isAvailable && (POSITIVE_RE.test(text) || BARE_AVAILABLE_RE.test(text))) {
    return { ok: false, error: "Explanation contradicts the decision (says available)." };
  }
  // Review fix F1: the confirmed status must be stated explicitly, not just "not contradicted".
  if (req.isAvailable ? !BARE_AVAILABLE_RE.test(text) : !UNAVAILABLE_STATUS_RE.test(text)) {
    return { ok: false, error: "Explanation does not state the confirmed status." };
  }
  // Review fix F2: the stated reason must be the rule engine's reason, and no other.
  const own = REASON_KEYWORDS[req.reasonCode];
  if (own && !own.test(text)) return { ok: false, error: "Explanation does not give the confirmed reason." };
  for (const [code, re] of Object.entries(REASON_KEYWORDS)) {
    if (code !== req.reasonCode && re.test(text)) {
      return { ok: false, error: "Explanation gives a reason that the booking rules did not report." };
    }
  }
  const invented = inventedProperNoun(text, req.roomLabel);
  if (invented) return { ok: false, error: `Explanation mentions a name that was not supplied (${invented}).` };

  // No invented times or numbers: only the requested times, the room label and the rule limits may appear.
  const allowedTimes = new Set([req.start, req.end, "00:00", "24:00"]);
  for (const t of text.match(TIME_TOKEN_RE) ?? []) {
    const norm = t.padStart(5, "0");
    if (!allowedTimes.has(norm)) return { ok: false, error: `Explanation mentions a time that was not supplied (${t}).` };
  }
  if (AM_PM_RE.test(text)) return { ok: false, error: "Explanation mentions a time that was not supplied." };
  let rest = text.split(req.roomLabel).join(" ");
  rest = rest.replace(TIME_TOKEN_RE, " ").replace(/\b120\b/g, " ");
  if (/\d/.test(rest)) return { ok: false, error: "Explanation mentions a number that was not supplied." };

  return { ok: true, value: text };
}

// ---- Deterministic wording (used by the mock adapter and by the fallback) ----

export const REASON_PHRASE: Record<ReasonCode, string> = {
  AVAILABLE: "this time meets every booking rule",
  NO_ROOM: "no room was selected",
  INVALID_TIME: "the times are not valid",
  OUT_OF_RANGE: "the times are outside 00:00–24:00",
  START_NOT_BEFORE_END: "the start time is not before the end time",
  START_NOT_AFTER_NOW: "the start time is not later than the current time",
  TOO_LONG: "the booking is longer than the 120-minute limit",
  ROOM_BLOCKED: "the room is currently closed for booking",
  INVALID_BOOKING_DATA: "the booking data for this room is invalid, so availability cannot be confirmed",
  OVERLAP: "that time overlaps an existing booking for this room",
};
