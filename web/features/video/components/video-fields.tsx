"use client";

import { Film } from "lucide-react";
import { useState } from "react";

export function VideoFields() {
  const [name, setName] = useState<string | null>(null);
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl p-1 transition-colors hover:bg-white/[0.02] focus-within:ring-2 focus-within:ring-violet2">
      <span className="grid size-13 shrink-0 place-items-center rounded-xl border border-dashed border-white/20 bg-card/70 text-muted transition-colors hover:border-violet-500/50 hover:bg-card">
        <Film className="size-5" strokeWidth={1.75} aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[15px] font-medium text-ink">{name ?? "Choose a long video"}</span>
        <span className="text-xs text-muted/80">mp4, mov, mkv or webm. Kairos finds, ranks and captions the best moments.</span>
      </span>
      <input
        type="file"
        name="file"
        accept=".mp4,.mov,.mkv,.webm"
        className="sr-only"
        aria-label="Video file"
        onChange={(e) => setName(e.target.files?.[0]?.name ?? null)}
      />
    </label>
  );
}
