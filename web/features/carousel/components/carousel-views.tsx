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
    <div className="group relative aspect-[4/5] overflow-hidden rounded-xl border border-line bg-white shadow-xs transition-all duration-300 hover:border-violet2/40 hover:shadow-md">
      {slides[0] && (
        <img
          src={fileUrl(slides[0])}
          alt="First slide"
          className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      )}
      <span className="absolute right-2.5 bottom-2.5 rounded-full bg-ink px-2.5 py-0.5 text-[11px] font-medium text-white shadow-xs">
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
      <div className="overflow-hidden rounded-xl border border-line bg-white shadow-md">
        {slides[at] && (
          <img
            src={fileUrl(slides[at])}
            alt={`Slide ${at + 1} of ${slides.length}`}
            className="aspect-[4/5] w-full object-cover"
          />
        )}
      </div>
      <div className="flex items-center justify-between rounded-xl border border-line bg-card/60 p-2">
        <button
          type="button"
          onClick={() => setI(at - 1)}
          disabled={at === 0}
          className="cursor-pointer rounded-lg border border-line bg-white p-1.5 text-ink transition-colors hover:bg-card disabled:cursor-not-allowed disabled:opacity-40"
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
          className="cursor-pointer rounded-lg border border-line bg-white p-1.5 text-ink transition-colors hover:bg-card disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Next slide"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
      {output.url && (
        <a
          href={fileUrl(output.url)}
          download
          className="flex items-center justify-center gap-1.5 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-black"
        >
          <Download className="size-4" aria-hidden />
          Download PDF
        </a>
      )}
      <p className="text-center text-xs text-muted">Carousel templates are not final yet.</p>
    </div>
  );
}
