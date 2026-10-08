import React from "react";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface ApplicationHeaderProps {
  title: string;
  companyName: string;
  status?: string;
  onBack: () => void;
  onWithdraw: () => void;
  onMessage: () => void;
}

function getStatusBadgeStyles(status: string) {
  switch (status?.toUpperCase()) {
    case "ACCEPTED":
      return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
    case "INTERVIEW":
      return "bg-blue-50 text-blue-700 ring-blue-600/20";
    case "SHORTLISTED":
      return "bg-purple-50 text-purple-700 ring-purple-600/20";
    case "REVIEWED":
      return "bg-amber-50 text-amber-700 ring-amber-600/20";
    case "REJECTED":
      return "bg-rose-50 text-rose-700 ring-rose-600/20";
    default:
      return "bg-slate-50 text-slate-700 ring-slate-600/10";
  }
}

export const ApplicationHeader: React.FC<ApplicationHeaderProps> = ({
  title,
  companyName,
  status = "PENDING",
  onBack,
  onWithdraw,
  onMessage,
}) => {
  return (
    <header className="flex flex-col gap-4 border-b border-slate-200/60 pb-6 lg:flex-row lg:items-center lg:justify-between">
      {/* Back button and Job Title info */}
      <div className="flex flex-wrap items-start gap-4 sm:flex-nowrap">
        <button
          type="button"
          onClick={onBack}
          className="group inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-2xs hover:bg-slate-50 hover:text-slate-700 transition-all duration-200 cursor-pointer"
          aria-label="Go Back"
        >
          <ArrowLeft className="h-5 w-5 transition-transform duration-200 group-hover:-translate-x-0.5" />
        </button>

        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent sm:text-3xl">
              {title}
            </h1>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset tracking-wide",
                getStatusBadgeStyles(status)
              )}
            >
              {status}
            </span>
          </div>
          <p className="text-sm font-bold text-slate-500 tracking-wide uppercase">
            {companyName}
          </p>
        </div>
      </div>

      {/* Primary and secondary page actions */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          onClick={onWithdraw}
          className="border-slate-200 text-slate-600 hover:border-rose-200 hover:text-rose-600 hover:bg-rose-50/50 transition-all duration-200 cursor-pointer shadow-2xs"
        >
          Withdraw
        </Button>
        <Button
          onClick={onMessage}
          className="group gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 border-none text-white shadow-md hover:from-indigo-700 hover:to-blue-700 transition-all duration-200 cursor-pointer flex items-center justify-center"
        >
          <MessageSquare className="h-4.5 w-4.5 transition-transform duration-200 group-hover:scale-110" />
          Message Recruiter
        </Button>
      </div>
    </header>
  );
};
