import type { Job } from "@/lib/api-types";

const STYLE: Record<Job["status"], string> = {
  queued: "bg-white/5 text-muted border border-white/10",
  running: "bg-[#d9f928]/10 text-[#d9f928] border border-[#d9f928]/30 shadow-[0_0_12px_rgba(217,249,40,0.15)]",
  done: "bg-emerald-500/10 text-emerald-300 border border-emerald-500/25",
  failed: "bg-fail/15 text-red-400 border border-fail/30",
};

export function StatusChip({ job }: { job: Job }) {
  const text =
    job.status === "running" ? `${job.stage ?? "running"} · ${job.progress}%`
    : job.status === "failed" ? `failed · ${job.error ?? "unknown error"}`
    : job.status;
  return (
    <span
      title={text}
      className={`inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium tracking-wide backdrop-blur-xs ${STYLE[job.status]}`}
    >
      {job.status === "running" && <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-current" />}
      <span className="truncate">{text}</span>
    </span>
  );
}
