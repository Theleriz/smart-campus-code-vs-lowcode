import { DoorClosed, DoorOpen, Ban, Users } from "lucide-react";
import type { Room } from "../types";

interface RoomCardProps {
  room: Room;
  selected: boolean;
  onSelect: () => void;
}

export function RoomCard({ room, selected, onSelect }: RoomCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`text-left rounded-xl border-2 p-3 transition-all w-full ${
        selected
          ? "border-sky-600 bg-sky-50 shadow-sm"
          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
      } ${room.blocked ? "opacity-75" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {room.blocked ? (
            <Ban className="w-4 h-4 text-red-500 shrink-0" />
          ) : (
            <DoorOpen className="w-4 h-4 text-sky-600 shrink-0" />
          )}
          <span className="font-medium text-sm text-slate-900 truncate">{room.name}</span>
        </div>
        {selected && (
          <span className="text-[10px] font-bold uppercase tracking-wide text-sky-700 shrink-0">
            Selected
          </span>
        )}
      </div>
      <div className="mt-1.5 flex items-center gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <DoorClosed className="w-3 h-3" />
          {room.building}
        </span>
        <span className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          {room.capacity}
        </span>
        {room.blocked && (
          <span className="text-red-600 font-medium">Blocked</span>
        )}
      </div>
    </button>
  );
}
