import React from "react";

export default function Panel({
  children,
  className = "",
}: React.PropsWithChildren<{ className?: string }>) {
  return (
    <section
      className={`rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_8px_30px_rgba(2,6,23,0.04)] ${className}`}
    >
      {children}
    </section>
  );
}
