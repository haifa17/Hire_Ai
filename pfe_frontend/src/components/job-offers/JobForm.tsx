"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AiGenerateModal } from "@/components/job-offers/AiGenerateModal";
import { RichTextEditor } from "@/components/job-offers/RichTextEditor";
import { SalaryInput } from "@/components/job-offers/SalaryInput";
import { SkillsTagsInput } from "@/components/job-offers/SkillsTagsInput";
import {
  type JobOfferFormValues,
  jobOfferSchema,
} from "@/features/jobs/schemas/jobOfferSchema";

const STEP_TITLES = [
  "Basic Info",
  "Description",
  "Requirements",
  "Salary & Benefits",
  "Preview & Publish",
] as const;

const STEP_FIELDS: ReadonlyArray<ReadonlyArray<keyof JobOfferFormValues>> = [
  [
    "title",
    "department",
    "employmentType",
    "workplaceType",
    "location",
    "country",
    "city",
    "experienceLevel",
    "educationLevel",
  ],
  ["description", "responsibilities"],
  ["requirements", "requiredSkills", "preferredSkills", "languages"],
  [
    "salaryMin",
    "salaryMax",
    "currency",
    "openings",
    "deadline",
    "startDate",
    "benefits",
    "featured",
    "urgent",
  ],
  [],
];

interface JobFormProps {
  onSubmit: (data: JobOfferFormValues) => Promise<void>;
  isSubmitting?: boolean;
  initialValues?: Partial<JobOfferFormValues>;
}

const defaultValues: JobOfferFormValues = {
  title: "",
  department: "",
  employmentType: "FULL_TIME",
  workplaceType: "REMOTE",
  location: "",
  country: "",
  city: "",
  salaryMin: undefined,
  salaryMax: undefined,
  currency: "USD",
  experienceLevel: "MID",
  educationLevel: undefined,
  description: "",
  responsibilities: [],
  requirements: [],
  preferredSkills: [],
  requiredSkills: [],
  benefits: [],
  languages: [],
  openings: 1,
  deadline: "",
  startDate: "",
  featured: false,
  urgent: false,
};

export function JobForm({
  onSubmit,
  isSubmitting,
  initialValues,
}: Readonly<JobFormProps>) {
  const [step, setStep] = useState(0);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  const mergedDefaults = useMemo(
    () => ({ ...defaultValues, ...initialValues }),
    [initialValues],
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<JobOfferFormValues>({
    resolver: zodResolver(jobOfferSchema) as Resolver<JobOfferFormValues>,
    defaultValues: mergedDefaults,
  });

  const values = watch();

  const submit = async (data: JobOfferFormValues) => {
    try {
      await onSubmit(data);
      toast.success("Job offer saved.");
    } catch {
      toast.error("Could not save job offer.");
    }
  };

  const nextStep = async () => {
    const fieldsToValidate = STEP_FIELDS[step];
    const valid = await trigger(fieldsToValidate);
    if (!valid) {
      toast.error("Please fix form errors before continuing.");
      return;
    }
    setStep((current) => Math.min(current + 1, STEP_TITLES.length - 1));
  };

  const previousStep = () => {
    setStep((current) => Math.max(current - 1, 0));
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-gray-500">
              Step {step + 1} of {STEP_TITLES.length}
            </p>
            <h2 className="text-lg font-semibold text-gray-900">
              {STEP_TITLES[step]}
            </h2>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsAiModalOpen(true)}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Generate With AI
          </Button>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-blue-600 transition-all"
            style={{ width: `${((step + 1) / STEP_TITLES.length) * 100}%` }}
          />
        </div>
      </div>

      {step === 0 ? (
        <div className="grid gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm md:grid-cols-2">
          <Input
            label="Job title"
            helperText="3 to 120 characters."
            maxLength={120}
            error={errors.title?.message}
            {...register("title")}
          />
          <Input
            label="Department"
            helperText="Optional."
            maxLength={100}
            error={errors.department?.message}
            {...register("department")}
          />
          <div className="space-y-1.5">
            <label
              htmlFor="employmentType"
              className="text-sm font-medium text-gray-700"
            >
              Employment type
            </label>
            <select
              id="employmentType"
              className="form-select"
              {...register("employmentType")}
            >
              <option value="FULL_TIME">Full time</option>
              <option value="PART_TIME">Part time</option>
              <option value="CONTRACT">Contract</option>
              <option value="CDD">CDD</option>
              <option value="CDI">CDI</option>
              <option value="TEMPORARY">Temporary</option>
              <option value="INTERNSHIP">Internship</option>
              <option value="FREELANCE">Freelance</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="workplaceType"
              className="text-sm font-medium text-gray-700"
            >
              Workplace type
            </label>
            <select
              id="workplaceType"
              className="form-select"
              {...register("workplaceType")}
            >
              <option value="REMOTE">Remote</option>
              <option value="HYBRID">Hybrid</option>
              <option value="ONSITE">Onsite</option>
            </select>
          </div>
          <Input
            label="Location"
            error={errors.location?.message}
            {...register("location")}
          />
          <Input
            label="Country"
            error={errors.country?.message}
            {...register("country")}
          />
          <Input
            label="City"
            error={errors.city?.message}
            {...register("city")}
          />
          <div className="space-y-1.5">
            <label
              htmlFor="experienceLevel"
              className="text-sm font-medium text-gray-700"
            >
              Experience level
            </label>
            <select
              id="experienceLevel"
              className="form-select"
              {...register("experienceLevel")}
            >
              <option value="ENTRY">Entry</option>
              <option value="JUNIOR">Junior</option>
              <option value="MID">Mid</option>
              <option value="SENIOR">Senior</option>
              <option value="LEAD">Lead</option>
              <option value="EXECUTIVE">Executive</option>
            </select>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label
              htmlFor="educationLevel"
              className="text-sm font-medium text-gray-700"
            >
              Education level
            </label>
            <select
              id="educationLevel"
              className="form-select"
              {...register("educationLevel")}
            >
              <option value="">Not specified</option>
              <option value="HIGH_SCHOOL">High school</option>
              <option value="ASSOCIATE">Associate</option>
              <option value="BACHELOR">Bachelor</option>
              <option value="MASTER">Master</option>
              <option value="PHD">PhD</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <RichTextEditor
            label="Job description"
            value={values.description}
            onChange={(value) =>
              setValue("description", value, { shouldValidate: true })
            }
            error={errors.description?.message}
            helperText="At least 20 characters."
            placeholder="Describe the mission, team setup and impact expectations."
          />
          <SkillsTagsInput
            label="Responsibilities"
            values={values.responsibilities}
            onChange={(items) =>
              setValue("responsibilities", items, { shouldValidate: true })
            }
          />
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <SkillsTagsInput
            label="Requirements"
            values={values.requirements}
            onChange={(items) =>
              setValue("requirements", items, { shouldValidate: true })
            }
          />
          <SkillsTagsInput
            label="Required skills"
            values={values.requiredSkills}
            onChange={(items) =>
              setValue("requiredSkills", items, { shouldValidate: true })
            }
          />
          <SkillsTagsInput
            label="Preferred skills"
            values={values.preferredSkills}
            onChange={(items) =>
              setValue("preferredSkills", items, { shouldValidate: true })
            }
          />
          <SkillsTagsInput
            label="Languages"
            values={values.languages}
            onChange={(items) =>
              setValue("languages", items, { shouldValidate: true })
            }
          />
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <SalaryInput
            min={values.salaryMin}
            max={values.salaryMax}
            currency={values.currency}
            minError={errors.salaryMin?.message}
            maxError={errors.salaryMax?.message}
            onChange={(next) => {
              setValue("salaryMin", next.min, { shouldValidate: true });
              setValue("salaryMax", next.max, { shouldValidate: true });
              setValue("currency", next.currency ?? "USD", {
                shouldValidate: true,
              });
            }}
          />

          <div className="grid gap-4 md:grid-cols-3">
            <Input
              label="Openings"
              helperText="Number of positions to fill, at least 1."
              error={errors.openings?.message}
              type="number"
              min={1}
              value={values.openings}
              onChange={(event) =>
                setValue("openings", Number(event.target.value), {
                  shouldValidate: true,
                })
              }
            />
            <Input
              label="Deadline"
              helperText="Optional. Last day to apply."
              type="date"
              value={values.deadline ?? ""}
              onChange={(event) => setValue("deadline", event.target.value)}
            />
            <Input
              label="Start date"
              helperText="Optional."
              type="date"
              value={values.startDate ?? ""}
              onChange={(event) => setValue("startDate", event.target.value)}
            />
          </div>

          <SkillsTagsInput
            label="Benefits"
            values={values.benefits}
            onChange={(items) =>
              setValue("benefits", items, { shouldValidate: true })
            }
          />

          <div className="grid gap-3 md:grid-cols-2">
            <label className="inline-flex items-center gap-2 rounded-lg border border-gray-200 p-3 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={values.featured}
                onChange={(event) => setValue("featured", event.target.checked)}
              />
              <span>Mark as featured</span>
            </label>
            <label className="inline-flex items-center gap-2 rounded-lg border border-gray-200 p-3 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={values.urgent}
                onChange={(event) => setValue("urgent", event.target.checked)}
              />
              <span>Mark as urgent</span>
            </label>
          </div>
        </div>
      ) : null}

      {step === 4 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">Preview</h3>
          <p className="mt-2 text-sm text-gray-600">
            Review your job offer before publishing.
          </p>

          <div className="mt-4 space-y-4 text-sm text-gray-700">
            <div>
              <p className="font-semibold text-gray-900">{values.title}</p>
              <p>
                {values.city}, {values.country} • {values.workplaceType}
              </p>
            </div>
            <p>{values.description}</p>
            <div>
              <p className="font-medium">Responsibilities</p>
              <ul className="list-disc pl-5">
                {values.responsibilities.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-medium">Required skills</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {values.requiredSkills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={previousStep}
          disabled={step === 0}
        >
          Back
        </Button>

        {step < STEP_TITLES.length - 1 ? (
          <Button type="button" onClick={nextStep}>
            Next
          </Button>
        ) : (
          <Button type="submit" isLoading={isSubmitting}>
            Save Job Offer
          </Button>
        )}
      </div>

      <AiGenerateModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onApply={(generated) => {
          const applyText = (
            field: keyof JobOfferFormValues,
            value?: string,
          ) => {
            if (typeof value === "string" && value.trim().length > 0) {
              setValue(field, value, { shouldValidate: true });
            }
          };

          const applyEnum = (
            field: keyof JobOfferFormValues,
            value?: string | null,
          ) => {
            if (typeof value === "string" && value.trim().length > 0) {
              setValue(field, value as JobOfferFormValues[typeof field], {
                shouldValidate: true,
              });
            }
          };

          setValue("title", generated.title, { shouldValidate: true });
          setValue("description", generated.summary, { shouldValidate: true });
          setValue("responsibilities", generated.responsibilities, {
            shouldValidate: true,
          });
          setValue("requiredSkills", generated.requiredSkills, {
            shouldValidate: true,
          });
          setValue("benefits", generated.benefits, {
            shouldValidate: true,
          });
          setValue(
            "requirements",
            generated.requirements ?? generated.keywords,
            {
              shouldValidate: true,
            },
          );
          setValue("preferredSkills", generated.preferredSkills ?? [], {
            shouldValidate: true,
          });
          setValue("languages", generated.languages ?? [], {
            shouldValidate: true,
          });
          applyText("department", generated.department);
          applyText("location", generated.location);
          applyText("country", generated.country);
          applyText("city", generated.city);
          applyText("currency", generated.currency);
          if (
            typeof generated.salaryMin === "number" &&
            typeof generated.salaryMax === "number"
          ) {
            setValue("salaryMin", generated.salaryMin, {
              shouldValidate: true,
            });
            setValue("salaryMax", generated.salaryMax, {
              shouldValidate: true,
            });
          }
          if (
            typeof generated.openings === "number" &&
            generated.openings > 0
          ) {
            setValue("openings", generated.openings, { shouldValidate: true });
          }
          applyEnum("employmentType", generated.employmentType);
          applyEnum("workplaceType", generated.workplaceType);
          applyEnum("experienceLevel", generated.experienceLevel);
          applyEnum("educationLevel", generated.educationLevel);
          setValue("featured", generated.featured ?? false, {
            shouldValidate: true,
          });
          setValue("urgent", generated.urgent ?? false, {
            shouldValidate: true,
          });
        }}
      />
    </form>
  );
}
