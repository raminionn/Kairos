import type { Job } from "@/lib/api-types";

/**
 * Keep polling while any job is queued or running, or while a finished job in
 * `withOutputs` still lacks its outputs (so a failed outputs fetch is retried).
 */
export function shouldPoll(all: Job[], withOutputs: Job[], loadedIds: Set<string>): boolean {
  return (
    all.some((j) => j.status === "queued" || j.status === "running") ||
    withOutputs.some((j) => j.status === "done" && !loadedIds.has(j.id))
  );
}
