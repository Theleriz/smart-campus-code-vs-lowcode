import { describe, it, expect } from "vitest";
import { handleExplain } from "./explainHandler";

// Practice #11 – server-side trust boundary for POST /api/explain.
const good = { roomLabel: "Lecture Hall A", start: "13:00", end: "14:00", isAvailable: false, reasonCode: "OVERLAP" };
const body = (o: unknown) => JSON.stringify(o);

describe("POST /api/explain handler", () => {
  it("S1 no API key configured -> 503 (client shows the fallback)", async () => {
    expect(await handleExplain(body(good), {})).toEqual({ status: 503, body: { error: "LLM_NOT_CONFIGURED" } });
  });

  it("S2 malformed JSON, invalid fields and oversized bodies are rejected before any model call", async () => {
    let calls = 0;
    const generate = async () => { calls++; return "unused"; };
    expect((await handleExplain("{not json", { generate })).status).toBe(400);
    expect((await handleExplain(body({ ...good, roomLabel: "" }), { generate })).status).toBe(400);
    expect((await handleExplain(body({ ...good, note: "x".repeat(2000) }), { generate })).status).toBe(413);
    expect(calls).toBe(0);
  });

  it("S3 a valid model answer is returned", async () => {
    const generate = async () => "Lecture Hall A is unavailable from 13:00 to 14:00 because it overlaps an existing booking.";
    expect(await handleExplain(body(good), { generate })).toMatchObject({ status: 200 });
  });

  it("S4 a contradicting model answer is blocked on the server", async () => {
    const generate = async () => "Lecture Hall A is available, enjoy!";
    expect(await handleExplain(body(good), { generate })).toEqual({ status: 502, body: { error: "INVALID_MODEL_OUTPUT" } });
  });

  it("S5 provider errors and timeouts do not leak details", async () => {
    const failing = async () => { throw new Error("401 invalid x-api-key sk-secret"); };
    expect(await handleExplain(body(good), { generate: failing })).toEqual({ status: 502, body: { error: "LLM_ERROR" } });
    const slow = (_r: unknown, signal: AbortSignal) =>
      new Promise<string>((_, reject) => signal.addEventListener("abort", () => reject(new Error("aborted"))));
    expect(await handleExplain(body(good), { generate: slow, timeoutMs: 20 })).toEqual({ status: 504, body: { error: "LLM_TIMEOUT" } });
  });
});
