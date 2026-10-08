import { useState } from "react";
import type { AvailabilityBusySlot } from "@/domain/models/Interview";
import { cn } from "@/lib/utils";

type TimeSlotSelectorProps = {
  date: string;
  selectedTime: string;
  duration: number;
  busySlots: AvailabilityBusySlot[];
  onSelectTime: (time: string) => void;
};

function createTimeSlots() {
  const slots: string[] = [];
  for (let hour = 9; hour < 18; hour += 1) {
    for (const minutes of [0, 30]) {
      const hh = String(hour).padStart(2, "0");
      const mm = String(minutes).padStart(2, "0");
      slots.push(`${hh}:${mm}`);
    }
  }
  return slots;
}

function isOverlapping(
  startsAt: Date,
  duration: number,
  busySlots: AvailabilityBusySlot[],
) {
  const endAt = new Date(startsAt.getTime() + duration * 60_000);

  return busySlots.some((slot) => {
    const busyStart = new Date(slot.startsAt);
    const busyEnd = new Date(slot.endsAt);

    return startsAt < busyEnd && endAt > busyStart;
  });
}

export function TimeSlotSelector({
  date,
  selectedTime,
  duration,
  busySlots,
  onSelectTime,
}: TimeSlotSelectorProps) {
  const allSlots = createTimeSlots();
  const [now] = useState(() => Date.now());

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-semibold text-slate-900">
        Available time slots
      </p>
      <p className="mt-1 text-xs text-slate-500">
        Slots are filtered to avoid conflicts with existing interviews.
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {allSlots.map((slot) => {
          const startsAt = new Date(`${date}T${slot}:00`);
          const inPast = startsAt.getTime() <= now;
          const conflict = isOverlapping(startsAt, duration, busySlots);
          const disabled = inPast || conflict;
          const selected = selectedTime === slot;

          return (
            <button
              key={slot}
              type="button"
              disabled={disabled}
              onClick={() => onSelectTime(slot)}
              className={cn(
                "rounded-lg border px-2 py-2 text-xs font-medium transition",
                selected
                  ? "border-teal-600 bg-teal-600 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                disabled &&
                  "cursor-not-allowed border-slate-100 bg-slate-100 text-slate-400",
              )}
            >
              {slot}
            </button>
          );
        })}
      </div>
    </div>
  );
}
