"use client";

import { Clapperboard, Film, X } from "lucide-react";
import { useState } from "react";

export function VideoFields() {
  const [file, setFile] = useState<File | null>(null);

  return (
    <div className="space-y-4">
      {/* Higgsfield-Style Reference Video Dropzone Card */}
      <div>
        <label className="text-[11px] font-bold tracking-wider text-muted uppercase block mb-1.5">
          Reference Video
        </label>
        {file ? (
          <div className="relative flex items-center gap-3 rounded-2xl border border-line bg-card/70 p-3 shadow-xs">
            <div className="grid size-12 place-items-center rounded-xl bg-violet2/10 text-violet2 shrink-0">
              <Film className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-ink">{file.name}</p>
              <p className="text-[10px] text-muted font-mono mt-0.5">
                {(file.size / (1024 * 1024)).toFixed(1)} MB
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFile(null)}
              className="cursor-pointer rounded-lg p-1.5 text-muted hover:bg-white hover:text-ink transition-colors"
              aria-label="Remove video"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <label
            className="group flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-line bg-card/40 p-6 text-center cursor-pointer transition-all duration-200 hover:border-violet2 hover:bg-card/80 focus-within:ring-2 focus-within:ring-violet2 focus-within:outline-none"
            title="Upload raw footage"
          >
            <div className="mb-2 grid size-10 place-items-center rounded-full bg-violet2/10 text-violet2 transition-transform duration-200 group-hover:scale-110">
              <Clapperboard className="size-5" />
            </div>
            <span className="text-xs font-bold text-ink">Add a reference video to extract motion</span>
            <span className="mt-0.5 text-[10px] text-muted">Video duration: 4 to 30 seconds · MP4, MOV, WebM</span>
            <input
              type="file"
              name="file"
              accept=".mp4,.mov,.mkv,.webm"
              className="sr-only"
              aria-label="Video file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
        )}
      </div>

      <div className="rounded-xl border border-line/70 bg-card/40 p-3 text-xs text-muted leading-relaxed">
        <p className="font-semibold text-ink mb-1">AI Motion & Hook Analysis</p>
        The engine analyzes speech hooks, camera pacing, and audio energy to produce ranked viral short clips.
      </div>
    </div>
  );
}
