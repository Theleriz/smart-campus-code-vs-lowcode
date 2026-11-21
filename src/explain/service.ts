// Practice #11 – explanation service: validate input -> call adapter with a timeout ->
// validate output -> otherwise return a deterministic fallback. It never throws and never
// touches booking data or the availability decision.
import {
  LIMITS,
  REASON_PHRASE,
  validateExplainRequest,
  validateExplanation,
  type ExplainRequest,
} from "./contract";

export type AdapterKind = "mock" | "llm";

/** Every adapter returns raw, untrusted output; the service validates it. */
export interface ExplainAdapter {
  readonly name: string;
  readonly kind: AdapterKind;
  explain(req: ExplainRequest, signal: AbortSignal): Promise<unknown>;
}

/** Thrown by an adapter when no model is configured (e.g. missing API key). */
export class AdapterUnavailableError extends Error {
  constructor(message = "The explanation model is not available.") {
    super(message);
    this.name = "AdapterUnavailableError";
  }
}

export type FailureKind = "invalid_input" | "timeout" | "unavailable" | "adapter_error" | "invalid_output";

export type ExplainOutcome =
  | { source: AdapterKind; adapterName: string; text: string; latencyMs: number }
  | { source: "fallback"; adapterName: string; text: string; latencyMs: number; failure: FailureKind; detail: string };

export const FAILURE_LABEL: Record<FailureKind, string> = {
  invalid_input: "input rejected",
  timeout: "timed out",
  unavailable: "model not configured",
  adapter_error: "service error",
  invalid_output: "answer failed the safety check",
};

const GENERIC_FALLBACK =
  "No explanation is available for this input. The confirmed status from the booking rules is still correct.";

/** AC4 – deterministic text built only from the rule-engine result. No AI involved. */
export function fallbackExplanation(input: unknown): string {
  const v = validateExplainRequest(input);
  if (!v.ok) return GENERIC_FALLBACK;
  const r = v.value;
  const status = r.isAvailable ? "available" : "unavailable";
  return `${r.roomLabel} is ${status} from ${r.start} to ${r.end} because ${REASON_PHRASE[r.reasonCode]}.`;
}

function extractExplanation(raw: unknown): unknown {
  if (raw !== null && typeof raw === "object" && "explanation" in raw) {
    return (raw as { explanation: unknown }).explanation;
  }
  return undefined;
}

export interface ExplainOptions {
  timeoutMs?: number;
  /** Aborts the request, e.g. when the student changes the inputs. */
  signal?: AbortSignal;
  now?: () => number;
}

export async function explainAvailability(
  input: unknown,
  adapter: ExplainAdapter,
  options: ExplainOptions = {},
): Promise<ExplainOutcome> {
  const now = options.now ?? (() => Date.now());
  const started = now();
  const fallback = (failure: FailureKind, detail: string): ExplainOutcome => ({
    source: "fallback",
    adapterName: adapter.name,
    text: fallbackExplanation(input),
    latencyMs: now() - started,
    failure,
    detail,
  });

  const request = validateExplainRequest(input);
  if (!request.ok) return fallback("invalid_input", request.error);

  const controller = new AbortController();
  const onOuterAbort = () => controller.abort();
  options.signal?.addEventListener("abort", onOuterAbort);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<"timeout">((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      resolve("timeout");
    }, options.timeoutMs ?? LIMITS.timeoutMs);
  });

  try {
    const raw = await Promise.race([adapter.explain(request.value, controller.signal), timeout]);
    if (raw === "timeout") return fallback("timeout", "No answer within the time limit.");
    const checked = validateExplanation(extractExplanation(raw), request.value);
    if (!checked.ok) return fallback("invalid_output", checked.error);
    return { source: adapter.kind, adapterName: adapter.name, text: checked.value, latencyMs: now() - started };
  } catch (err) {
    if (err instanceof AdapterUnavailableError) return fallback("unavailable", err.message);
    if (controller.signal.aborted) return fallback("timeout", "The request was cancelled.");
    return fallback("adapter_error", "The explanation service failed.");
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", onOuterAbort);
  }
}
