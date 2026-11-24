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
      className={`scroll-mt-6 rounded-2xl p-4 transition-all duration-300 md:p-5 ${
        highlight
          ? "bg-[#f1ecff]/80 ring-1 ring-violet2/30 shadow-xs"
          : "bg-white/40 border border-line/60 shadow-xs"
      }`}
    >
      <header className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted">
        <b className="font-semibold tracking-tight text-ink text-base">{String(job.input?.name ?? job.id)}</b>
        {summary && <span className="text-xs text-muted">· {summary}</span>}
        <StatusChip job={job} />
        <span className="ml-auto text-xs text-muted font-mono">{timeAgo(job.created_at)}</span>
      </header>
      {job.status !== "failed" && (
        <div className={`grid gap-4 md:gap-5 ${gridClass}`}>
          {outputs.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => onSelect(o)}
              aria-pressed={o.id === selectedId}
              className={`block cursor-pointer rounded-2xl text-left transition-all duration-200 hover:scale-[1.02] hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-violet2 focus-visible:ring-offset-2 focus-visible:ring-offset-page focus-visible:outline-none ${
                o.id === selectedId
                  ? "ring-2 ring-violet2 ring-offset-2 ring-offset-page shadow-md shadow-violet2/20"
                  : ""
              }`}
            >
              {renderTile(o, o.id === selectedId)}
            </button>
          ))}
          {!waiting && outputs.length === 0 && (
            <p className="col-span-full py-8 text-center text-sm text-muted">No results to show.</p>
          )}
          {Array.from({ length: shimmers }, (_, i) => (
            <div
              key={i}
              className={`shimmer grid place-items-center rounded-2xl border border-line text-center text-xs font-medium text-muted ${tileAspect}`}
            >
              {busy ? (job.stage ?? "queued") + "…" : "loading…"}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
