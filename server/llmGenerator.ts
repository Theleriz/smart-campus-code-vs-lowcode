// Practice #11 – optional live LLM adapter (server only).
// Reads LLM_API_KEY and LLM_MODEL from the server environment; nothing is exposed to the browser
// (no VITE_ prefix). Without both variables the endpoint answers 503 and the UI shows the fallback.
import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT, buildUserMessage } from "../src/explain/prompt";
import type { ExplanationGenerator } from "./explainHandler";

export function createLlmGenerator(env: { LLM_API_KEY?: string; LLM_MODEL?: string }): ExplanationGenerator | undefined {
  const apiKey = env.LLM_API_KEY?.trim();
  const model = env.LLM_MODEL?.trim();
  if (!apiKey || !model) return undefined;

  const client = new Anthropic({ apiKey, maxRetries: 0, timeout: 8000 });

  return async (req, signal) => {
    const response = await client.messages.create(
      {
        model,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        output_config: { effort: "low" },
        messages: [{ role: "user", content: buildUserMessage(req) }],
      },
      { signal },
    );
    if (response.stop_reason !== "end_turn") {
      throw new Error(`Unusable stop reason: ${response.stop_reason}`);
    }
    return response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join(" ");
  };
}
