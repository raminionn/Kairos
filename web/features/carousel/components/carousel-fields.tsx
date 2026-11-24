"use client";

import { Minus, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import type { Job } from "@/lib/api-types";
import { listJobs } from "@/features/jobs/api";

export function CarouselFields() {
  const [videos, setVideos] = useState<Job[]>([]);
  const [showText, setShowText] = useState(false);

  useEffect(() => {
    let alive = true;
    listJobs()
      .then((all) => alive && setVideos(all.filter((j) => j.kind === "video" && j.status === "done")))
      .catch(() => {}); // the source list is optional; the feed shows the offline banner
    return () => { alive = false; };
  }, []);

  return (
    <div className="space-y-2.5">
      <input
        name="topic"
        placeholder="Describe the carousel topic, e.g. 5 SaaS growth myths..."
        aria-label="Topic"
        className="w-full bg-transparent px-1 py-1 text-base text-ink outline-none placeholder:text-muted/70 font-normal"
      />
      {showText && (
        <textarea
          name="text"
          rows={3}
          placeholder="Or paste your source text here..."
          aria-label="Source text"
          className="w-full rounded-xl border border-line bg-card/60 p-2.5 text-sm text-ink outline-none placeholder:text-muted focus:border-violet2"
        />
      )}
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setShowText((v) => !v)}
          aria-expanded={showText}
          className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-line bg-card/60 px-3 py-1.5 text-muted transition-colors hover:border-line hover:text-ink"
        >
          {showText ? <Minus className="size-3.5" aria-hidden /> : <Plus className="size-3.5" aria-hidden />}
          Source text
        </button>
        <label className="flex items-center gap-1.5 rounded-xl border border-line bg-card/60 px-3 py-1.5 text-muted hover:border-line">
          <span className="size-2 rounded-full bg-yellow" aria-hidden />
          From video:
          <select
            name="source_job_id"
            defaultValue=""
            className="max-w-40 cursor-pointer bg-transparent text-ink font-semibold outline-none truncate"
          >
            <option value="" className="bg-white text-ink">
              none
            </option>
            {videos.map((v) => (
              <option key={v.id} value={v.id} className="bg-white text-ink">
                {String(v.input?.name ?? v.id)}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
