import type { Metadata } from "next";
import Link from "next/link";
import { JobsTable } from "@/features/jobs/components/jobs-table";

export const metadata: Metadata = { title: "Jobs · Kairos" };

export default function JobsPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-8">
      <div className="mb-8 flex items-end justify-between gap-4">
        <h1 className="font-wide text-4xl font-light tracking-tight">Jobs</h1>
        <Link href="/video" className="rounded-xl bg-ink px-4 py-2.5 text-sm text-white hover:-translate-y-px">New Job</Link>
      </div>
      <JobsTable />
    </main>
  );
}
