import type { Metadata } from "next";
import Link from "next/link";
import { JobsTable } from "@/features/jobs/components/jobs-table";

export const metadata: Metadata = { title: "Projects · Kairos" };

export default function ProjectsPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/video"
            aria-label="Kairos home"
            className="grid size-9.5 place-items-center rounded-xl bg-violet2 text-sm font-bold tracking-tight text-white shadow-xs transition-transform duration-200 hover:scale-105"
          >
            k
          </Link>
          <h1 className="font-wide text-3xl font-light tracking-tight text-ink sm:text-4xl">Projects</h1>
        </div>
        <Link
          href="/video"
          className="rounded-xl bg-violet2 px-5 py-2.5 text-sm font-medium text-white shadow-xs transition-all duration-200 hover:bg-violet hover:-translate-y-px hover:shadow-md"
        >
          Create
        </Link>
      </div>
      <JobsTable />
    </main>
  );
}
