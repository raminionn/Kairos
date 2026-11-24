import { StatusChip } from "@/components/ui/status-chip";
import type { Job, Output } from "@/lib/api-types";
import { timeAgo } from "@/features/jobs/kinds";

interface Props {
  job: Job;
  outputs: Output[];
  /** True once the job's outputs have been fetched (they may still be empty or filtered out). */
  loaded: boolean;
  summary: string;
  gridClass: string;
  tileAspect: string;
  expected: number;
  selectedId?: string;
  highlight: boolean;
  renderTile(o: Output, selected: boolean): React.ReactNode;
  onSelect(o: Output): void;
}

/** One job: header line, then its result tiles (or shimmers while it runs). */
export function BatchRow({
  job,
  outputs,
  loaded,
  summary,
  gridClass,
  tileAspect,
  expected,
  selectedId,
  highlight,
  renderTile,
  onSelect,
}: Props) {
  const busy = job.status === "queued" || job.status === "running";
  const waiting = busy || (job.status === "done" && !loaded);
  const shimmers = waiting ? Math.max(expected - outputs.length, 0) : 0;
  return (
    <section
      id={`job-${job.id}`}
      className={`scroll-mt-4 rounded-2xl p-3.5 transition-all duration-300 md:p-4.5 ${
        highlight
          ? "bg-[#f1ecff]/80 ring-1 ring-violet2/30 shadow-xs"
          : "hover:bg-white/40"
      }`}
    >
      <header className="mb-3.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-sm text-muted">
        <b className="font-semibold tracking-tight text-ink">{String(job.input?.name ?? job.id)}</b>
        {summary && <span className="text-xs text-muted">· {summary}</span>}
        <StatusChip job={job} />
        <span className="ml-auto text-xs text-muted">{timeAgo(job.created_at)}</span>
      </header>
      {job.status !== "failed" && (
        <div className={`grid gap-3 md:gap-4 ${gridClass}`}>
          {outputs.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => onSelect(o)}
              aria-pressed={o.id === selectedId}
              className={`block cursor-pointer rounded-xl text-left transition-all duration-200 hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-violet2 focus-visible:ring-offset-2 focus-visible:ring-offset-page focus-visible:outline-none ${
                o.id === selectedId
                  ? "ring-2 ring-violet2 ring-offset-2 ring-offset-page shadow-md shadow-violet2/20"
                  : ""
              }`}
            >
              {renderTile(o, o.id === selectedId)}
            </button>
          ))}
          {!waiting && outputs.length === 0 && (
            <p className="col-span-full py-6 text-center text-sm text-muted">No results to show.</p>
          )}
          {Array.from({ length: shimmers }, (_, i) => (
            <div
              key={i}
              className={`shimmer grid place-items-center rounded-xl border border-line text-center text-xs font-medium text-muted ${tileAspect}`}
            >
              {busy ? (job.stage ?? "queued") + "…" : "loading…"}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
