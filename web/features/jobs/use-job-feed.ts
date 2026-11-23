"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Job, JobKind, Output } from "@/lib/api-types";
import { createJob, getOutputs, listJobs } from "./api";

const POLL_MS = 2000;
const busy = (j: Job) => j.status === "queued" || j.status === "running";

/**
 * Jobs (optionally of one kind), newest first, plus outputs of finished jobs of that kind.
 * `all` holds every job, for module-wide status such as the rail's running dots.
 * Polls every 2 s while a job is queued or running, or while the server is unreachable.
 */
export function useJobFeed(kind?: JobKind) {
  const [all, setAll] = useState<Job[]>([]);
  const [outputs, setOutputs] = useState<Record<string, Output[]>>({});
  const [offline, setOffline] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const kick = useRef<() => void>(() => {});

  useEffect(() => {
    let alive = true;
    let timer: number | undefined;
    const requested = new Set<string>();

    const tick = async () => {
      window.clearTimeout(timer);
      let again = true;
      try {
        const fresh = await listJobs();
        const list = kind ? fresh.filter((j) => j.kind === kind) : fresh;
        if (!alive) return;
        setAll(fresh);
        setOffline(false);
        setLoaded(true);
        again = fresh.some(busy);
        for (const j of list) {
          if (j.status !== "done" || requested.has(j.id)) continue;
          requested.add(j.id);
          getOutputs(j.id)
            .then((o) => alive && setOutputs((prev) => ({ ...prev, [j.id]: o })))
            .catch(() => requested.delete(j.id)); // retried on the next tick
        }
      } catch {
        if (alive) setOffline(true);
      }
      if (again && alive) timer = window.setTimeout(tick, POLL_MS);
    };

    kick.current = () => void tick();
    void tick();
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [kind]);

  const submit = useCallback(
    async (form: FormData): Promise<{ error?: string }> => {
      if (!kind) return { error: "Pick a module first." };
      try {
        await createJob(kind, form);
      } catch (e) {
        return { error: e instanceof Error ? e.message : "Something went wrong." };
      }
      kick.current();
      return {};
    },
    [kind],
  );

  const jobs = kind ? all.filter((j) => j.kind === kind) : all;
  return { jobs, all, outputs, offline, loaded, submit };
}
