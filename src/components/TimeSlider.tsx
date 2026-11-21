interface TimeSliderProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  currentTime: number;
}

import { minutesToLabel, labelToMinutes } from "../utils";

export function TimeSlider({ label, value, onChange, min, max, currentTime }: TimeSliderProps) {
  const isBeforeCurrent = value <= currentTime && label === "Start";

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        <div className="flex items-center gap-2">
          <span
            className={`text-lg font-semibold tabular-nums ${
              isBeforeCurrent ? "text-red-600" : "text-slate-900"
            }`}
          >
            {minutesToLabel(value)}
          </span>
          <input
            type="time"
            value={minutesToLabel(value)}
            onChange={(e) => {
              const m = labelToMinutes(e.target.value);
              if (!Number.isNaN(m)) onChange(m);
            }}
            aria-label={`${label} exact time`}
            className="text-sm tabular-nums border border-slate-200 rounded-md px-1.5 py-1 text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={15}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-200 accent-sky-600"
      />
    </div>
  );
}
