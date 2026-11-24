import { FileText } from "lucide-react";
import type { Output } from "@/lib/api-types";

type UnderstandingOutput = Extract<Output, { kind: "understanding" }>;

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const pct = (v: number) => `${Math.round(v * 100)}%`;

/** Real stage-1 result (Rameen's understanding.json) from the local runner. */
export function TranscriptTile({ output }: { output: UnderstandingOutput }) {
  const m = output.meta;
  return (
    <div className="flex aspect-[9/16] flex-col justify-between rounded-xl border border-line bg-card p-3 text-left">
      <FileText className="size-6 text-muted" strokeWidth={1.5} aria-hidden />
      <div>
        <p className="text-sm font-medium">Transcript</p>
        <p className="mt-1 text-xs text-muted">{m.route} · {m.genre} · {mmss(m.duration)}</p>
        <p className="text-xs text-muted">{m.word_count} words · {m.segments.length} segments</p>
      </div>
    </div>
  );
}

export function TranscriptDrawer({ output }: { output: UnderstandingOutput }) {
  const m = output.meta;
  const facts: [string, string][] = [
    ["Route", m.route], ["Genre", m.genre === "unknown" ? "unknown (classifier not built yet)" : `${m.genre} (${pct(m.genre_confidence)})`],
    ["Duration", mmss(m.duration)], ["Speech", pct(m.speech_ratio)], ["Speech-to-text confidence", pct(m.asr_confidence)],
  ];
  return (
    <div>
      <h2 className="font-medium">Video understanding</h2>
      <p className="mt-1 text-xs text-muted">Real output of the understanding stage. Clips appear here once the decision stage is built.</p>
      <div className="mt-4">
        {facts.map(([k, v]) => (
          <div key={k} className="flex justify-between border-b border-line py-1.5 text-sm"><span className="text-muted">{k}</span><b className="font-medium">{v}</b></div>
        ))}
      </div>
      <h3 className="mt-5 mb-2 text-[11px] tracking-widest text-muted uppercase">Transcript</h3>
      <ol className="space-y-2 text-sm">
        {m.segments.map((s) => (
          <li key={s.start} className="flex gap-3">
            <span className="w-10 shrink-0 text-xs text-muted tabular-nums">{mmss(s.start)}</span>
            <span>{s.text ?? s.visual}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
