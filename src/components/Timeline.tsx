import type { Booking, Room } from "../types";
import { minutesToLabel } from "../utils";

interface TimelineProps {
  room: Room | null;
  bookings: Booking[];
  checkStart: number;
  checkEnd: number;
  currentTime: number;
}

export function Timeline({ room, bookings, checkStart, checkEnd, currentTime }: TimelineProps) {
  const roomBookings = room
    ? bookings.filter((b) => b.roomId === room.id)
    : [];

  const hours = Array.from({ length: 25 }, (_, i) => i * 60); // 0..1440

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-800 mb-1">
        Today's Schedule
        {room && <span className="text-slate-400 font-normal"> — {room.name}</span>}
      </h3>
      <p className="text-xs text-slate-400 mb-3">
        Blue = existing bookings · Amber = your requested slot · Dashed line = current time
      </p>

      {/* Timeline track */}
      <div className="relative h-14 rounded-lg bg-slate-100 overflow-hidden">
        {/* Hour gridlines */}
        {hours.map((m) => (
          <div
            key={m}
            className="absolute top-0 bottom-0 border-l border-slate-200"
            style={{ left: `${(m / 1440) * 100}%` }}
          />
        ))}

        {/* Existing bookings */}
        {roomBookings.map((b) => (
          <div
            key={b.id}
            className="absolute top-1 bottom-1 rounded bg-sky-500/80 text-[9px] text-white px-1 flex items-center overflow-hidden whitespace-nowrap"
            style={{
              left: `${(b.start / 1440) * 100}%`,
              width: `${((b.end - b.start) / 1440) * 100}%`,
            }}
            title={`${b.title} (${minutesToLabel(b.start)}–${minutesToLabel(b.end)})`}
          >
            {b.title}
          </div>
        ))}

        {/* Requested slot */}
        {room && checkStart < checkEnd && (
          <div
            className="absolute top-1 bottom-1 rounded border-2 border-amber-500 bg-amber-400/40 flex items-center justify-center text-[9px] font-bold text-amber-800 overflow-hidden"
            style={{
              left: `${(checkStart / 1440) * 100}%`,
              width: `${((checkEnd - checkStart) / 1440) * 100}%`,
            }}
          >
            Requested
          </div>
        )}

        {/* Current time marker */}
        <div
          className="absolute top-0 bottom-0 border-l-2 border-dashed border-rose-500 z-10"
          style={{ left: `${(currentTime / 1440) * 100}%` }}
          title={`Now: ${minutesToLabel(currentTime)}`}
        />
      </div>

      {/* Hour labels */}
      <div className="relative h-4 mt-0.5">
        {[0, 6, 12, 18, 24].map((h) => (
          <span
            key={h}
            className="absolute text-[10px] text-slate-400 tabular-nums -translate-x-1/2"
            style={{ left: `${(h * 60 / 1440) * 100}%` }}
          >
            {String(h).padStart(2, "0")}:00
          </span>
        ))}
      </div>
    </div>
  );
}
