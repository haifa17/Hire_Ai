import { z } from "zod";

// NOTE: zod validation messages below are intentionally left in English; wiring them through
// next-intl would require refactoring the calling form components (ScheduleInterviewForm.tsx) to
// map error codes to translated messages, which is out of scope for this pass.

export const interviewTypes = ["VIDEO", "ONSITE", "PHONE"] as const;

export const scheduleInterviewSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, "Interview title must be at least 3 characters")
      .max(120, "Interview title must be 120 characters or fewer"),
    interviewType: z.enum(interviewTypes),
    interviewDate: z.string().min(1, "Please select an interview date"),
    interviewTime: z.string().min(1, "Please select a time slot"),
    duration: z.coerce
      .number()
      .int("Duration must be a whole number")
      .min(15, "Duration must be at least 15 minutes")
      .max(480, "Duration cannot exceed 480 minutes (8 hours)"),
    message: z.string().trim().max(4000).optional().or(z.literal("")),
    sendInvitation: z.boolean(),
    notes: z.string().trim().max(4000).optional().or(z.literal("")),
  })
  .superRefine((value, ctx) => {
    const timestamp = new Date(
      `${value.interviewDate}T${value.interviewTime}:00`,
    );

    if (Number.isNaN(timestamp.getTime())) {
      ctx.addIssue({
        code: "custom",
        path: ["interviewTime"],
        message: "Invalid interview date/time",
      });
      return;
    }

    if (timestamp.getTime() <= Date.now()) {
      ctx.addIssue({
        code: "custom",
        path: ["interviewTime"],
        message: "Interview must be scheduled in the future",
      });
    }
  });

export type ScheduleInterviewValues = z.infer<typeof scheduleInterviewSchema>;
