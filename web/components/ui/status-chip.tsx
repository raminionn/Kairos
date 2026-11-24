import type { Job } from "@/lib/api-types";

const DOT: Record<Job["status"], string> = {
  queued: "bg-white/40",
  running: "bg-lime animate-pulse",
  done: "bg-emerald-400",
  failed: "bg-red-400",
};

const TEXT: Record<Job["status"], string> = {
  queued: "text-muted",
  running: "text-white/85",
  done: "text-muted",
  failed: "text-red-400",
};

/** `short`: no error text (for lists and headers; the page shows the error once in full). */
export function StatusChip({ job, short = false }: { job: Job; short?: boolean }) {
  const text =
    job.status === "running" ? `${job.stage ?? "running"} · ${job.progress}%`
    : job.status === "failed" ? (short ? "failed" : `failed · ${job.error ?? "unknown error"}`)
    : job.status;
  return (
    <span title={text} className={`inline-flex max-w-full min-w-0 items-center gap-1.5 text-xs ${TEXT[job.status]}`}>
      <span className={`size-1.5 shrink-0 rounded-full ${DOT[job.status]}`} aria-hidden />
      <span className="truncate">{text}</span>
    </span>
  );
}
