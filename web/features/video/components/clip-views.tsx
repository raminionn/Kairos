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
    <div className="group relative aspect-[9/16] overflow-hidden rounded-2xl border border-line/80 bg-card shadow-xs transition-all duration-300 hover:border-violet2/40 hover:shadow-lg hover:-translate-y-0.5">
      <img
        src={fileUrl(meta.thumb_url)}
        alt={meta.title}
        className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
      <span className="absolute top-2.5 left-2.5 grid size-7 place-items-center rounded-full bg-yellow text-xs font-black text-slate-950 shadow-md">
        #{meta.rank}
      </span>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 via-slate-950/40 to-transparent p-3 pt-10 text-white">
        <p className="line-clamp-2 text-xs font-semibold leading-tight">{meta.title}</p>
        <p className="mt-1.5 flex justify-between text-[11px] opacity-90 font-mono">
          <span className="rounded-md bg-white/20 px-1.5 py-0.5 backdrop-blur-xs">{mmss(meta.end - meta.start)}</span>
          <b className="font-bold text-yellow">{meta.total.toFixed(2)}</b>
        </p>
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
    <div className="space-y-4">
      <video
        controls
        preload="none"
        poster={fileUrl(meta.thumb_url)}
        src={fileUrl(url)}
        className="mx-auto aspect-[9/16] max-h-[46dvh] w-full rounded-2xl border border-line bg-black object-contain shadow-md"
      >
        Your browser cannot play this video.
      </video>

      <div className="rounded-2xl border border-line bg-card/60 p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-base font-bold text-ink">
            #{meta.rank} · {meta.title}
          </h2>
          <b className="font-mono text-lg font-bold text-ink">{meta.total.toFixed(2)}</b>
        </div>
        <p className="mt-0.5 text-xs text-muted">
          {mmss(meta.start)}–{mmss(meta.end)} in the source video
        </p>
      </div>

      <div className="rounded-2xl border border-line bg-card/60 p-4">
        <h3 className="mb-1.5 text-[11px] font-bold tracking-wider text-muted uppercase">Hook</h3>
        <p className="text-sm italic text-ink">“{meta.hook_text}”</p>
      </div>

      <div className="rounded-2xl border border-line bg-card/60 p-4">
        <h3 className="mb-2 text-[11px] font-bold tracking-wider text-muted uppercase">Suggested caption</h3>
        <div className="flex items-start gap-2 rounded-xl border border-line bg-white p-3 text-sm text-ink">
          <p className="flex-1 leading-relaxed">{meta.suggested_caption}</p>
          <button
            type="button"
            onClick={copy}
            className="flex cursor-pointer items-center gap-1 rounded-lg border border-line bg-card px-2.5 py-1 text-xs font-semibold text-ink transition-colors hover:bg-page"
          >
            {copied ? (
              <>
                <Check className="size-3.5 text-pass" aria-hidden />
                Copied
              </>
            ) : (
              <>
                <Copy className="size-3.5" aria-hidden />
                Copy
              </>
            )}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-card/60 p-4">
        <h3 className="mb-3 text-[11px] font-bold tracking-wider text-muted uppercase">Scores (1–10)</h3>
        {SCORES.map(({ key, label }) => (
          <div key={key} className="mb-3">
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-muted font-medium">{label}</span>
              <b className="font-mono font-bold text-ink">{meta.scores[key]}</b>
            </div>
            <div
              className="h-1.5 rounded-full bg-[#e8e8e2]"
              role="meter"
              aria-label={label}
              aria-valuenow={meta.scores[key]}
              aria-valuemin={1}
              aria-valuemax={10}
            >
              <span
                className={`block h-full rounded-full transition-all duration-300 ${
                  key === "retention_risk" ? "bg-pink" : "bg-violet2"
                }`}
                style={{ width: `${meta.scores[key] * 10}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-line bg-card/60 p-4">
        <h3 className="mb-2 text-[11px] font-bold tracking-wider text-muted uppercase">Why this clip</h3>
        <ul className="list-disc space-y-1.5 pl-4 text-xs font-medium text-muted">
          {meta.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-line bg-card/60 p-4">
        <h3 className="mb-1 text-[11px] font-bold tracking-wider text-muted uppercase">Signals</h3>
        <p className="text-xs text-muted">
          {meta.signals.words_per_sec} words/s · energy {meta.signals.audio_energy} · {meta.signals.cut_count} cuts
        </p>
      </div>

      {url && (
        <a
          href={fileUrl(url)}
          download
          className="flex items-center justify-center gap-2 rounded-xl bg-violet2 px-5 py-3 text-sm font-bold text-white shadow-xs transition-colors hover:bg-violet"
        >
          <Download className="size-4" aria-hidden />
          Download clip
        </a>
      )}
    </div>
  );
}
