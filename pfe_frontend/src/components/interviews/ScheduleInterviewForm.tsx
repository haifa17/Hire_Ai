"use client";

import { useEffect, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import type { AvailabilityBusySlot } from "@/domain/models/Interview";
import {
  scheduleInterviewSchema,
  type ScheduleInterviewValues,
} from "@/features/interviews/schemas/interviewSchema";
import { Button } from "@/components/ui/Button";
import { AvailabilityCalendar } from "./AvailabilityCalendar";
import { TimeSlotSelector } from "./TimeSlotSelector";
import { InterviewMessageEditor } from "./InterviewMessageEditor";

type ScheduleInterviewFormProps = {
  busySlots: AvailabilityBusySlot[];
  onSubmit: (values: ScheduleInterviewValues) => Promise<void> | void;
  onDateChange?: (date: string) => void;
  isSubmitting?: boolean;
  initialValues?: Partial<ScheduleInterviewValues>;
};

function getTomorrowIsoDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

function getBusyMapByDate(slots: AvailabilityBusySlot[]) {
  return slots.reduce<Record<string, number>>((acc, slot) => {
    const date = new Date(slot.startsAt).toISOString().slice(0, 10);
    acc[date] = (acc[date] ?? 0) + 1;
    return acc;
  }, {});
}

export function ScheduleInterviewForm({
  busySlots,
  onSubmit,
  onDateChange,
  isSubmitting,
  initialValues,
}: ScheduleInterviewFormProps) {
  const form = useForm<ScheduleInterviewValues>({
    resolver: zodResolver(scheduleInterviewSchema) as Resolver<ScheduleInterviewValues>,
    defaultValues: {
      title: initialValues?.title ?? "",
      interviewType: initialValues?.interviewType ?? "VIDEO",
      interviewDate: initialValues?.interviewDate ?? getTomorrowIsoDate(),
      interviewTime: initialValues?.interviewTime ?? "",
      duration: initialValues?.duration ?? 60,
      message: initialValues?.message ?? "",
      sendInvitation: initialValues?.sendInvitation ?? true,
      notes: initialValues?.notes ?? "",
    },
  });

  const selectedDate = form.watch("interviewDate");
  const duration = form.watch("duration");
  const busyMap = useMemo(() => getBusyMapByDate(busySlots), [busySlots]);

  useEffect(() => {
    if (onDateChange && selectedDate) {
      onDateChange(selectedDate);
    }
  }, [onDateChange, selectedDate]);

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Schedule interview
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Define interview details and choose an available recruiter slot.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label
              className="text-sm font-medium text-slate-700"
              htmlFor="title"
            >
              Interview title
            </label>
            <input
              id="title"
              type="text"
              maxLength={120}
              {...form.register("title")}
              className="form-input mt-1"
            />
            {form.formState.errors.title ? (
              <p className="mt-1 text-xs text-rose-600">
                {form.formState.errors.title.message}
              </p>
            ) : (
              <p className="mt-1 text-xs text-slate-500">3 to 120 characters.</p>
            )}
          </div>

          <div>
            <label
              className="text-sm font-medium text-slate-700"
              htmlFor="interviewType"
            >
              Interview type
            </label>
            <select
              id="interviewType"
              {...form.register("interviewType")}
              className="form-select mt-1"
            >
              <option value="VIDEO">Video</option>
              <option value="ONSITE">On-site</option>
              <option value="PHONE">Phone</option>
            </select>
          </div>

          <div>
            <label
              className="text-sm font-medium text-slate-700"
              htmlFor="duration"
            >
              Duration (minutes)
            </label>
            <input
              id="duration"
              type="number"
              min={15}
              max={480}
              step={15}
              {...form.register("duration")}
              className="form-input mt-1"
            />
            {form.formState.errors.duration ? (
              <p className="mt-1 text-xs text-rose-600">
                {form.formState.errors.duration.message}
              </p>
            ) : (
              <p className="mt-1 text-xs text-slate-500">
                Between 15 and 480 minutes (8 hours).
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 pt-6">
            <input
              id="sendInvitation"
              type="checkbox"
              {...form.register("sendInvitation")}
              className="h-4 w-4 rounded border-slate-300 text-teal-600"
            />
            <label htmlFor="sendInvitation" className="text-sm text-slate-700">
              Send interview invitation automatically
            </label>
          </div>
        </div>
      </div>

      <AvailabilityCalendar
        selectedDate={selectedDate}
        onSelectDate={(date) => {
          form.setValue("interviewDate", date, { shouldValidate: true });
          form.setValue("interviewTime", "", { shouldValidate: true });
        }}
        busySlotsByDate={busyMap}
      />

      <TimeSlotSelector
        date={selectedDate}
        selectedTime={form.watch("interviewTime")}
        duration={duration}
        busySlots={busySlots}
        onSelectTime={(time) =>
          form.setValue("interviewTime", time, { shouldValidate: true })
        }
      />
      <p className="text-xs text-rose-600">
        {form.formState.errors.interviewTime?.message}
      </p>

      <InterviewMessageEditor
        message={form.watch("message") ?? ""}
        notes={form.watch("notes") ?? ""}
        onMessageChange={(value) =>
          form.setValue("message", value, { shouldValidate: true })
        }
        onNotesChange={(value) =>
          form.setValue("notes", value, { shouldValidate: true })
        }
      />

      <div className="flex items-center justify-end gap-3">
        <Button type="submit" isLoading={isSubmitting}>
          Save interview
        </Button>
      </div>
    </form>
  );
}
