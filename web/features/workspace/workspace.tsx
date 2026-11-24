"use client";

import { useParams, useRouter } from "next/navigation";
import { Inbox, Plus, WifiOff, X } from "lucide-react";
import { Suspense, useEffect, useMemo, useState } from "react";
import type { Job, JobKind, Output } from "@/lib/api-types";
import { useJobFeed } from "@/features/jobs/use-job-feed";
import { StatusChip } from "@/components/ui/status-chip";
import { timeAgo } from "@/features/jobs/kinds";
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
  const router = useRouter();
  const [urlJobId, setUrlJobId] = useState<string>();
  // undefined = follow the URL; null = "new project" form; string = that project.
  const [picked, setPicked] = useState<string | null | undefined>(undefined);
  const { jobs, all, outputs, offline, loaded, submit } = useJobFeed(module.kind);
  const [selected, setSelected] = useState<Output | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const activeId = picked === undefined ? (urlJobId ?? null) : picked;
  const activeJob = activeId ? jobs.find((j) => j.id === activeId) : undefined;

  const visible = useMemo(
    () => (o: Output) => (module.filter && filter !== "all" ? module.filter(o, filter) : true),
    [module, filter],
  );

  function open(jobId: string | null) {
    setPicked(jobId);
    setSelected(null);
    setFilter("all");
    router.replace(jobId ? `/${module.kind}/${jobId}` : `/${module.kind}`, { scroll: false });
  }

  const busy = activeJob && (activeJob.status === "queued" || activeJob.status === "running");

  return (
    <div className="flex h-dvh flex-col overflow-x-hidden bg-page text-ink">
      <Suspense fallback={null}>
        <OpenJobReader onChange={setUrlJobId} />
      </Suspense>

      <Rail active={module.kind} all={all} />

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        {/* Projects of this feature */}
        <aside aria-label={`${module.title} projects`}
          className="flex max-h-[38dvh] w-full shrink-0 flex-col border-b border-line bg-[#0d0e14] lg:max-h-none lg:w-80 lg:border-r lg:border-b-0">
          <div className="p-4">
            <button type="button" onClick={() => open(null)} aria-pressed={activeId === null}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-lime px-4 py-2.5 text-sm font-bold text-black shadow-xs transition-all hover:bg-lime/90">
              <Plus className="size-4" aria-hidden />New project
            </button>
          </div>
          <p className="px-5 pb-2 text-[11px] font-bold tracking-wider text-muted uppercase">Your projects</p>
          <div className="flex-1 space-y-2 overflow-y-auto px-3 pb-4">
            {loaded && jobs.length === 0 && <p className="px-2 py-4 text-xs text-muted">No projects yet.</p>}
            {jobs.map((job) => {
              const on = activeId === job.id;
              const running = job.status === "queued" || job.status === "running";
              return (
                <button key={job.id} type="button" onClick={() => open(job.id)} aria-current={on ? "true" : undefined}
                  className={`w-full cursor-pointer rounded-xl border p-3 text-left transition-colors ${on ? "border-lime/70 bg-[#181a26]" : "border-line bg-[#13141d] hover:bg-[#171824]"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-bold text-white">{String(job.input?.name ?? job.id)}</span>
                    <StatusChip job={job} short />
                  </div>
                  {running && (
                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-lime transition-all duration-500" style={{ width: `${Math.max(job.progress, 8)}%` }} />
                    </div>
                  )}
                  <p className="mt-1.5 text-[10px] text-muted">{timeAgo(job.created_at)}</p>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col overflow-y-auto px-4 py-6 md:px-8">
          <div className="mx-auto w-full max-w-5xl">
            {offline && (
              <p role="status" className="mb-6 flex items-center gap-2 rounded-xl border border-fail/30 bg-fail/10 px-4 py-3 text-sm font-medium text-fail">
                <WifiOff className="size-4 shrink-0" aria-hidden />Can&apos;t reach the server. Retrying…
              </p>
            )}

            {activeId === null ? (
              /* New project */
              <div className="mx-auto max-w-xl">
                <h1 className="text-2xl font-black tracking-tight text-white uppercase md:text-3xl">{module.headline ?? module.title}</h1>
                {module.description && <p className="mt-1 mb-6 text-sm text-muted">{module.description}</p>}
                <div className="rounded-2xl border border-line bg-[#0d0e14]">
                  <PromptBar onSubmit={submit} kind={module.kind} title={module.title} onSuccess={(id) => id && open(id)}>
                    {module.promptFields}
                  </PromptBar>
                </div>
              </div>
            ) : !activeJob ? (
              /* Just created, or an id the feed has not loaded yet */
              <div className="mt-24 flex flex-col items-center gap-3 text-center text-muted">
                {loaded ? <><Inbox className="size-7" aria-hidden />This project was not found.</> : <span className="shimmer h-24 w-full max-w-md rounded-2xl" />}
              </div>
            ) : (
              /* One project: live status, then results */
              <>
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-5">
                  <div className="min-w-0">
                    <p className="text-xs text-muted">{module.title}</p>
                    <h1 className="truncate text-2xl font-black tracking-tight text-white">{String(activeJob.input?.name ?? activeJob.id)}</h1>
                  </div>
                  <StatusChip job={activeJob} short />
                </div>

                {busy && (
                  <div role="status" className="mb-6 rounded-2xl border border-line bg-[#13141d] p-5">
                    <div className="mb-2 flex justify-between text-sm">
                      <span className="font-medium text-white capitalize">{activeJob.stage ?? "Waiting to start"}…</span>
                      <span className="text-muted tabular-nums">{activeJob.progress}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-lime transition-all duration-700" style={{ width: `${Math.max(activeJob.progress, 4)}%` }} />
                    </div>
                    <p className="mt-2 text-xs text-muted">Results appear here when they are ready. You can leave this page.</p>
                  </div>
                )}

                {activeJob.status === "failed" && (
                  <p role="alert" className="mb-6 rounded-2xl border border-fail/30 bg-fail/10 p-4 text-sm text-fail">
                    This project failed: {activeJob.error ?? "unknown error"}
                  </p>
                )}

                {module.filter && activeJob.status === "done" && (
                  <div role="group" aria-label="Filter results" className="mb-4 inline-flex gap-1 rounded-xl border border-line bg-[#13141c] p-1 text-xs font-medium">
                    {(["all", "passed", "failed"] as Filter[]).map((f) => (
                      <button key={f} type="button" onClick={() => setFilter(f)} aria-pressed={filter === f}
                        className={`cursor-pointer rounded-lg px-3 py-1.5 capitalize ${filter === f ? "bg-lime font-extrabold text-black" : "text-muted hover:text-white"}`}>{f}</button>
                    ))}
                  </div>
                )}

                {activeJob.status !== "failed" && <BatchRow job={activeJob} outputs={(outputs[activeJob.id] ?? []).filter(visible).sort(module.sort)}
                  loaded={activeJob.id in outputs} summary={module.summary(activeJob)} gridClass={module.gridClass}
                  tileAspect={module.tileAspect} expected={module.expectedCount(activeJob)} selectedId={selected?.id}
                  highlight={false} header={false} renderTile={module.renderTile} onSelect={setSelected} />}
              </>
            )}
          </div>
        </main>

        {selected && (
          <aside aria-label="Details"
            className="fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto rounded-t-3xl border-t border-line bg-[#0d0e14]/95 p-6 shadow-2xl backdrop-blur-xl lg:static lg:block lg:max-h-none lg:w-96 lg:shrink-0 lg:rounded-none lg:border-l lg:bg-[#0d0e14] lg:shadow-xl">
            <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
              <span className="text-xs font-bold tracking-wider text-muted uppercase">Details</span>
              <button type="button" onClick={() => setSelected(null)} aria-label="Close details"
                className="cursor-pointer rounded-lg p-1.5 text-muted hover:bg-[#1a1b26] hover:text-white">
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
