"use client";

import { useParams, useRouter } from "next/navigation";
import { FolderGit2, Inbox, Plus, WifiOff, X } from "lucide-react";
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
  const [openJobId, setOpenJobId] = useState<string>();
  const { jobs, all, outputs, offline, loaded, submit } = useJobFeed(module.kind);
  const [selected, setSelected] = useState<Output | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  // Track user-selected project or fallback to openJobId / "all"
  const [selectedJobId, setSelectedJobId] = useState<string | "all" | null>(null);
  // Track user sidebar tab or default to "projects" if openJobId is present
  const [userSidebarTab, setUserSidebarTab] = useState<"create" | "projects" | null>(null);

  const activeJobId = selectedJobId ?? openJobId ?? "all";
  const sidebarTab = userSidebarTab ?? (openJobId ? "projects" : "create");

  // Bring the linked job into view once it has loaded.
  const linkedLoaded = loaded && jobs.some((j) => j.id === openJobId);
  useEffect(() => {
    if (linkedLoaded) {
      document.getElementById(`job-${openJobId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [linkedLoaded, openJobId]);

  const visible = useMemo(
    () => (o: Output) => (module.filter && filter !== "all" ? module.filter(o, filter) : true),
    [module, filter],
  );

  // Active job object if a specific job is selected
  const activeJob = useMemo(
    () => (activeJobId !== "all" ? jobs.find((j) => j.id === activeJobId) : undefined),
    [jobs, activeJobId],
  );

  // Jobs to render in the stage: either just the active job, or all jobs
  const displayJobs = useMemo(() => {
    if (activeJob) return [activeJob];
    return jobs;
  }, [activeJob, jobs]);

  function handleSelectProject(jobId: string) {
    setSelectedJobId(jobId);
    setUserSidebarTab("projects");
    router.replace(`/${module.kind}/${jobId}`, { scroll: false });
  }

  function handleCreateNewProject() {
    setUserSidebarTab("create");
    setSelectedJobId("all");
  }

  function handleJobSubmitted() {
    setUserSidebarTab("projects");
    if (jobs[0]) {
      setSelectedJobId(jobs[0].id);
    }
  }

  const runningCount = jobs.filter((j) => j.status === "queued" || j.status === "running").length;

  return (
    <div className="flex h-dvh flex-col bg-page text-ink overflow-x-hidden">
      <Suspense fallback={null}>
        <OpenJobReader onChange={setOpenJobId} />
      </Suspense>

      {/* Top Studio Bar */}
      <Rail active={module.kind} all={all} />

      {/* Studio Workbench Two-Column Layout */}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        {/* Left Studio Sidebar: Project Navigator & Creation Workbench */}
        <aside
          aria-label="Studio controls"
          className="flex w-full shrink-0 flex-col border-b border-line bg-[#0d0e14] lg:w-88 xl:w-[390px] lg:border-b-0 lg:border-r"
        >
          {/* Sidebar Mode Tabs */}
          <div className="flex items-center justify-between border-b border-line bg-[#0d0e14] px-4 py-3">
            <div className="flex items-center gap-1.5 rounded-xl border border-line bg-[#14151e] p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setUserSidebarTab("create")}
                className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all ${
                  sidebarTab === "create"
                    ? "bg-[#222432] text-white shadow-xs font-bold border border-[#323648]"
                    : "text-muted hover:text-white"
                }`}
              >
                <Plus className="size-3.5" />
                <span>Create</span>
              </button>
              <button
                type="button"
                onClick={() => setUserSidebarTab("projects")}
                className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all ${
                  sidebarTab === "projects"
                    ? "bg-[#222432] text-white shadow-xs font-bold border border-[#323648]"
                    : "text-muted hover:text-white"
                }`}
              >
                <FolderGit2 className="size-3.5" />
                <span>Projects</span>
                <span className="rounded-full bg-white/10 px-1.5 py-0.2 text-[10px] text-muted">
                  {jobs.length}
                </span>
                {runningCount > 0 && (
                  <span className="size-2 animate-pulse rounded-full bg-pink ring-2 ring-[#0d0e14]" />
                )}
              </button>
            </div>

            {sidebarTab === "projects" && (
              <button
                type="button"
                onClick={handleCreateNewProject}
                className="flex cursor-pointer items-center gap-1 rounded-xl bg-lime px-3 py-1.5 text-xs font-bold text-black shadow-xs transition-all hover:bg-lime/90"
              >
                <Plus className="size-3.5" />
                <span>New</span>
              </button>
            )}
          </div>

          {/* Sidebar Content Area */}
          <div className="flex-1 overflow-y-auto">
            {sidebarTab === "create" ? (
              <PromptBar
                onSubmit={submit}
                kind={module.kind}
                title={module.title}
                onSuccess={handleJobSubmitted}
              >
                {module.promptFields}
              </PromptBar>
            ) : (
              <div className="p-3.5 space-y-2.5">
                <div className="flex items-center justify-between px-1 text-xs text-muted">
                  <span className="font-bold uppercase tracking-wider text-[11px] text-muted">
                    {module.title} Projects ({jobs.length})
                  </span>
                  {activeJobId !== "all" && (
                    <button
                      type="button"
                      onClick={() => setSelectedJobId("all")}
                      className="cursor-pointer text-lime font-semibold hover:underline"
                    >
                      Show all
                    </button>
                  )}
                </div>

                {loaded && jobs.length === 0 && (
                  <div className="rounded-2xl border border-line bg-[#13141d] p-6 text-center text-muted">
                    <p className="text-xs font-medium">No projects in this studio yet.</p>
                    <button
                      type="button"
                      onClick={() => setUserSidebarTab("create")}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-lime px-4 py-2 text-xs font-bold text-black shadow-xs hover:bg-lime/90"
                    >
                      <Plus className="size-3.5" />
                      Create first project
                    </button>
                  </div>
                )}

                {jobs.map((job) => {
                  const isActive = activeJobId === job.id;
                  const isBusy = job.status === "queued" || job.status === "running";
                  const outputCount = outputs[job.id]?.length ?? 0;
                  return (
                    <button
                      key={job.id}
                      type="button"
                      onClick={() => handleSelectProject(job.id)}
                      className={`w-full cursor-pointer rounded-2xl border p-3.5 text-left transition-all duration-150 ${
                        isActive
                          ? "border-lime/70 bg-[#181a26] shadow-md ring-1 ring-lime/30"
                          : "border-line bg-[#13141d] hover:border-[#2e3142] hover:bg-[#171824]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="truncate text-xs font-bold text-white">
                          {String(job.input?.name ?? job.id)}
                        </span>
                        <StatusChip job={job} />
                      </div>

                      {module.summary(job) && (
                        <p className="mt-1 truncate text-[11px] text-muted">
                          {module.summary(job)}
                        </p>
                      )}

                      {/* Live progress indicator if running */}
                      {isBusy && (
                        <div className="mt-2.5">
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full bg-lime transition-all duration-500 animate-pulse"
                              style={{ width: `${Math.max(job.progress, 15)}%` }}
                            />
                          </div>
                          <span className="mt-1 block text-[10px] font-mono text-muted">
                            {job.stage ?? "Processing"} · {job.progress}%
                          </span>
                        </div>
                      )}

                      <div className="mt-2.5 flex items-center justify-between text-[10px] text-muted font-mono">
                        <span>
                          {job.status === "done" ? `${outputCount} outputs` : job.status}
                        </span>
                        <span>{timeAgo(job.created_at)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        {/* Right Studio Stage & Results Feed */}
        <main className="flex min-w-0 flex-1 flex-col overflow-y-auto px-4 py-6 md:px-8">
          <div className="mx-auto w-full max-w-6xl">
            {/* Stage Hero & Subnav Header */}
            <div className="mb-6 flex flex-col gap-4 border-b border-line pb-6">
              {/* Breadcrumb & Project Navigator */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-muted">
                  <span className="font-semibold text-white">{module.title}</span>
                  <span>/</span>
                  <span className="font-bold text-lime truncate max-w-xs">
                    {activeJob ? String(activeJob.input?.name ?? activeJob.id) : "All Projects"}
                  </span>
                  {activeJob && <StatusChip job={activeJob} />}
                </div>

                <div className="flex items-center gap-2">
                  {activeJobId !== "all" && (
                    <button
                      type="button"
                      onClick={() => setSelectedJobId("all")}
                      className="cursor-pointer rounded-lg border border-line bg-[#14151e] px-2.5 py-1 text-xs font-semibold text-muted hover:text-white hover:bg-[#1a1b26]"
                    >
                      View all projects ({jobs.length})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleCreateNewProject}
                    className="flex cursor-pointer items-center gap-1 rounded-lg bg-lime px-3 py-1 text-xs font-extrabold text-black shadow-xs hover:bg-lime/90"
                  >
                    <Plus className="size-3.5" />
                    Create
                  </button>
                </div>
              </div>

              {/* Title & Capability Tagline */}
              <div>
                <h1 className="text-2xl font-black tracking-tight text-white md:text-3xl uppercase">
                  {activeJob ? String(activeJob.input?.name ?? activeJob.id) : (module.headline ?? module.title)}
                </h1>
                <p className="mt-1 text-xs text-muted md:text-sm">
                  {activeJob
                    ? module.summary(activeJob) || "Inspecting project outputs and automated quality verification."
                    : (module.description ?? "Generate, evaluate and inspect creative outputs with AI precision.")}
                </p>
              </div>

              {/* Filter Tabs & Controls */}
              {module.filter && (
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div
                    role="group"
                    aria-label="Filter results"
                    className="flex items-center gap-1 rounded-xl border border-line bg-[#13141c] p-1 text-xs font-medium"
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
                              ? "bg-lime text-black font-extrabold shadow-xs"
                              : "text-muted hover:text-white hover:bg-[#1a1b26]"
                          }`}
                        >
                          {f}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {offline && (
              <p
                role="status"
                className="mb-6 flex items-center gap-2 rounded-xl border border-fail/30 bg-fail/10 px-4 py-3 text-sm font-medium text-fail shadow-xs"
              >
                <WifiOff className="size-4 shrink-0" aria-hidden />
                Can&apos;t reach the server. Retrying…
              </p>
            )}

            {loaded && jobs.length === 0 && (
              <div className="mt-16 flex flex-col items-center justify-center gap-3 text-center text-muted">
                <div className="grid size-14 place-items-center rounded-2xl border border-line bg-[#13141d] shadow-xs text-muted">
                  <Inbox className="size-7" strokeWidth={1.5} aria-hidden />
                </div>
                <h3 className="font-semibold text-white">No projects yet</h3>
                <p className="max-w-sm text-sm">
                  Click &quot;Create new project&quot; in the sidebar to generate your first output.
                </p>
                <button
                  type="button"
                  onClick={handleCreateNewProject}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-lime px-4 py-2 text-xs font-bold text-black shadow-xs hover:bg-lime/90"
                >
                  <Plus className="size-3.5" />
                  Create new project
                </button>
              </div>
            )}

            {/* Batch Rows & Media Tiles */}
            <div className="space-y-6 pb-12">
              {displayJobs.map((job) => (
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
                  highlight={job.id === openJobId || job.id === activeJobId}
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
            className="fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] rounded-t-3xl border-t border-line bg-[#0d0e14]/95 p-6 shadow-2xl backdrop-blur-xl overflow-y-auto lg:static lg:block lg:max-h-none lg:w-96 lg:shrink-0 lg:rounded-none lg:border-l lg:border-line lg:bg-[#0d0e14] lg:shadow-xl"
          >
            <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
              <span className="text-xs font-bold tracking-wider text-muted uppercase">Inspector</span>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="cursor-pointer rounded-lg p-1.5 text-muted transition-colors hover:bg-[#1a1b26] hover:text-white"
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
