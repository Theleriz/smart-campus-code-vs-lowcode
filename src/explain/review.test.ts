import { describe, it, expect } from "vitest";
import { validateExplainRequest, validateExplanation, type ExplainRequest } from "./contract";

// Practice #11, Task 07 – regression tests written from the agentic review findings.
// Each test first reproduced the finding (failing), then guarded the fix.
const overlap: ExplainRequest = { roomLabel: "Lecture Hall A", start: "13:00", end: "14:00", isAvailable: false, reasonCode: "OVERLAP" };
const available: ExplainRequest = { roomLabel: "Study Room 204", start: "10:00", end: "11:00", isAvailable: true, reasonCode: "AVAILABLE" };
const rejected = (text: string, req: ExplainRequest) => expect(validateExplanation(text, req).ok).toBe(false);

describe("F1 – an unavailable slot must not be described as usable", () => {
  it.each([
    "Good news, Lecture Hall A is now available from 13:00 to 14:00.",
    "Lecture Hall A from 13:00 to 14:00 meets every booking rule, so you can use it.",
    "Lecture Hall A is yours from 13:00 to 14:00.",
  ])("rejects: %s", (text) => rejected(text, overlap));

  it("an explanation must state the confirmed status", () => {
    rejected("Lecture Hall A, 13:00 to 14:00: please pick another slot.", overlap);
    rejected("Study Room 204 meets every booking rule from 10:00 to 11:00.", available);
  });
});

describe("F2 – invented details and a different reason are rejected", () => {
  it.each([
    "Lecture Hall A is unavailable from 13:00 to 14:00 because Professor Smith is teaching Quantum Physics there.",
    "Lecture Hall A is unavailable from 13:00 to 14:00 because it is closed for maintenance.",
  ])("rejects: %s", (text) => rejected(text, overlap));
});

describe("F8 – look-alike and bidi characters are rejected", () => {
  it.each([
    "Lecture Hall A is ‮elbaliava‬ from 13:00 to 14:00.",
    "Lecture Hall A is аvailable from 13:00 to 14:00.",
    "Lecture Hall A is un​available from 13:00 to 14:00 because it overlaps an existing booking.",
  ])("rejects %j", (text) => rejected(text, overlap));
});

describe("fixes keep correct explanations working", () => {
  it("accepts faithful text for each status", () => {
    expect(validateExplanation("Lecture Hall A is unavailable from 13:00 to 14:00 because that time overlaps an existing booking.", overlap).ok).toBe(true);
    expect(validateExplanation("Study Room 204 is available from 10:00 to 11:00 because it meets every booking rule.", available).ok).toBe(true);
  });
});

describe("F4 (not fixed, documented) – the server only checks internal consistency of the facts", () => {
  it("a forged 'available' request for an overlapping slot still passes request validation", () => {
    expect(validateExplainRequest({ ...overlap, isAvailable: true, reasonCode: "AVAILABLE" }).ok).toBe(true);
  });
});
