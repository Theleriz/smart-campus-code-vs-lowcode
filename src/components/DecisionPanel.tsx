import { CheckCircle2, XCircle, Info } from "lucide-react";
import type { CheckResult } from "../types";
import { minutesToLabel } from "../utils";

interface DecisionPanelProps {
  result: CheckResult;
  start: number;
  end: number;
  roomName: string | null;
}

export function DecisionPanel({ result, start, end, roomName }: DecisionPanelProps) {
  if (result.decision === null) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
        <p className="text-sm text-slate-500">
          Pick a room and time range above to see availability.
        </p>
      </div>
    );
  }

  const available = result.decision === "available";

  return (
    <div
      className={`rounded-xl border-2 p-4 transition-all ${
        available
          ? "border-emerald-300 bg-emerald-50"
          : "border-red-300 bg-red-50"
      }`}
    >
      <div className="flex items-center gap-2.5">
        {available ? (
          <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
        ) : (
          <XCircle className="w-6 h-6 text-red-600 shrink-0" />
        )}
        <div>
          <p
            className={`text-lg font-bold ${
              available ? "text-emerald-700" : "text-red-700"
            }`}
          >
            {available ? "Available" : "Unavailable"}
          </p>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Confirmed by booking rules
          </p>
          <p className="text-xs text-slate-600">
            {roomName ?? "No room selected"} · {minutesToLabel(start)}–{minutesToLabel(end)}
          </p>
        </div>
      </div>

      {result.reasons.length > 0 && (
        <ul className="mt-3 space-y-1">
          {result.reasons.map((r, i) => (
            <li key={i} className="text-sm text-red-700 flex items-start gap-1.5">
              <span className="mt-1.5 w-1 h-1 rounded-full bg-red-500 shrink-0" />
              {r}
            </li>
          ))}
        </ul>
      )}

      {available && (
        <p className="mt-2 text-sm text-emerald-700">
          This time slot is open and meets all booking rules.
        </p>
      )}
    </div>
  );
}
