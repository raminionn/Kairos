"use client";

import { GalleryHorizontalEnd, Minus, Plus } from "lucide-react";
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
    <div className="space-y-4">
      {/* Topic Prompt Textarea */}
      <div>
        <label htmlFor="carousel-topic" className="text-[11px] font-bold tracking-wider text-muted uppercase block mb-1.5">
          Carousel Topic
        </label>
        <textarea
          id="carousel-topic"
          name="topic"
          rows={3}
          placeholder="Describe the carousel topic, e.g. 5 SaaS growth myths every founder falls for..."
          aria-label="Topic"
          className="w-full rounded-xl border border-line bg-card/60 p-3 text-xs text-ink outline-none transition-all placeholder:text-muted focus:border-violet2 focus:bg-white focus:ring-2 focus:ring-violet2/20 resize-none font-normal leading-relaxed"
        />
      </div>

      {/* Optional Source Text */}
      {showText && (
        <div>
          <label htmlFor="carousel-source" className="text-[11px] font-bold tracking-wider text-muted uppercase block mb-1.5">
            Source Text
          </label>
          <textarea
            id="carousel-source"
            name="text"
            rows={4}
            placeholder="Paste your source article, notes, or transcript here..."
            aria-label="Source text"
            className="w-full rounded-xl border border-line bg-card/60 p-3 text-xs text-ink outline-none transition-all placeholder:text-muted focus:border-violet2 focus:bg-white focus:ring-2 focus:ring-violet2/20 resize-none font-normal leading-relaxed"
          />
        </div>
      )}

      {/* Controls row */}
      <div className="flex flex-col gap-2.5">
        <button
          type="button"
          onClick={() => setShowText((v) => !v)}
          aria-expanded={showText}
          className="flex cursor-pointer items-center justify-between rounded-xl border border-line bg-card/60 px-3.5 py-2 text-xs font-semibold text-muted transition-colors hover:border-line hover:text-ink"
        >
          <span className="flex items-center gap-1.5">
            {showText ? <Minus className="size-3.5" aria-hidden /> : <Plus className="size-3.5" aria-hidden />}
            Add source text
          </span>
          <span className="text-[10px] text-muted">optional</span>
        </button>

        <label className="flex items-center justify-between rounded-xl border border-line bg-card/60 px-3.5 py-2 text-xs font-semibold text-muted">
          <span className="flex items-center gap-2">
            <GalleryHorizontalEnd className="size-3.5 text-violet2" aria-hidden />
            From video:
          </span>
          <select
            name="source_job_id"
            defaultValue=""
            aria-label="Source video"
            className="max-w-44 cursor-pointer rounded-lg border border-line/60 bg-white px-2 py-1 text-xs font-bold text-ink outline-none focus:border-violet2 truncate"
          >
            <option value="" className="bg-white text-ink">
              None (topic only)
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
