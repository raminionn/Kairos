import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles } from "lucide-react";
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
            className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-violet-600 via-indigo-600 to-violet-700 text-sm font-bold tracking-tight text-white shadow-md shadow-violet-600/25 transition-transform duration-200 hover:scale-105"
          >
            k
          </Link>
          <h1 className="font-wide text-3xl font-light tracking-tight text-ink sm:text-4xl">Projects</h1>
        </div>
        <Link
          href="/video"
          className="flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-violet-600/30 transition-all duration-200 hover:from-violet-500 hover:to-indigo-500 hover:-translate-y-px hover:shadow-violet-600/40"
        >
          Create
          <Sparkles className="size-4" aria-hidden />
        </Link>
      </div>
      <JobsTable />
    </main>
  );
}
