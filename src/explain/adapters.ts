// Practice #11 – client-side adapters. No API key ever reaches the browser:
// the mock runs locally, the live adapter only calls our own server endpoint.
import { REASON_PHRASE, type ExplainRequest, type ExplainResponse } from "./contract";
import { AdapterUnavailableError, type ExplainAdapter } from "./service";

export type SimulatedFailure = "none" | "timeout" | "error" | "unavailable" | "invalid-output";

const NEXT_STEP: Partial<Record<ExplainRequest["reasonCode"], string>> = {
  OVERLAP: "Try a slot that starts after that booking ends or ends before it begins.",
  ROOM_BLOCKED: "Please choose a different room.",
  START_NOT_AFTER_NOW: "Pick a start time later than now.",
  TOO_LONG: "Try a shorter slot of up to two hours.",
  START_NOT_BEFORE_END: "Choose an end time that is later than the start time.",
  INVALID_BOOKING_DATA: "Please choose another room or ask the campus office.",
};

/** Deterministic stand-in for a language model, following the same contract. Clearly labeled "Mock AI". */
export function mockExplanation(req: ExplainRequest): string {
  if (req.isAvailable) {
    return `${req.roomLabel} is available from ${req.start} to ${req.end} because ${REASON_PHRASE.AVAILABLE}. This is only an explanation, so no booking has been made.`;
  }
  return `${req.roomLabel} is unavailable from ${req.start} to ${req.end} because ${REASON_PHRASE[req.reasonCode]}. ${NEXT_STEP[req.reasonCode] ?? "Please try another time."}`;
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new DOMException("Aborted", "AbortError"));
    const t = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new DOMException("Aborted", "AbortError"));
    }, { once: true });
  });
}

export function createMockAdapter(opts: { latencyMs?: number; simulate?: SimulatedFailure } = {}): ExplainAdapter {
  const latencyMs = opts.latencyMs ?? 300;
  const simulate = opts.simulate ?? "none";
  return {
    name: "Mock AI",
    kind: "mock",
    async explain(req, signal): Promise<ExplainResponse> {
      if (simulate === "timeout") {
        await wait(60_000, signal); // longer than any timeout – the service gives up first
      } else {
        await wait(latencyMs, signal);
      }
      if (simulate === "error") throw new Error("Simulated API failure (HTTP 500).");
      if (simulate === "unavailable") throw new AdapterUnavailableError("Simulated missing API key.");
      if (simulate === "invalid-output") {
        // A hallucinating model: contradicts the status and invents a booking time.
        return {
          explanation: `Good news! ${req.roomLabel} is available, and I have booked it for you from 07:15 to 09:45.`,
        };
      }
      return { explanation: mockExplanation(req) };
    },
  };
}

/** Calls the server-side LLM adapter (POST /api/explain). The key stays on the server. */
export function createHttpAdapter(endpoint = "/api/explain", fetchImpl: typeof fetch = fetch): ExplainAdapter {
  return {
    name: "Live LLM (server)",
    kind: "llm",
    async explain(req, signal): Promise<unknown> {
      const res = await fetchImpl(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
        signal,
      });
      if (res.status === 503 || res.status === 404) {
        throw new AdapterUnavailableError("The live model is not configured on the server.");
      }
      if (!res.ok) throw new Error(`Explanation service returned HTTP ${res.status}.`);
      return await res.json();
    },
  };
}
