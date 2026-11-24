"use client";

import { Film } from "lucide-react";
import { useState } from "react";

export function VideoFields() {
  const [name, setName] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-semibold text-muted">
        <span>Upload raw footage to detect, rank and caption viral short clips</span>
        <span>mp4, mov, mkv, webm</span>
      </div>
      <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-line bg-card/70 px-3 py-2 text-xs font-semibold text-ink transition-colors hover:bg-card focus-within:ring-2 focus-within:ring-violet2">
        <Film className="size-4.5 text-violet2" strokeWidth={2} aria-hidden />
        <span className="truncate text-sm font-medium">{name ?? "Choose a long video to clip..."}</span>
        <input
          type="file"
          name="file"
          accept=".mp4,.mov,.mkv,.webm"
          className="sr-only"
          aria-label="Video file"
          onChange={(e) => setName(e.target.files?.[0]?.name ?? null)}
        />
      </label>
    </div>
  );
}
