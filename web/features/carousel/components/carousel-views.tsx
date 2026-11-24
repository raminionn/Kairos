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
    <div className="relative aspect-[4/5] overflow-hidden rounded-xl border border-line bg-white">
      {slides[0] && <img src={fileUrl(slides[0])} alt="First slide" className="size-full object-cover" />}
      <span className="absolute right-2 bottom-2 rounded-full bg-ink px-2 py-0.5 text-[11px] text-white">{slides.length} slides</span>
    </div>
  );
}

export function CarouselDrawer({ output }: { output: CarouselOutput }) {
  const { slides } = output.meta;
  const [i, setI] = useState(0);
  const at = Math.min(i, slides.length - 1);

  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-line bg-white">
        {slides[at] && <img src={fileUrl(slides[at])} alt={`Slide ${at + 1} of ${slides.length}`} className="aspect-[4/5] w-full object-cover" />}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <button type="button" onClick={() => setI(at - 1)} disabled={at === 0} className="rounded-lg border border-line px-3 py-1.5 text-sm disabled:opacity-40" aria-label="Previous slide"><ChevronLeft className="size-4" /></button>
        <span className="text-sm text-muted" aria-live="polite">{at + 1} / {slides.length}</span>
        <button type="button" onClick={() => setI(at + 1)} disabled={at >= slides.length - 1} className="rounded-lg border border-line px-3 py-1.5 text-sm disabled:opacity-40" aria-label="Next slide"><ChevronRight className="size-4" /></button>
      </div>
      {output.url && <a href={fileUrl(output.url)} download className="mt-5 flex items-center justify-center gap-1.5 rounded-lg bg-ink px-3 py-2 text-sm text-white"><Download className="size-4" aria-hidden />Download PDF</a>}
      <p className="mt-3 text-xs text-muted">Carousel templates are not final yet.</p>
    </div>
  );
}
