"use client";

import { useEffect, useState } from "react";
import { Field, inputClass } from "@/components/ui/field";
import type { Job } from "@/lib/api-types";
import { listJobs } from "@/features/jobs/api";

export function CarouselFields() {
  const [videos, setVideos] = useState<Job[]>([]);

  useEffect(() => {
    let alive = true;
    listJobs()
      .then((all) => alive && setVideos(all.filter((j) => j.kind === "video" && j.status === "done")))
      .catch(() => {}); // the source list is optional; the page shows the offline banner
    return () => { alive = false; };
  }, []);

  return (
    <>
      <Field label="Topic" htmlFor="topic">
        <input id="topic" name="topic" placeholder="e.g. 5 funding myths every founder believes" className={inputClass} />
      </Field>
      <Field label="Your text" hint="Optional" htmlFor="text">
        <textarea id="text" name="text" rows={3} placeholder="Paste notes or a post to turn into slides" className={`${inputClass} resize-none`} />
      </Field>
      <Field label="From a video" hint="Optional" htmlFor="source_job_id">
        <select id="source_job_id" name="source_job_id" defaultValue="" className={inputClass}>
          <option value="">None</option>
          {videos.map((v) => <option key={v.id} value={v.id}>{String(v.input?.name ?? v.id)}</option>)}
        </select>
      </Field>
    </>
  );
}
