import type { Metadata } from "next";
import Link from "next/link";
import { JobsTable } from "@/features/jobs/components/jobs-table";
import { Rail } from "@/features/workspace/components/rail";

export const metadata: Metadata = { title: "Projects · Kairos" };

export default function ProjectsPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-page text-ink overflow-x-hidden">
      <Rail active="jobs" />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8">
        <div className="mb-6 flex items-center justify-between gap-4 border-b border-line pb-4">
          <div>
            <h1 className="text-xl font-black tracking-tight text-white md:text-2xl uppercase">Projects</h1>
            <p className="mt-0.5 text-xs text-muted md:text-sm">
              Overview of all active and completed creative generations across studio features.
            </p>
          </div>
          <Link
            href="/video"
            className="rounded-xl bg-lime px-5 py-2 text-sm font-extrabold text-black shadow-xs transition-all duration-200 hover:bg-lime/90 hover:-translate-y-px"
          >
            Create
          </Link>
        </div>
        <JobsTable />
      </main>
    </div>
  );
}
