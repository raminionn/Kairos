// Local runner: with KAIROS_LOCAL=1 the fake API runs the real Python stages on this machine.
// Design: docs/specs/2026-11-24-web-local-runner-design.md. Removed when api/ exists.
import { spawn } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import type { Job, JobKind, Output } from "@/lib/api-types";
import { createJob, setLocalHooks } from "@/mock/store";
import { carouselBrief, runStatus, safeJobFile, understandingMeta } from "./local";

export const LOCAL = process.env.KAIROS_LOCAL === "1";
export const REPO = resolve(process.cwd(), "..");
const PYTHON = process.env.KAIROS_PYTHON ?? join(REPO, ".venv", "Scripts", "python.exe");
const LIMIT = { video: 2 * 1024 ** 3, product: 20 * 1024 ** 2 } as const;
const STAGE = { video: "transcribing", product: "generating", carousel: "building slides" } as const;
const OUTPUT = { video: "understanding.json", product: "result.json", carousel: "carousel.pdf" } as const;

interface Run { kind: JobKind; exitCode: number | null; stderr: string }
const g = globalThis as typeof globalThis & { __kairosRuns?: Map<string, Run> };
const runs = (g.__kairosRuns ??= new Map<string, Run>());

const readJson = (path: string | null) => (path && existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : null);

setLocalHooks({
  state(job) {
    const run = runs.get(job.id);
    if (!run) return undefined;
    const { status, error } = runStatus({
      exitCode: run.exitCode, stderrTail: run.stderr,
      outputExists: existsSync(safeJobFile(REPO, job.id, OUTPUT[run.kind]) ?? ""),
    });
    return { status, error, stage: status === "running" ? STAGE[run.kind] : null, progress: status === "running" ? 50 : status === "done" ? 100 : 0 };
  },
  outputs(job): Output[] {
    const run = runs.get(job.id);
    if (!run) return [];
    if (run.kind === "video") {
      const u = readJson(safeJobFile(REPO, job.id, "understanding.json"));
      return u ? [{ id: `${job.id}-u`, job_id: job.id, url: "", kind: "understanding", meta: understandingMeta(u) }] : [];
    }
    if (run.kind === "carousel") {
      const dir = safeJobFile(REPO, job.id, "carousel.pdf");
      if (!dir || !existsSync(dir)) return [];
      const slides = readdirSync(join(REPO, "data", "jobs", job.id)).filter((f) => /^slide-\d+\.png$/.test(f)).sort();
      return [{ id: `${job.id}-pdf`, job_id: job.id, url: `/files/${job.id}/carousel.pdf`, kind: "carousel_pdf",
        meta: { slides: slides.map((f) => `/files/${job.id}/${f}`) } }];
    }
    const r = readJson(safeJobFile(REPO, job.id, "result.json"));
    return (r?.variants ?? []).map((v: { id: string; path: string; attempts: number; repaired: boolean; passed: boolean; checks: never; fail_reasons: string[] }) => ({
      id: `${job.id}-${v.id}`, job_id: job.id, url: v.path ? `/files/${job.id}/${v.path}` : "", kind: "product_image",
      meta: { category: r.category, attempts: v.attempts, repaired: v.repaired, passed: v.passed, checks: v.checks, fail_reasons: v.fail_reasons },
    }));
  },
});

/** Starts a real run. Returns the new job, or an error message for the user. */
export async function startLocalJob(kind: JobKind, form: FormData, input: Record<string, unknown>): Promise<Job | { problem: string; code: number }> {
  const moduleDir = { video: "understanding", product: "product", carousel: "carousel" }[kind];
  if (!existsSync(join(REPO, moduleDir))) return { problem: `The ${moduleDir} module is not on this branch.`, code: 422 };
  const file = kind === "carousel" ? null : (form.get("file") as File);
  if (file && kind !== "carousel" && file.size > LIMIT[kind]) {
    return { problem: kind === "video" ? "Video must be 2 GB or smaller." : "Image must be 20 MB or smaller.", code: 413 };
  }
  if (!existsSync(PYTHON)) return { problem: `Python not found at ${PYTHON}. Set KAIROS_PYTHON.`, code: 500 };

  const job = createJob(kind, { ...input, local: true });
  const dir = join(REPO, "data", "jobs", job.id);
  await mkdir(dir, { recursive: true });
  let args: string[];
  let cwd = REPO;
  const source = file ? `source${extname(file.name).toLowerCase()}` : "";
  if (file) await writeFile(join(dir, source), Buffer.from(await file.arrayBuffer()));

  if (kind === "carousel") {
    // kairos_carousel runs from inside carousel/ (carousel/README.md).
    await writeFile(join(dir, "brief.json"), JSON.stringify(carouselBrief(input), null, 2));
    args = ["-m", "kairos_carousel", "--brief", join(dir, "brief.json"), "--out", dir];
    cwd = join(REPO, "carousel");
  } else if (kind === "video") {
    args = ["-m", "understanding.run", join(dir, source), "--id", job.id, "--out", dir];
  } else {
    const request = { version: 1, category: input.category, image: source, props: input.props ?? null, n_variants: input.n_variants };
    await writeFile(join(dir, "request.json"), JSON.stringify(request, null, 2));
    args = ["-m", "product", join(dir, "request.json"), join(dir, "result.json")];
  }

  const run: Run = { kind, exitCode: null, stderr: "" };
  runs.set(job.id, run);
  const child = spawn(PYTHON, args, { cwd, windowsHide: true, env: { ...process.env, PYTHONIOENCODING: "utf-8" } });
  child.stderr.on("data", (d: Buffer) => { run.stderr = (run.stderr + d.toString()).slice(-4000); });
  child.on("error", (e) => { run.stderr += `\n${e.message}`; run.exitCode = -1; });
  child.on("close", (code) => { run.exitCode = code ?? -1; });
  return job;
}

/** Bytes of a real file in a local job folder, or null. */
export function readLocalFile(jobId: string, rel: string): { body: Buffer; type: string } | null {
  if (!runs.has(jobId)) return null;
  const path = safeJobFile(REPO, jobId, rel);
  if (!path || !existsSync(path)) return null;
  const type = ({ ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".json": "application/json", ".pdf": "application/pdf" } as Record<string, string>)[extname(path).toLowerCase()] ?? "application/octet-stream";
  return { body: readFileSync(path), type };
}
