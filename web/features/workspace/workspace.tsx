"use client";

import { useParams } from "next/navigation";
import { Inbox, WifiOff, X } from "lucide-react";
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
    <div className="flex h-dvh flex-col bg-page text-ink md:flex-row">
      <Suspense fallback={null}>
        <OpenJobReader onChange={setOpenJobId} />
      </Suspense>
      <Rail active={module.kind} all={all} />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-line bg-white/90 px-4 backdrop-blur-md md:px-6">
          <h1 className="text-sm font-semibold tracking-tight text-ink md:text-base">{module.title}</h1>
          {module.filter && (
            <div
              role="group"
              aria-label="Filter results"
              className="flex items-center rounded-xl border border-line bg-card/60 p-0.5 text-xs font-medium"
            >
              {(["all", "passed", "failed"] as Filter[]).map((f) => {
                const on = filter === f;
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    aria-pressed={on}
                    className={`cursor-pointer rounded-lg px-3 py-1 capitalize transition-all duration-150 ${
                      on
                        ? "bg-ink text-white shadow-xs"
                        : "text-muted hover:text-ink hover:bg-white"
                    }`}
                  >
                    {f}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="relative flex min-h-0 flex-1">
          <main className="flex min-w-0 flex-1 flex-col overflow-y-auto px-2 pt-3 md:px-6">
            {offline && (
              <p
                role="status"
                className="mx-3 mb-3 flex items-center gap-2 rounded-xl border border-fail/30 bg-[#fee2e2] px-4 py-2.5 text-sm font-medium text-fail shadow-xs"
              >
                <WifiOff className="size-4 shrink-0" aria-hidden />
                Can&apos;t reach the server. Retrying…
              </p>
            )}
            {loaded && jobs.length === 0 && (
              <div className="mx-3 mt-20 flex flex-col items-center justify-center gap-3 text-center text-muted">
                <div className="grid size-12 place-items-center rounded-2xl border border-line bg-card text-muted">
                  <Inbox className="size-6" strokeWidth={1.5} aria-hidden />
                </div>
                <p className="max-w-xs text-sm">Your creations show up here. Add an input below and press Generate.</p>
              </div>
            )}
            {jobs.map((job) => (
              <BatchRow
                key={job.id}
                job={job}
                outputs={(outputs[job.id] ?? []).filter(visible).sort(module.sort)}
                loaded={job.id in outputs}
                summary={module.summary(job)}
                gridClass={module.gridClass}
                tileAspect={module.tileAspect}
                expected={module.expectedCount(job)}
                selectedId={selected?.id}
                highlight={job.id === openJobId}
                renderTile={module.renderTile}
                onSelect={setSelected}
              />
            ))}
            {/* Sticky, not absolute: at the end of the feed it sits below the last row instead of over it. */}
            <div className="sticky bottom-0 mt-auto px-1 pt-6 pb-4">
              <PromptBar onSubmit={submit}>{module.promptFields}</PromptBar>
            </div>
          </main>

          <aside
            aria-label="Details"
            className={`${
              selected
                ? "fixed inset-x-0 bottom-0 z-30 max-h-[85dvh] rounded-t-3xl border-t border-line bg-white p-5 shadow-2xl"
                : "hidden"
            } overflow-y-auto md:static md:block md:max-h-none md:w-84 md:shrink-0 md:rounded-none md:border-l md:border-line md:bg-white/90 md:p-6 md:shadow-none md:backdrop-blur-md`}
          >
            {selected ? (
              <>
                <div className="mb-3.5 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="cursor-pointer rounded-lg p-1.5 text-muted transition-colors hover:bg-card hover:text-ink"
                    aria-label="Close details"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                {module.renderDrawer(selected)}
              </>
            ) : (
              <p className="mt-14 text-center text-sm text-muted">Select a result to see its details.</p>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
