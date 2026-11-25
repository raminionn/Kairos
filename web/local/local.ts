// Pure helpers for the local runner (KAIROS_LOCAL=1). See docs/specs/2026-11-24-web-local-runner-design.md.
import { isAbsolute, join, relative, resolve } from "node:path";
import type { JobStatus, UnderstandingMeta } from "@/lib/api-types";
import { splitPoint } from "@/mock/validate";

const JOB_ID = /^[\w-]+$/;

/** Absolute path of `rel` inside data/jobs/<jobId>/, or null when it would leave that folder. */
export function safeJobFile(repoRoot: string, jobId: string, rel: string): string | null {
  if (!JOB_ID.test(jobId) || isAbsolute(rel) || /^[a-zA-Z]:/.test(rel)) return null;
  const dir = resolve(repoRoot, "data", "jobs", jobId);
  const full = resolve(dir, rel);
  const inside = relative(dir, full);
  return inside && !inside.startsWith("..") && !isAbsolute(inside) ? join(dir, inside) : null;
}

export interface RunState {
  /** null while the process is still alive. */
  exitCode: number | null;
  outputExists: boolean;
  stderrTail: string;
}

export function runStatus({ exitCode, outputExists, stderrTail }: RunState): { status: JobStatus; error: string | null } {
  if (exitCode === null) return { status: "running", error: null };
  if (exitCode === 0 && outputExists) return { status: "done", error: null };
  if (exitCode === 0) return { status: "failed", error: "The stage finished without writing its output." };
  const last = stderrTail.trim().split(/\r?\n/).at(-1)?.trim();
  return { status: "failed", error: last || `The stage failed (exit code ${exitCode}).` };
}

/** contracts/understanding.py -> what the transcript panel shows (word timings dropped: large, unused). */
export function understandingMeta(u: {
  duration: number; route: string; speech_ratio: number; asr_confidence: number; genre: string; genre_confidence: number;
  words?: unknown[]; [extra: string]: unknown; segments: { start: number; end: number; text: string | null; visual: string | null }[];
}): UnderstandingMeta {
  return {
    duration: u.duration, route: u.route, speech_ratio: u.speech_ratio, asr_confidence: u.asr_confidence,
    genre: u.genre, genre_confidence: u.genre_confidence, word_count: u.words?.length ?? 0,
    segments: u.segments.map(({ start, end, text, visual }) => ({ start, end, text, visual })),
  };
}

/** Carousel form input (mock/validate.ts) -> kairos_carousel brief JSON. Points split by splitPoint. */
export function carouselBrief(input: Record<string, unknown>) {
  const points = (input.points as string[]).map(splitPoint);
  return {
    brand: { name: input.brand_name, primary: input.primary },
    topic: input.topic,
    goal: input.goal,
    ...(input.problem ? { problem: input.problem } : {}),
    points,
  };
}
