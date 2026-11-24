import { useState, type FormEvent } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Lock, Unlock, PlayCircle } from "lucide-react";
import { ACCEPTANCE_CASES, CONTRACT_BOOKINGS, CONTRACT_ROOM, DEFAULT_NOW } from "../contract/data";
import { bookingsFingerprint, checkRoom, type RoomCheckResult } from "../contract/roomContract";

/**
 * Lesson 12 UI. Presentation only: it collects raw form values, calls `checkRoom`
 * (src/contract/roomContract.ts) and renders the result. No rule lives in this file.
 */
export function RoomContractChecker() {
  const [now, setNow] = useState(DEFAULT_NOW);
  const [startTime, setStartTime] = useState("12:00");
  const [duration, setDuration] = useState("60");
  const [blocked, setBlocked] = useState(false);
  const [result, setResult] = useState<RoomCheckResult | null>(null);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setResult(checkRoom({ startTime, durationMinutes: duration, blocked, now }, CONTRACT_BOOKINGS));
  };
  const touched = () => setResult(null);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
      <div className="lg:col-span-3 space-y-5">
        <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">{CONTRACT_ROOM.name}</h2>
              <p className="text-xs text-slate-500">
                {CONTRACT_ROOM.building} · {CONTRACT_ROOM.capacity} seats · fictional room
              </p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none rounded-lg border border-slate-200 px-3 py-1.5">
              <input
                id="blocked"
                type="checkbox"
                checked={blocked}
                onChange={(e) => {
                  setBlocked(e.target.checked);
                  touched();
                }}
                className="w-4 h-4 accent-red-600"
              />
              {blocked ? <Lock className="w-4 h-4 text-red-600" /> : <Unlock className="w-4 h-4 text-emerald-600" />}
              <span className="text-sm text-slate-700">Room blocked</span>
            </label>
          </div>

          <form onSubmit={onSubmit} noValidate className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Current time (simulated)" htmlFor="now">
              <input id="now" type="time" value={now} onChange={(e) => { setNow(e.target.value); touched(); }} className={inputCls} />
            </Field>
            <Field label="Start time" htmlFor="start-time">
              <input id="start-time" type="time" value={startTime} onChange={(e) => { setStartTime(e.target.value); touched(); }} className={inputCls} />
            </Field>
            <Field label="Duration (minutes, 1–120)" htmlFor="duration">
              <input
                id="duration"
                type="number"
                inputMode="numeric"
                min={1}
                max={120}
                step={1}
                value={duration}
                onChange={(e) => { setDuration(e.target.value); touched(); }}
                className={inputCls}
              />
            </Field>
            <button
              type="submit"
              className="sm:col-span-3 w-full rounded-lg bg-sky-600 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 shadow-sm"
            >
              Check availability
            </button>
          </form>

          <div className="mt-4" role="status" aria-live="polite">
            {result ? <ResultCard result={result} /> : (
              <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-400">
                Choose a start time and duration, then press “Check availability”.
              </p>
            )}
          </div>
        </section>

        <AcceptancePanel />
      </div>

      <div className="lg:col-span-2 space-y-5">
        <BookingsTable />
        <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800 mb-2">Acceptance criteria</h2>
          <ul className="space-y-1.5 text-xs text-slate-600">
            <li><b>AC1</b> Start time must be in the future.</li>
            <li><b>AC2</b> Duration is more than 0 and at most 120 minutes.</li>
            <li><b>AC3</b> Overlap with a booking → Unavailable (touching is OK).</li>
            <li><b>AC4</b> Blocked room → Unavailable.</li>
            <li><b>AC5</b> Clear decision; bookings are never changed.</li>
            <li><b>AC6</b> Invalid input gets an understandable message.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm tabular-nums text-slate-800 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200";

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

function ResultCard({ result }: { result: RoomCheckResult }) {
  const style = {
    AVAILABLE: { box: "border-emerald-300 bg-emerald-50", text: "text-emerald-700", Icon: CheckCircle2, title: "Available" },
    UNAVAILABLE: { box: "border-red-300 bg-red-50", text: "text-red-700", Icon: XCircle, title: "Unavailable" },
    INVALID_INPUT: { box: "border-amber-300 bg-amber-50", text: "text-amber-800", Icon: AlertTriangle, title: "Check your input" },
  }[result.status];
  return (
    <div data-testid="result" data-status={result.status} data-code={result.reasonCode} className={`rounded-xl border-2 p-4 ${style.box}`}>
      <div className="flex items-center gap-2.5">
        <style.Icon className={`w-6 h-6 shrink-0 ${style.text}`} />
        <p className={`text-lg font-bold ${style.text}`} data-testid="result-title">{style.title}</p>
      </div>
      <p className={`mt-2 text-sm ${style.text}`} data-testid="result-message">{result.message}</p>
      <p className="mt-2 text-[11px] font-mono text-slate-500 break-words">
        available: {String(result.available)} · reasonCode: {result.reasonCode}
        {result.interval ? ` · ${result.interval.start}–${result.interval.end}` : ""}
      </p>
    </div>
  );
}

function BookingsTable() {
  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-800 mb-2">Existing bookings (read-only)</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-slate-500"><th className="py-1">ID</th><th>Title</th><th className="text-right">Time</th></tr>
        </thead>
        <tbody>
          {CONTRACT_BOOKINGS.map((b) => (
            <tr key={b.id} className="border-t border-slate-100">
              <td className="py-1.5 text-slate-500">{b.id}</td>
              <td className="text-slate-800">{b.title}</td>
              <td className="text-right tabular-nums text-slate-700">{b.start}–{b.end}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] font-mono text-slate-500" data-testid="fingerprint">{bookingsFingerprint(CONTRACT_BOOKINGS)}</p>
    </section>
  );
}

interface Row { id: string; title: string; expected: string; observed: string; pass: boolean }

/** Runs the shared test inputs T1–T7 through the same `checkRoom`, then T8 (bookings unchanged). */
function runAcceptance(): Row[] {
  const before = bookingsFingerprint(CONTRACT_BOOKINGS);
  const rows: Row[] = ACCEPTANCE_CASES.map((c) => {
    const r = checkRoom(c.input, CONTRACT_BOOKINGS);
    return {
      id: c.id,
      title: c.title,
      expected: `${c.expectStatus} / ${c.expectCode}`,
      observed: `${r.status} / ${r.reasonCode}`,
      pass: r.status === c.expectStatus && r.reasonCode === c.expectCode,
    };
  });
  const after = bookingsFingerprint(CONTRACT_BOOKINGS);
  rows.push({ id: "T8", title: "Bookings unchanged after T1–T7", expected: before, observed: after, pass: before === after });
  return rows;
}

function AcceptancePanel() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const passed = rows?.filter((r) => r.pass).length ?? 0;
  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-800">Acceptance tests T1–T8</h2>
        <button
          type="button"
          onClick={() => setRows(runAcceptance())}
          className="flex items-center gap-1.5 rounded-lg border border-sky-300 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-50"
        >
          <PlayCircle className="w-4 h-4" /> Run T1–T8
        </button>
      </div>
      {rows && (
        <>
          <p className="mt-2 text-sm font-semibold text-slate-700" data-testid="acceptance-summary">{passed} / {rows.length} passed</p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[520px] text-xs">
              <thead>
                <tr className="text-left text-slate-500"><th className="py-1">Test</th><th>Case</th><th>Expected</th><th>Observed</th><th>Result</th></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 align-top">
                    <td className="py-1.5 font-semibold">{r.id}</td>
                    <td className="pr-2">{r.title}</td>
                    <td className="font-mono pr-2">{r.expected}</td>
                    <td className="font-mono pr-2">{r.observed}</td>
                    <td className={r.pass ? "text-emerald-700 font-semibold" : "text-red-700 font-semibold"}>{r.pass ? "PASS" : "FAIL"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
