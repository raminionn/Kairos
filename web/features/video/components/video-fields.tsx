"use client";

import { Film } from "lucide-react";
import { useState } from "react";

export function VideoFields() {
  const [name, setName] = useState<string | null>(null);
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl p-1 has-focus-visible:outline-2 has-focus-visible:outline-violet2">
      <span className="grid size-14 shrink-0 place-items-center rounded-xl border border-dashed border-[#cfcfc8] bg-card text-muted">
        <Film className="size-5" strokeWidth={1.75} aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[15px]">{name ?? "Choose a long video"}</span>
        <span className="text-xs text-muted">mp4, mov, mkv or webm. Kairos finds, ranks and captions the best moments.</span>
      </span>
      <input type="file" name="file" accept=".mp4,.mov,.mkv,.webm" className="sr-only" aria-label="Video file"
        onChange={(e) => setName(e.target.files?.[0]?.name ?? null)} />
    </label>
  );
}
