"use client";

import { useParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import type { Job, JobKind, Output } from "@/lib/api-types";
import { useJobFeed } from "@/features/jobs/use-job-feed";
import { BatchRow } from "./components/batch-row";
import { PromptBar } from "./components/prompt-bar";
import { Rail } from "./components/rail";

export type Filter = "all" | "passed" | "failed";

export interface ModuleConfig {
  kind: JobKind;
  title: string;
  /** Settings shown after the job name, e.g. "Product · eucalyptus leaves". */
  summary(job: Job): string;
  /** Tailwind grid columns for the tiles, and the shimmer tile's aspect ratio. */
  gridClass: string;
  tileAspect: string;
  renderTile(o: Output, selected: boolean): React.ReactNode;
  renderDrawer(o: Output): React.ReactNode;
  /** Named form fields inside the prompt bar. */
  promptFields: React.ReactNode;
  /** When present, the top bar shows All / Passed / Failed. */
  filter?(o: Output, f: Filter): boolean;
  /** Tile order inside a row; API order when absent. */
  sort?(a: Output, b: Output): number;
  expectedCount(job: Job): number;
}

/** Reads the optional job id from /<kind>/[[...id]]. Kept tiny so only it waits for the URL. */
function OpenJobReader({ onChange }: { onChange(id?: string): void }) {
  const id = useParams<{ id?: string[] }>().id?.[0];
  useEffect(() => onChange(id), [id, onChange]);
  return null;
}

export function Workspace({ module }: { module: ModuleConfig }) {
  const [openJobId, setOpenJobId] = useState<string>();
  const { jobs, all, outputs, offline, loaded, submit } = useJobFeed(module.kind);
  const [selected, setSelected] = useState<Output | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  // Bring the linked job into view once it has loaded.
  const linkedLoaded = loaded && jobs.some((j) => j.id === openJobId);
  useEffect(() => {
    if (linkedLoaded) document.getElementById(`job-${openJobId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [linkedLoaded, openJobId]);

  const visible = useMemo(
    () => (o: Output) => (module.filter && filter !== "all" ? module.filter(o, filter) : true),
    [module, filter],
  );

  return (
    <div className="flex h-dvh flex-col bg-page md:flex-row">
      <Suspense fallback={null}><OpenJobReader onChange={setOpenJobId} /></Suspense>
      <Rail active={module.kind} all={all} />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-white px-4">
          <h1 className="font-medium">{module.title}</h1>
          {module.filter && (
            <div role="group" aria-label="Filter results" className="ml-auto flex rounded-xl border border-line p-0.5 text-sm">
              {(["all", "passed", "failed"] as Filter[]).map((f) => (
                <button key={f} type="button" onClick={() => setFilter(f)} aria-pressed={filter === f}
                  className={`rounded-lg px-3 py-1 capitalize ${filter === f ? "bg-ink text-white" : "text-muted"}`}>{f}</button>
              ))}
            </div>
          )}
        </div>

        <div className="relative flex min-h-0 flex-1">
          <main className="min-w-0 flex-1 overflow-y-auto px-2 pt-3 pb-48 md:px-4">
            {offline && <p role="status" className="mx-3 mb-3 rounded-xl bg-[#fee2e2] px-4 py-2 text-sm text-fail">Can&apos;t reach the server. Retrying…</p>}
            {loaded && jobs.length === 0 && (
              <p className="mx-3 mt-10 text-center text-muted">Nothing here yet. Add your input below and press Generate.</p>
            )}
            {jobs.map((job) => (
              <BatchRow key={job.id} job={job} outputs={(outputs[job.id] ?? []).filter(visible).sort(module.sort)}
                summary={module.summary(job)} gridClass={module.gridClass} tileAspect={module.tileAspect}
                expected={module.expectedCount(job)} selectedId={selected?.id} highlight={job.id === openJobId}
                renderTile={module.renderTile} onSelect={setSelected} />
            ))}
          </main>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 px-3 pb-4 md:right-80">
            <PromptBar onSubmit={submit}>{module.promptFields}</PromptBar>
          </div>

          <aside aria-label="Details"
            className={`${selected ? "fixed inset-x-0 bottom-0 z-20 max-h-[85dvh] rounded-t-2xl shadow-2xl" : "hidden"} overflow-y-auto border-line bg-white p-4 md:static md:block md:max-h-none md:w-80 md:shrink-0 md:rounded-none md:border-l md:shadow-none`}>
            {selected ? (
              <>
                <div className="mb-3 flex justify-end">
                  <button type="button" onClick={() => setSelected(null)} className="rounded-lg px-2 py-1 text-sm text-muted hover:bg-card" aria-label="Close details">✕</button>
                </div>
                {module.renderDrawer(selected)}
              </>
            ) : (
              <p className="mt-10 text-center text-sm text-muted">Select a result to see its details.</p>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
