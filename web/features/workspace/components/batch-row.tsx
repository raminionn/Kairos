import { StatusChip } from "@/components/ui/status-chip";
import type { Job, Output } from "@/lib/api-types";
import { timeAgo } from "@/features/jobs/kinds";

interface Props {
  job: Job;
  outputs: Output[];
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
export function BatchRow({ job, outputs, summary, gridClass, tileAspect, expected, selectedId, highlight, renderTile, onSelect }: Props) {
  const busy = job.status === "queued" || job.status === "running";
  return (
    <section id={`job-${job.id}`} className={`scroll-mt-4 rounded-2xl p-3 transition-colors ${highlight ? "bg-[#f1ecff]" : ""}`}>
      <header className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
        <b className="font-medium text-ink">{String(job.input.name ?? job.id)}</b>
        {summary && <span>· {summary}</span>}
        <StatusChip job={job} />
        <span className="ml-auto text-xs">{timeAgo(job.created_at)}</span>
      </header>
      {job.status !== "failed" && (
        <div className={`grid gap-2.5 ${gridClass}`}>
          {outputs.map((o) => (
            <button key={o.id} type="button" onClick={() => onSelect(o)} aria-pressed={o.id === selectedId}
              className={`block rounded-xl text-left transition hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-violet2 ${o.id === selectedId ? "outline-2 outline-offset-2 outline-violet2" : ""}`}>
              {renderTile(o, o.id === selectedId)}
            </button>
          ))}
          {(busy || (job.status === "done" && outputs.length === 0)) &&
            Array.from({ length: Math.max(expected - outputs.length, 0) }, (_, i) => (
              <div key={i} className={`shimmer grid place-items-center rounded-xl text-center text-xs text-muted ${tileAspect}`}>
                {busy ? (job.stage ?? "queued") + "…" : "loading…"}
              </div>
            ))}
        </div>
      )}
    </section>
  );
}
