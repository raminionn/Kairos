"use client";

import Link from "next/link";
import { StatusChip } from "@/components/ui/status-chip";
import { KIND_DOT, KIND_LABEL, timeAgo } from "../kinds";
import { useJobFeed } from "../use-job-feed";

export function JobsTable() {
  const { jobs, offline, loaded } = useJobFeed();

  return (
    <div>
      {offline && <p role="status" className="mb-4 rounded-xl bg-[#fee2e2] px-4 py-2 text-sm text-fail">Can&apos;t reach the server. Retrying…</p>}
      {loaded && jobs.length === 0 && (
        <p className="rounded-2xl bg-card px-6 py-10 text-center text-muted">No jobs yet. Start one from Video, Product or Carousel.</p>
      )}
      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
        {jobs.map((j) => (
          <li key={j.id}>
            <Link href={`/${j.kind}/${j.id}`} className="grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-2 px-5 py-4 hover:bg-page sm:grid-cols-[auto_1fr_auto_10rem_7rem]">
              <span className={`size-2.5 rounded-full ${KIND_DOT[j.kind]}`} aria-hidden />
              <span className="min-w-0">
                <span className="block truncate font-medium">{String(j.input?.name ?? j.id)}</span>
                <span className="text-xs text-muted">{KIND_LABEL[j.kind]}</span>
              </span>
              <StatusChip job={j} />
              <span className="col-span-3 h-1.5 overflow-hidden rounded-full bg-card sm:col-span-1" aria-label={`${j.progress}% done`}>
                <span className={`block h-full rounded-full transition-[width] duration-700 ${j.status === "failed" ? "bg-fail" : "bg-violet2"}`} style={{ width: `${j.progress}%` }} />
              </span>
              <span className="hidden text-right text-xs text-muted sm:block">{timeAgo(j.created_at)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
