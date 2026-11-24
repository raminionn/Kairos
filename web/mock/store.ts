// In-memory job store for the fake API. Status is computed from created_at on every read,
// so jobs move queued -> running -> done without timers.
import type { Category, Job, JobKind, Output } from "@/lib/api-types";
import { APP_CHECKS, CLIPS, VARIANTS, carouselMeta } from "./data";

export const QUEUE_MS = 1000;
export const RUN_MS = 8000;

export const STAGES: Record<JobKind, string[]> = {
  video: ["understanding", "finding candidates", "judging clips", "rendering"],
  product: ["generating", "checking label", "checking look", "repairing"],
  carousel: ["planning slides", "rendering slides", "checking layout"],
};

// globalThis: route handlers can be bundled separately; they must share one list.
const g = globalThis as typeof globalThis & { __kairosMock?: { jobs: Job[]; seq: number } };
const db = (g.__kairosMock ??= { jobs: [], seq: 0 });

export function createJob(kind: JobKind, input: Record<string, unknown>, now = Date.now()): Job {
  const created = new Date(now).toISOString();
  const job: Job = {
    id: `${kind[0]}${++db.seq}-${now.toString(36)}`,
    kind, status: "queued", stage: null, progress: 0, error: null,
    created_at: created, updated_at: created, input,
  };
  db.jobs.push(job);
  return jobAt(job, now);
}

export function jobAt(job: Job, now: number): Job {
  const t = now - Date.parse(job.created_at);
  const at = (ms: number) => new Date(Date.parse(job.created_at) + ms).toISOString();
  if (t < QUEUE_MS) return { ...job, status: "queued", stage: null, progress: 0, error: null, updated_at: job.created_at };
  if (t < RUN_MS) {
    const progress = Math.min(99, Math.max(1, Math.round(((t - QUEUE_MS) / (RUN_MS - QUEUE_MS)) * 100)));
    const stages = STAGES[job.kind];
    return { ...job, status: "running", progress, error: null, stage: stages[Math.floor((progress / 100) * stages.length)], updated_at: at(t) };
  }
  if (String(job.input?.name ?? "").includes("fail")) {
    return { ...job, status: "failed", stage: null, progress: 60, error: "Mock failure", updated_at: at(RUN_MS) };
  }
  return { ...job, status: "done", stage: null, progress: 100, error: null, updated_at: at(RUN_MS) };
}

export function listJobs(now: number): Job[] {
  return db.jobs.map((j) => jobAt(j, now)).sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function getJob(id: string, now: number): Job | undefined {
  const job = db.jobs.find((j) => j.id === id);
  return job && jobAt(job, now);
}

export function outputsFor(job: Job): Output[] {
  if (job.status !== "done") return [];
  const file = (path: string) => (path ? `/files/${job.id}/${path}` : "");

  if (job.kind === "product") {
    const category = job.input?.category as Category;
    const n = Number(job.input?.n_variants ?? 3);
    return VARIANTS.slice(0, n).map(({ path, ...v }, i) => ({
      id: `${job.id}-v${i + 1}`, job_id: job.id, url: file(path), kind: "product_image",
      meta: { ...v, category, checks: category === "app" && path ? APP_CHECKS : v.checks },
    }));
  }
  if (job.kind === "video") {
    return CLIPS.map((c, i) => {
      const id = `c${String(i + 1).padStart(2, "0")}`;
      return {
        id: `${job.id}-${id}`, job_id: job.id, url: file(`clips/${id}.mp4`), kind: "clip",
        meta: { ...c, rank: i + 1, thumb_url: file(`clips/${id}.jpg`) },
      };
    });
  }
  return [{ id: `${job.id}-pdf`, job_id: job.id, url: file("carousel.pdf"), kind: "carousel_pdf", meta: carouselMeta(job.id) }];
}

// One finished job per module so every workspace has something to show.
if (db.jobs.length === 0) {
  const past = Date.now() - 60_000;
  createJob("video", { name: "podcast_ep42.mp4" }, past - 2000);
  createJob("product", { name: "honey_jar.jpg", category: "product", props: "eucalyptus leaves", n_variants: 3 }, past - 1000);
  createJob("carousel", { name: "5 funding myths", topic: "5 funding myths" }, past);
}
