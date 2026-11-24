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
  headline?: string;
  description?: string;
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
    <div className="flex h-dvh flex-col bg-page text-ink overflow-x-hidden">
      <Suspense fallback={null}>
        <OpenJobReader onChange={setOpenJobId} />
      </Suspense>

      {/* Top Studio Bar */}
      <Rail active={module.kind} all={all} />

      {/* Studio Workbench Two-Column Layout (Matching Higgsfield Studio) */}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        {/* Left Studio Creation Panel */}
        <aside
          aria-label="Creation controls"
          className="w-full shrink-0 border-b border-line bg-card/30 overflow-y-auto lg:w-96 xl:w-[410px] lg:border-b-0 lg:border-r"
        >
          <PromptBar onSubmit={submit} kind={module.kind} title={module.title}>
            {module.promptFields}
          </PromptBar>
        </aside>

        {/* Right Studio Stage & Media Feed */}
        <main className="flex min-w-0 flex-1 flex-col overflow-y-auto px-4 py-6 md:px-8">
          <div className="mx-auto w-full max-w-6xl">
            {/* Stage Hero & Subnav matching Higgsfield */}
            <div className="mb-6 flex flex-col gap-4 border-b border-line/80 pb-6 text-center">
              <div className="flex items-center justify-center gap-6 text-xs font-semibold text-muted">
                <span className="text-violet2 font-bold border-b-2 border-violet2 pb-1">Motion Library</span>
                <span className="hover:text-ink cursor-pointer">History</span>
                <span className="hover:text-ink cursor-pointer">Styles</span>
              </div>

              <div>
                <h1 className="text-2xl font-black tracking-tight text-ink md:text-3xl uppercase">
                  {module.headline ?? module.title}
                </h1>
                <p className="mx-auto mt-1.5 max-w-2xl text-xs text-muted md:text-sm">
                  {module.description ?? "Generate, evaluate and inspect creative outputs with AI precision."}
                </p>
              </div>

              {/* Filter Tabs matching Higgsfield */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div
                  role="group"
                  aria-label="Filter results"
                  className="flex items-center gap-1 rounded-xl border border-line bg-card/70 p-1 text-xs font-medium"
                >
                  {(["all", "passed", "failed"] as Filter[]).map((f) => {
                    const on = filter === f;
                    return (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setFilter(f)}
                        aria-pressed={on}
                        className={`cursor-pointer rounded-lg px-3 py-1.5 capitalize transition-all duration-150 ${
                          on
                            ? "bg-white text-violet2 font-bold shadow-xs border border-line/60"
                            : "text-muted hover:text-ink hover:bg-white/50"
                        }`}
                      >
                        {f}
                      </button>
                    );
                  })}
                </div>

                <div className="text-xs font-semibold text-muted">
                  <span>Trending</span>
                </div>
              </div>
            </div>

            {offline && (
              <p
                role="status"
                className="mb-6 flex items-center gap-2 rounded-xl border border-fail/30 bg-[#fee2e2] px-4 py-3 text-sm font-medium text-fail shadow-xs"
              >
                <WifiOff className="size-4 shrink-0" aria-hidden />
                Can&apos;t reach the server. Retrying…
              </p>
            )}

            {loaded && jobs.length === 0 && (
              <div className="mt-16 flex flex-col items-center justify-center gap-3 text-center text-muted">
                <div className="grid size-14 place-items-center rounded-2xl border border-line bg-card shadow-xs text-muted">
                  <Inbox className="size-7" strokeWidth={1.5} aria-hidden />
                </div>
                <h3 className="font-semibold text-ink">No creations yet</h3>
                <p className="max-w-sm text-sm">Add inputs in the creation panel on the left and click Generate to start.</p>
              </div>
            )}

            {/* Batch Rows & Media Tiles */}
            <div className="space-y-6 pb-12">
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
            </div>
          </div>
        </main>

        {/* Side Inspector Drawer */}
        {selected && (
          <aside
            aria-label="Details"
            className="fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] rounded-t-3xl border-t border-line bg-white/95 p-6 shadow-2xl backdrop-blur-xl overflow-y-auto lg:static lg:block lg:max-h-none lg:w-96 lg:shrink-0 lg:rounded-none lg:border-l lg:border-line lg:bg-white/95 lg:shadow-xl"
          >
            <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
              <span className="text-xs font-bold tracking-wider text-muted uppercase">Inspector</span>
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
          </aside>
        )}
      </div>
    </div>
  );
}
