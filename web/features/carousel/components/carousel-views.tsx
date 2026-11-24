"use client";
/* eslint-disable @next/next/no-img-element -- media come from the API, not from /public */

import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { useState } from "react";
import type { Output } from "@/lib/api-types";
import { fileUrl } from "@/features/jobs/api";

type CarouselOutput = Extract<Output, { kind: "carousel_pdf" }>;

export function CarouselTile({ output }: { output: CarouselOutput }) {
  const { slides } = output.meta;
  return (
    <div className="group relative aspect-[4/5] overflow-hidden rounded-xl border border-line bg-card shadow-sm transition-all duration-300 hover:border-violet-500/40 hover:shadow-lg hover:shadow-violet-500/10">
      {slides[0] && (
        <img
          src={fileUrl(slides[0])}
          alt="First slide"
          className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      )}
      <span className="absolute right-2.5 bottom-2.5 rounded-full border border-white/15 bg-black/80 px-2.5 py-0.5 text-[11px] font-medium text-white shadow-sm backdrop-blur-xs">
        {slides.length} slides
      </span>
    </div>
  );
}

export function CarouselDrawer({ output }: { output: CarouselOutput }) {
  const { slides } = output.meta;
  const [i, setI] = useState(0);
  const at = Math.min(i, slides.length - 1);

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-line bg-card shadow-lg">
        {slides[at] && (
          <img
            src={fileUrl(slides[at])}
            alt={`Slide ${at + 1} of ${slides.length}`}
            className="aspect-[4/5] w-full object-cover"
          />
        )}
      </div>
      <div className="flex items-center justify-between rounded-xl border border-line bg-card/40 p-2 backdrop-blur-xs">
        <button
          type="button"
          onClick={() => setI(at - 1)}
          disabled={at === 0}
          className="cursor-pointer rounded-lg border border-line bg-white/5 p-1.5 text-ink transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Previous slide"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="font-mono text-sm font-medium text-muted" aria-live="polite">
          {at + 1} / {slides.length}
        </span>
        <button
          type="button"
          onClick={() => setI(at + 1)}
          disabled={at >= slides.length - 1}
          className="cursor-pointer rounded-lg border border-line bg-white/5 p-1.5 text-ink transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Next slide"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
      {output.url && (
        <a
          href={fileUrl(output.url)}
          download
          className="flex items-center justify-center gap-1.5 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-page transition-colors hover:bg-white"
        >
          <Download className="size-4" aria-hidden />
          Download PDF
        </a>
      )}
      <p className="text-center text-xs text-muted/70">Carousel templates are not final yet.</p>
    </div>
  );
}
