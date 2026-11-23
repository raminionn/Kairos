"use client";

import { useState } from "react";

export function VideoFields() {
  const [name, setName] = useState<string | null>(null);
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl p-1 has-focus-visible:outline-2 has-focus-visible:outline-violet2">
      <span className="grid size-14 shrink-0 place-items-center rounded-xl border border-dashed border-[#cfcfc8] bg-card text-muted">
        <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><rect x="6" y="2" width="12" height="20" rx="3" /><path d="M10.5 9.5l4 2.5-4 2.5z" fill="currentColor" /></svg>
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
