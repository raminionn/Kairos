"use client";
/* eslint-disable @next/next/no-img-element -- media come from the API, not from /public */

import { Check, Copy, Download } from "lucide-react";
import { useState } from "react";
import type { ClipMeta, Output } from "@/lib/api-types";
import { fileUrl } from "@/features/jobs/api";

type ClipOutput = Extract<Output, { kind: "clip" }>;

const SCORES: { key: keyof ClipMeta["scores"]; label: string }[] = [
  { key: "hook", label: "Hook" },
  { key: "self_containment", label: "Self-contained" },
  { key: "emotional_peak", label: "Emotional peak" },
  { key: "pacing", label: "Pacing" },
  { key: "genre_fit", label: "Genre fit" },
  { key: "retention_risk", label: "Retention risk (lower is better)" },
];

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function ClipTile({ output }: { output: ClipOutput }) {
  const { meta } = output;
  return (
    <div className="relative aspect-[9/16] overflow-hidden rounded-xl bg-card">
      <img src={fileUrl(meta.thumb_url)} alt={meta.title} className="size-full object-cover" />
      <span className="absolute top-2 left-2 grid size-7 place-items-center rounded-full bg-yellow text-xs font-bold">#{meta.rank}</span>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-8 text-white">
        <p className="line-clamp-2 text-xs leading-tight">{meta.title}</p>
        <p className="mt-1 flex justify-between text-[11px] opacity-80"><span>{mmss(meta.end - meta.start)}</span><b className="font-semibold">{meta.total.toFixed(2)}</b></p>
      </div>
    </div>
  );
}

export function ClipDrawer({ output }: { output: ClipOutput }) {
  const { meta, url } = output;
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(meta.suggested_caption);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div>
      <video controls preload="none" poster={fileUrl(meta.thumb_url)} src={fileUrl(url)} className="mx-auto aspect-[9/16] max-h-[50dvh] rounded-xl bg-ink">
        Your browser cannot play this video.
      </video>
      <div className="mt-4 flex items-baseline justify-between gap-3">
        <h2 className="font-medium">#{meta.rank} · {meta.title}</h2>
        <b className="text-lg font-light">{meta.total.toFixed(2)}</b>
      </div>
      <p className="text-xs text-muted">{mmss(meta.start)}–{mmss(meta.end)} in the source video</p>

      <h3 className="mt-4 mb-1 text-[11px] tracking-widest text-muted uppercase">Hook</h3>
      <p className="text-sm">“{meta.hook_text}”</p>

      <h3 className="mt-4 mb-1 text-[11px] tracking-widest text-muted uppercase">Suggested caption</h3>
      <div className="flex items-start gap-2 rounded-lg bg-card p-2 text-sm">
        <p className="flex-1">{meta.suggested_caption}</p>
        <button type="button" onClick={copy} className="flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs">{copied ? <><Check className="size-3.5" aria-hidden />Copied</> : <><Copy className="size-3.5" aria-hidden />Copy</>}</button>
      </div>

      <h3 className="mt-5 mb-2 text-[11px] tracking-widest text-muted uppercase">Scores (1–10)</h3>
      {SCORES.map(({ key, label }) => (
        <div key={key} className="mb-2.5">
          <div className="mb-1 flex justify-between text-sm"><span>{label}</span><b className="font-medium">{meta.scores[key]}</b></div>
          <div className="h-1.5 rounded-full bg-[#eee]" role="meter" aria-label={label} aria-valuenow={meta.scores[key]} aria-valuemin={1} aria-valuemax={10}>
            <span className={`block h-full rounded-full ${key === "retention_risk" ? "bg-pink" : "bg-violet2"}`} style={{ width: `${meta.scores[key] * 10}%` }} />
          </div>
        </div>
      ))}

      <h3 className="mt-5 mb-2 text-[11px] tracking-widest text-muted uppercase">Why this clip</h3>
      <ul className="list-disc space-y-1 pl-5 text-sm">{meta.reasons.map((r) => <li key={r}>{r}</li>)}</ul>

      <h3 className="mt-5 mb-1 text-[11px] tracking-widest text-muted uppercase">Signals</h3>
      <p className="text-sm text-muted">
        {meta.signals.words_per_sec} words/s · energy {meta.signals.audio_energy} · {meta.signals.cut_count} cuts
      </p>

      {url && <a href={fileUrl(url)} download className="mt-5 flex items-center justify-center gap-1.5 rounded-lg bg-ink px-3 py-2 text-sm text-white"><Download className="size-4" aria-hidden />Download clip</a>}
    </div>
  );
}
