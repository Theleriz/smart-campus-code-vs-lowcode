import { useEffect, useRef, useState } from "react";
import { Sparkles, Info, Loader2 } from "lucide-react";
import type { ExplainRequest } from "../explain/contract";
import { explainAvailability, FAILURE_LABEL, type ExplainAdapter, type ExplainOutcome } from "../explain/service";

interface ExplanationPanelProps {
  /** Built from the deterministic result; the panel can only explain it, never change it. */
  request: ExplainRequest;
  adapter: ExplainAdapter;
}

type State = { status: "idle" } | { status: "loading" } | { status: "done"; outcome: ExplainOutcome };

export function ExplanationPanel({ request, adapter }: ExplanationPanelProps) {
  const [state, setState] = useState<State>({ status: "idle" });
  const controllerRef = useRef<AbortController | null>(null);

  // Abort a pending request when the panel unmounts (the parent remounts it when the inputs change).
  useEffect(() => () => controllerRef.current?.abort(), []);

  const onExplain = async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState({ status: "loading" });
    const outcome = await explainAvailability(request, adapter, { signal: controller.signal });
    if (!controller.signal.aborted) setState({ status: "done", outcome });
  };

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={onExplain}
        disabled={state.status === "loading"}
        className="w-full flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold border border-violet-300 text-violet-700 bg-white hover:bg-violet-50 disabled:opacity-60 disabled:cursor-wait transition-colors"
      >
        {state.status === "loading" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        {state.status === "loading" ? "Generating explanation…" : "Explain availability"}
      </button>

      <div aria-live="polite">
        {state.status === "done" && <ExplanationCard outcome={state.outcome} />}
      </div>
    </div>
  );
}

function ExplanationCard({ outcome }: { outcome: ExplainOutcome }) {
  if (outcome.source === "fallback") {
    return (
      <div data-testid="explanation" data-source="fallback" className="mt-3 rounded-xl border border-slate-300 bg-slate-50 p-3">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
          <Info className="w-3.5 h-3.5" />
          Standard explanation · AI unavailable ({FAILURE_LABEL[outcome.failure]})
        </p>
        <p className="mt-1.5 text-sm text-slate-700">{outcome.text}</p>
        <p className="mt-2 text-[11px] text-slate-500">
          Written from the booking rules, not by AI. The confirmed status above is unchanged.
        </p>
      </div>
    );
  }
  return (
    <div data-testid="explanation" data-source={outcome.source} className="mt-3 rounded-xl border-2 border-dashed border-violet-300 bg-violet-50/60 p-3">
      <p className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-violet-700">
        <Sparkles className="w-3.5 h-3.5" />
        AI-generated explanation
        <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700">{outcome.adapterName}</span>
      </p>
      <p className="mt-1.5 text-sm text-slate-800">{outcome.text}</p>
      <p className="mt-2 text-[11px] text-slate-500">
        Generated text, not a booking confirmation. Only the status above (from the booking rules) is authoritative.
      </p>
    </div>
  );
}
