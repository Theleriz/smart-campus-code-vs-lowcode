import { useMemo, useState } from "react";
import { Clock, CalendarDays, Search, RotateCcw } from "lucide-react";
import { ROOMS, INITIAL_BOOKINGS } from "./data";
import type { Booking, Room } from "./types";
import {
  MINUTES_PER_DAY,
  evaluateAvailability,
  labelToMinutes,
  minutesToLabel,
} from "./utils";
import { RoomCard } from "./components/RoomCard";
import { TimeSlider } from "./components/TimeSlider";
import { DecisionPanel } from "./components/DecisionPanel";
import { Timeline } from "./components/Timeline";
import { ExplanationPanel } from "./components/ExplanationPanel";
import { buildExplainRequest } from "./explain/contract";
import { createHttpAdapter, createMockAdapter, type SimulatedFailure } from "./explain/adapters";

type Engine = "mock" | "llm";

function App() {
  const [bookings] = useState<Booking[]>(INITIAL_BOOKINGS);
  const [currentTime, setCurrentTime] = useState(570); // 09:30
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [start, setStart] = useState(600); // 10:00
  const [end, setEnd] = useState(660);     // 11:00
  const [hasChecked, setHasChecked] = useState(false);
  const [engine, setEngine] = useState<Engine>("mock");
  const [simulate, setSimulate] = useState<SimulatedFailure>("none");

  const selectedRoom: Room | null = useMemo(
    () => ROOMS.find((r) => r.id === selectedRoomId) ?? null,
    [selectedRoomId],
  );

  // The deterministic rule engine is the only source of the decision.
  const result = useMemo(
    () => evaluateAvailability(selectedRoom, start, end, currentTime, bookings),
    [selectedRoom, start, end, currentTime, bookings],
  );

  // Practice #11: optional explanation of that decision (mock by default, live model via the server).
  const adapter = useMemo(
    () => (engine === "llm" ? createHttpAdapter() : createMockAdapter({ simulate })),
    [engine, simulate],
  );
  const explainRequest = selectedRoom ? buildExplainRequest(selectedRoom.name, start, end, result) : null;

  const duration = end - start;
  const canCheck = selectedRoom !== null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/40 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-5 sm:py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-600 flex items-center justify-center shadow-sm">
              <CalendarDays className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
                Smart Campus
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">Room Availability Checker</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-100 rounded-lg px-3 py-1.5">
            <Clock className="w-4 h-4 text-sky-600" />
            <label htmlFor="current-time" className="text-xs text-slate-500 font-medium">
              Now
            </label>
            <input
              id="current-time"
              type="time"
              value={minutesToLabel(currentTime)}
              onChange={(e) => {
                const m = labelToMinutes(e.target.value);
                if (!Number.isNaN(m)) setCurrentTime(m);
                setHasChecked(false);
              }}
              className="tabular-nums font-medium bg-transparent border-none outline-none cursor-pointer text-slate-700"
            />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Left column: room selection + time */}
          <div className="lg:col-span-3 space-y-5">
            {/* Room selection */}
            <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-800 mb-3">
                1. Select a Room
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {ROOMS.map((room) => (
                  <RoomCard
                    key={room.id}
                    room={room}
                    selected={room.id === selectedRoomId}
                    onSelect={() => {
                      setSelectedRoomId(room.id);
                      setHasChecked(false);
                    }}
                  />
                ))}
              </div>
            </section>

            {/* Time selection */}
            <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-800">
                  2. Choose a Time Range
                </h2>
                <span className="text-xs text-slate-500 bg-slate-100 rounded-md px-2 py-1 tabular-nums">
                  Duration: {duration} min
                </span>
              </div>

              <div className="space-y-4">
                <TimeSlider
                  label="Start"
                  value={start}
                  onChange={(v) => {
                    setStart(v);
                    if (v >= end) setEnd(Math.min(v + 30, MINUTES_PER_DAY));
                    setHasChecked(false);
                  }}
                  min={0}
                  max={MINUTES_PER_DAY}
                  currentTime={currentTime}
                />
                <TimeSlider
                  label="End"
                  value={end}
                  onChange={(v) => {
                    setEnd(v);
                    setHasChecked(false);
                  }}
                  min={0}
                  max={MINUTES_PER_DAY}
                  currentTime={currentTime}
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  { label: "30 min",  s: 600, e: 630 },
                  { label: "60 min",  s: 600, e: 660 },
                  { label: "90 min",  s: 600, e: 690 },
                  { label: "120 min", s: 600, e: 720 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setStart(preset.s);
                      setEnd(preset.e);
                      setHasChecked(false);
                    }}
                    className="text-xs font-medium px-2.5 py-1 rounded-md border border-slate-200 text-slate-600 hover:border-sky-400 hover:text-sky-700 hover:bg-sky-50 transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </section>
          </div>

          {/* Right column: result */}
          <div className="lg:col-span-2 space-y-5">
            <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-800">3. Check Availability</h2>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRoomId(null);
                    setStart(600);
                    setEnd(660);
                    setHasChecked(false);
                  }}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </button>
              </div>

              <button
                type="button"
                disabled={!canCheck}
                onClick={() => setHasChecked(true)}
                className={`w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${
                  canCheck
                    ? "bg-sky-600 text-white hover:bg-sky-700 shadow-sm"
                    : "bg-slate-100 text-slate-400 cursor-not-allowed"
                }`}
              >
                <Search className="w-4 h-4" />
                Check Availability
              </button>
              {!canCheck && (
                <p className="mt-2 text-xs text-slate-400 text-center">
                  Select a room first.
                </p>
              )}

              <div className="mt-4">
                {hasChecked ? (
                  <DecisionPanel
                    result={result}
                    start={start}
                    end={end}
                    roomName={selectedRoom?.name ?? null}
                  />
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center">
                    <p className="text-sm text-slate-400">
                      Press the button to see if this room and time are available.
                    </p>
                  </div>
                )}
              </div>

              {hasChecked && explainRequest && (
                <div className="mt-4 border-t border-slate-100 pt-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label htmlFor="engine" className="text-xs font-medium text-slate-600">
                      Explanation engine
                    </label>
                    <select
                      id="engine"
                      value={engine}
                      onChange={(e) => setEngine(e.target.value as Engine)}
                      className="text-xs border border-slate-200 rounded-md px-2 py-1 text-slate-700 bg-white"
                    >
                      <option value="mock">Mock AI (offline, free)</option>
                      <option value="llm">Live LLM (server)</option>
                    </select>
                  </div>
                  {engine === "mock" && (
                    <details className="mt-2 text-xs text-slate-500">
                      <summary className="cursor-pointer select-none">Test controls (simulate failures)</summary>
                      <label htmlFor="simulate" className="sr-only">Simulated failure</label>
                      <select
                        id="simulate"
                        value={simulate}
                        onChange={(e) => setSimulate(e.target.value as SimulatedFailure)}
                        className="mt-1.5 w-full border border-slate-200 rounded-md px-2 py-1 text-slate-700 bg-white"
                      >
                        <option value="none">No failure</option>
                        <option value="timeout">Timeout (no answer)</option>
                        <option value="error">API error (HTTP 500)</option>
                        <option value="unavailable">Missing API key</option>
                        <option value="invalid-output">Hallucinated answer</option>
                      </select>
                    </details>
                  )}
                  <ExplanationPanel
                    key={`${JSON.stringify(explainRequest)}|${engine}|${simulate}`}
                    request={explainRequest}
                    adapter={adapter}
                  />
                </div>
              )}
            </section>

            {/* Rules summary */}
            <section className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-800 mb-2">Booking Rules</h2>
              <ul className="space-y-1.5 text-xs text-slate-500">
                <li>• Start must be after the current time and before end.</li>
                <li>• Both times must fall within 00:00–24:00.</li>
                <li>• Bookings may not exceed 120 minutes.</li>
                <li>• Blocked rooms cannot be booked.</li>
                <li>• No overlap with existing bookings (touching is OK).</li>
              </ul>
            </section>
          </div>
        </div>

        {/* Timeline spans full width */}
        <div className="mt-5">
          <Timeline
            room={selectedRoom}
            bookings={bookings}
            checkStart={start}
            checkEnd={end}
            currentTime={currentTime}
          />
        </div>
      </main>

      <footer className="max-w-5xl mx-auto px-4 pb-8">
        <p className="text-center text-xs text-slate-400">
          Fictional sample data · No bookings are actually created or modified.
        </p>
      </footer>
    </div>
  );
}

export default App;
