export function OrDivider({ label }: { label: string }) {
  return (
    <div className="relative my-6" role="separator">
      <div className="absolute inset-0 flex items-center" aria-hidden="true">
        <div className="w-full border-t border-gray-200" />
      </div>
      <div className="relative flex justify-center text-xs">
        <span className="bg-white px-3 text-gray-400">{label}</span>
      </div>
    </div>
  );
}