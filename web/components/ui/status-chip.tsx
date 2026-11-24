import type { Job } from "@/lib/api-types";

const STYLE: Record<Job["status"], string> = {
  queued: "bg-card text-muted",
  running: "bg-[#fff4d6] text-[#a16207]",
  done: "bg-[#dcfce7] text-[#15803d]",
  failed: "bg-[#fee2e2] text-fail",
};

export function StatusChip({ job }: { job: Job }) {
  const text =
    job.status === "running" ? `${job.stage ?? "running"} · ${job.progress}%`
    : job.status === "failed" ? `failed · ${job.error ?? "unknown error"}`
    : job.status;
  return <span title={text} className={`inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs ${STYLE[job.status]}`}>
    {job.status === "running" && <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-current" />}
    <span className="truncate">{text}</span>
  </span>;
}
