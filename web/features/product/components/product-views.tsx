/* eslint-disable @next/next/no-img-element -- media come from the API, not from /public */
import { Check, Download, ImageOff, RefreshCw, X } from "lucide-react";
import type { Output, ProductMeta } from "@/lib/api-types";
import { fileUrl } from "@/features/jobs/api";
import { visibleChecks, type CheckRow } from "@/lib/thresholds";

type ProductOutput = Extract<Output, { kind: "product_image" }>;

const REASON: Record<string, string> = {
  ocr_cer: "Label text changed",
  dino_sim: "Does not look like the product",
  delta_e: "Colour changed",
  silhouette_iou: "Shape changed",
  ssim: "Screen does not match",
  generation: "The image model gave no image",
};
const reason = (r: string) => REASON[r] ?? r;

function Badge({ meta }: { meta: ProductMeta }) {
  return meta.passed ? (
    <span className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded-full bg-pass/90 px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm backdrop-blur-xs">
      <Check className="size-3" strokeWidth={3} aria-hidden />
      passed
    </span>
  ) : (
    <span className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded-full bg-fail/90 px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm backdrop-blur-xs">
      <X className="size-3" strokeWidth={3} aria-hidden />
      {meta.fail_reasons[0] === "ocr_cer" ? "label" : "failed"}
    </span>
  );
}

export function ProductTile({ output }: { output: ProductOutput }) {
  const { url, meta } = output;
  if (!url) {
    return (
      <div className="relative grid aspect-[4/5] place-items-center rounded-xl border border-line bg-[#1c1d25] p-4 text-center text-xs text-muted shadow-inner">
        <span>
          <ImageOff className="mx-auto mb-2.5 size-7 text-muted/60" strokeWidth={1.5} aria-hidden />
          <b className="block text-sm font-semibold text-ink">Generation failed</b>
          <span className="mt-1 block text-muted/80">{meta.fail_reasons.map(reason).join(", ")}</span>
        </span>
      </div>
    );
  }
  return (
    <div className="group relative aspect-[4/5] overflow-hidden rounded-xl border border-line bg-card shadow-sm transition-all duration-300 hover:border-violet-500/40 hover:shadow-lg hover:shadow-violet-500/10">
      <img
        src={fileUrl(url)}
        alt={`Variant, ${meta.passed ? "passed" : "failed"} checks`}
        className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
      <Badge meta={meta} />
    </div>
  );
}

function Meter({ row }: { row: CheckRow }) {
  const scale = row.lowerIsBetter ? row.tick * 2 : 1;
  const pct = (v: number) => `${Math.min(v / scale, 1) * 100}%`;
  return (
    <div className="mb-3.5">
      <div className="mb-1.5 flex justify-between text-sm">
        <span className="text-muted">
          {row.label}
          {row.lowerIsBetter && <span className="text-xs text-muted/70"> (lower is better)</span>}
        </span>
        <b className={`font-mono text-xs font-semibold ${row.pass ? "text-ink" : "text-fail"}`}>{row.value}</b>
      </div>
      <div
        className="relative h-2 rounded-full bg-white/10"
        role="meter"
        aria-label={row.label}
        aria-valuenow={row.value}
        aria-valuemin={0}
        aria-valuemax={scale}
      >
        <span
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-300 ${
            row.pass ? "bg-pass shadow-[0_0_8px_rgba(34,197,94,0.35)]" : "bg-fail shadow-[0_0_8px_rgba(239,68,68,0.35)]"
          }`}
          style={{ width: pct(row.value) }}
        />
        <i
          className="absolute -top-1 h-4 w-0.5 rounded-full bg-white shadow-xs"
          style={{ left: pct(row.tick) }}
          title={`Pass limit: ${row.tick}`}
        />
      </div>
    </div>
  );
}

const Fact = ({ k, v, className = "" }: { k: string; v: string; className?: string }) => (
  <div className="flex justify-between border-b border-line py-2 text-sm">
    <span className="text-muted">{k}</span>
    <b className={`font-medium ${className || "text-ink"}`}>{v}</b>
  </div>
);

export function ProductDrawer({ output }: { output: ProductOutput }) {
  const { url, meta } = output;
  const rows = visibleChecks(meta.category, meta.checks);
  return (
    <div className="space-y-4">
      <ProductTile output={output} />
      <div className="rounded-xl border border-line bg-card/40 p-3.5 backdrop-blur-xs">
        <Fact k="Status" v={meta.passed ? "Passed" : "Failed"} className={meta.passed ? "text-pass" : "text-fail"} />
        <Fact k="Attempts" v={String(meta.attempts)} />
        <Fact k="Repaired" v={meta.repaired ? "Yes · paste + relight" : "No"} />
      </div>
      {rows.length > 0 && (
        <div className="rounded-xl border border-line bg-card/40 p-3.5 backdrop-blur-xs">
          <h3 className="mb-3 text-[11px] font-semibold tracking-wider text-muted uppercase">Fidelity checks</h3>
          {rows.map((r) => (
            <Meter key={r.name} row={r} />
          ))}
          <p className="mt-2 text-[11px] text-muted/70">Tick = pass limit</p>
        </div>
      )}
      {meta.fail_reasons.length > 0 && (
        <div className="rounded-xl border border-fail/20 bg-fail/10 p-3">
          <ul className="list-disc space-y-1 pl-4 text-xs font-medium text-fail">
            {meta.fail_reasons.map((r) => (
              <li key={r}>{reason(r)}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex gap-2 pt-2">
        <button
          type="button"
          disabled
          title="Coming when the API supports it"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-line bg-card/50 px-3 py-2.5 text-xs font-medium text-muted/50 cursor-not-allowed"
        >
          <RefreshCw className="size-3.5" aria-hidden />
          Regenerate
        </button>
        {url ? (
          <a
            href={fileUrl(url)}
            download
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-ink px-3 py-2.5 text-xs font-medium text-page transition-colors hover:bg-white"
          >
            <Download className="size-3.5" aria-hidden />
            Download
          </a>
        ) : (
          <span className="flex-1 rounded-xl border border-line bg-card/40 px-3 py-2.5 text-center text-xs text-muted">
            No file
          </span>
        )}
      </div>
    </div>
  );
}
