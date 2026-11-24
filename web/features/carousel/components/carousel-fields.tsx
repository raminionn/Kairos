"use client";

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
    <div className="space-y-2">
      <input name="topic" placeholder="Topic, e.g. 5 funding myths" aria-label="Topic"
        className="w-full rounded-lg px-1 py-1 text-[15px] outline-none placeholder:text-muted" />
      {showText && (
        <textarea name="text" rows={3} placeholder="Or paste your own text" aria-label="Source text"
          className="w-full rounded-lg border border-line p-2 text-sm outline-none" />
      )}
      <div className="flex flex-wrap gap-1.5 text-sm">
        <button type="button" onClick={() => setShowText((v) => !v)} aria-expanded={showText}
          className="rounded-full border border-line px-3 py-1.5">{showText ? "− Text" : "+ Text"}</button>
        <label className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1">
          <span className="size-2.5 rounded-[3px] bg-yellow" aria-hidden />From video
          <select name="source_job_id" defaultValue="" className="max-w-40 bg-transparent outline-none">
            <option value="">none</option>
            {videos.map((v) => <option key={v.id} value={v.id}>{String(v.input.name ?? v.id)}</option>)}
          </select>
        </label>
      </div>
    </div>
  );
}
