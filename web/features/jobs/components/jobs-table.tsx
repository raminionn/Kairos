"use client";

import Link from "next/link";
import { StatusChip } from "@/components/ui/status-chip";
import { KIND_DOT, KIND_ICON, KIND_LABEL, timeAgo } from "../kinds";
import { useJobFeed } from "../use-job-feed";

function KindBadge({ kind }: { kind: keyof typeof KIND_ICON }) {
  const Icon = KIND_ICON[kind];
  return (
    <span className="relative grid size-10 place-items-center rounded-xl border border-line bg-card text-ink shadow-xs" aria-hidden>
      <Icon className="size-4.5" strokeWidth={1.75} />
      <span className={`absolute -top-0.5 -right-0.5 size-2.5 rounded-full border-2 border-white ${KIND_DOT[kind]}`} />
    </span>
  );
}

export function JobsTable() {
  const { jobs, offline, loaded } = useJobFeed();

  return (
    <div>
      {offline && (
        <p
          role="status"
          className="mb-4 rounded-xl border border-fail/30 bg-[#fee2e2] px-4 py-2.5 text-sm font-medium text-fail shadow-xs"
        >
          Can&apos;t reach the server. Retrying…
        </p>
      )}
      {loaded && jobs.length === 0 && (
        <p className="rounded-2xl border border-line bg-card px-6 py-14 text-center text-sm text-muted">
          No projects yet. Create one from Video, Product or Carousel.
        </p>
      )}
      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
        {jobs.map((j) => (
          <li key={j.id}>
            <Link
              href={`/${j.kind}/${j.id}`}
              className="grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-2.5 px-5 py-4 transition-colors duration-150 hover:bg-page sm:grid-cols-[auto_1fr_auto_10rem_7rem]"
            >
              <KindBadge kind={j.kind} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-ink sm:text-base">
                  {String(j.input?.name ?? j.id)}
                </span>
                <span className="text-xs text-muted">{KIND_LABEL[j.kind]}</span>
              </span>
              <StatusChip job={j} />
              <span className="col-span-3 h-1.5 overflow-hidden rounded-full bg-card sm:col-span-1" aria-label={`${j.progress}% done`}>
                <span
                  className={`block h-full rounded-full transition-[width] duration-700 ${
                    j.status === "failed" ? "bg-fail" : "bg-violet2"
                  }`}
                  style={{ width: `${j.progress}%` }}
                />
              </span>
              <span className="hidden text-right text-xs text-muted sm:block font-mono">{timeAgo(j.created_at)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
