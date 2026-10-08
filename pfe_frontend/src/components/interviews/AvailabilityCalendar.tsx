import { cn } from "@/lib/utils";

type AvailabilityCalendarProps = {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  busySlotsByDate: Record<string, number>;
};

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function AvailabilityCalendar({
  selectedDate,
  onSelectDate,
  busySlotsByDate,
}: AvailabilityCalendarProps) {
  const today = new Date();
  const days = Array.from({ length: 14 }, (_, index) => {
    const next = new Date(today);
    next.setDate(today.getDate() + index);
    return next;
  });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-semibold text-slate-900">
        Availability calendar
      </p>
      <p className="mt-1 text-xs text-slate-500">
        Pick a day, then select an available slot.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">
        {days.map((day) => {
          const iso = toIsoDate(day);
          const isSelected = iso === selectedDate;
          const busyCount = busySlotsByDate[iso] ?? 0;

          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelectDate(iso)}
              className={cn(
                "rounded-xl border px-3 py-2 text-left transition",
                isSelected
                  ? "border-teal-600 bg-teal-50"
                  : "border-slate-200 bg-white hover:border-slate-300",
              )}
            >
              <div className="text-xs uppercase tracking-wide text-slate-500">
                {day.toLocaleDateString(undefined, { weekday: "short" })}
              </div>
              <div className="text-sm font-semibold text-slate-900">
                {day.toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {busyCount} busy slots
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
