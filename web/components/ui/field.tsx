/** One form field: label, optional hint, control. Same look in every feature. */
export function Field({ label, hint, htmlFor, children }: { label: string; hint?: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={htmlFor} className="text-xs font-medium text-white/85">{label}</label>
        {hint && <span className="text-[11px] text-muted">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export const inputClass =
  "w-full rounded-lg border border-line bg-[#0f1017] px-3 py-2 text-sm text-white outline-none placeholder:text-muted/70 focus:border-white/30";
