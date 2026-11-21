// Practice #11 – server side of the trust boundary for POST /api/explain.
// Pure request -> response function so it can be unit-tested without a running server.
import {
  LIMITS,
  validateExplainRequest,
  validateExplanation,
  type ExplainRequest,
} from "../src/explain/contract";

/** Produces raw model text for a validated request. Throws on API failure. */
export type ExplanationGenerator = (req: ExplainRequest, signal: AbortSignal) => Promise<string>;

export interface HandlerDeps {
  /** Undefined when no API key / model is configured -> 503, the client shows the fallback. */
  generate?: ExplanationGenerator;
  timeoutMs?: number;
}

export interface HandlerResult {
  status: number;
  body: { explanation: string } | { error: string };
}

const SERVER_TIMEOUT_MS = 4000; // below the client's 5 s limit, so the server answers first

export async function handleExplain(bodyText: string, deps: HandlerDeps): Promise<HandlerResult> {
  if (Buffer.byteLength(bodyText, "utf8") > LIMITS.requestBytesMax) {
    return { status: 413, body: { error: "Request is too large." } };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    return { status: 400, body: { error: "Request is not valid JSON." } };
  }
  const request = validateExplainRequest(parsed);
  if (!request.ok) return { status: 400, body: { error: request.error } };

  if (!deps.generate) return { status: 503, body: { error: "LLM_NOT_CONFIGURED" } };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), deps.timeoutMs ?? SERVER_TIMEOUT_MS);
  try {
    const raw = await deps.generate(request.value, controller.signal);
    const checked = validateExplanation(raw, request.value);
    if (!checked.ok) return { status: 502, body: { error: "INVALID_MODEL_OUTPUT" } };
    return { status: 200, body: { explanation: checked.value } };
  } catch {
    // Never forward provider error details (they can contain request ids or key hints).
    if (controller.signal.aborted) return { status: 504, body: { error: "LLM_TIMEOUT" } };
    return { status: 502, body: { error: "LLM_ERROR" } };
  } finally {
    clearTimeout(timer);
  }
}
