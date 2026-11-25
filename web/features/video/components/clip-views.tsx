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
    <div className="group relative aspect-[9/16] overflow-hidden rounded-2xl border border-line bg-[#12131a] shadow-xs transition-all duration-300 hover:border-lime/40 hover:shadow-lg hover:-translate-y-0.5">
      <img
        src={fileUrl(meta.thumb_url)}
        alt={meta.title}
        className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
      <span className="absolute top-2.5 left-2.5 grid size-7 place-items-center rounded-full bg-lime text-xs font-black text-black shadow-md">
        #{meta.rank}
      </span>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 pt-10 text-white">
        <p className="line-clamp-2 text-xs font-bold leading-tight">{meta.title}</p>
        <p className="mt-1.5 flex justify-between text-[11px] font-mono">
          <span className="rounded-md bg-white/20 px-1.5 py-0.5 backdrop-blur-xs text-white">{mmss(meta.end - meta.start)}</span>
          <b className="font-bold text-lime">{meta.total.toFixed(2)}</b>
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
        src={fileUrl(url)}
        controls
        poster={fileUrl(meta.thumb_url)}
        className="aspect-[9/16] w-full rounded-2xl border border-line bg-black object-cover shadow-sm"
      />

      <div className="rounded-2xl border border-line bg-[#13141d] p-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-base font-bold text-white tracking-tight">{meta.title}</h2>
          <span className="shrink-0 rounded-full bg-lime/10 px-2.5 py-0.5 text-xs font-black text-lime border border-lime/30">
            #{meta.rank}
          </span>
        </div>
        <p className="mt-2 text-xs text-muted leading-relaxed italic border-l-2 border-line pl-3 font-serif">
          &ldquo;{meta.hook_text}&rdquo;
        </p>
      </div>

      <div className="rounded-2xl border border-line bg-[#13141d] p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-bold tracking-wider text-muted uppercase">Suggested caption</span>
          <button
            type="button"
            onClick={copy}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-[#191a26] px-2.5 py-1 text-xs font-bold text-white transition-colors hover:bg-[#222434]"
          >
            {copied ? (
              <>
                <Check className="size-3.5 text-pass" aria-hidden />
                Copied!
              </>
            ) : (
              <>
                <Copy className="size-3.5 text-muted" aria-hidden />
                Copy
              </>
            )}
          </button>
        </div>
        <p className="text-xs text-muted leading-relaxed select-all whitespace-pre-wrap">{meta.suggested_caption}</p>
      </div>

      <div className="rounded-2xl border border-line bg-[#13141d] p-4 space-y-2.5">
        <div className="flex items-center justify-between border-b border-line pb-2">
          <span className="text-[11px] font-bold tracking-wider text-muted uppercase">Virality scores</span>
          <span className="font-mono text-xs font-black text-lime">{meta.total.toFixed(2)} / 10</span>
        </div>
        {SCORES.map(({ key, label }) => (
          <div key={key} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted">{label}</span>
              <span className="font-mono font-semibold text-white">{meta.scores[key].toFixed(1)}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  key === "retention_risk"
                    ? meta.scores[key] > 5 ? "bg-fail" : "bg-pass"
                    : "bg-lime"
                }`}
                style={{ width: `${meta.scores[key] * 10}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-line bg-[#13141d] p-4">
        <h3 className="mb-2 text-[11px] font-bold tracking-wider text-muted uppercase">Why this clip</h3>
        <ul className="list-disc space-y-1.5 pl-4 text-xs font-medium text-muted">
          {meta.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-line bg-[#13141d] p-4">
        <h3 className="mb-1 text-[11px] font-bold tracking-wider text-muted uppercase">Signals</h3>
        <p className="text-xs text-muted">
          {meta.signals.words_per_sec} words/s · energy {meta.signals.audio_energy} · {meta.signals.cut_count} cuts
        </p>
      </div>

      {url && (
        <a
          href={fileUrl(url)}
          download
          className="flex items-center justify-center gap-2 rounded-xl bg-lime px-5 py-3 text-sm font-extrabold text-black shadow-xs transition-colors hover:bg-lime/90"
        >
          <Download className="size-4" aria-hidden />
          Download clip
        </a>
      )}
    </div>
  );
}
