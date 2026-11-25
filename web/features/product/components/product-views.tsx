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
    <span className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded-full bg-pass px-2.5 py-0.5 text-[11px] font-bold text-black shadow-xs">
      <Check className="size-3" strokeWidth={3} aria-hidden />
      passed
    </span>
  ) : (
    <span className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded-full bg-fail px-2.5 py-0.5 text-[11px] font-bold text-white shadow-xs">
      <X className="size-3" strokeWidth={3} aria-hidden />
      {meta.fail_reasons[0] === "ocr_cer" ? "label" : "failed"}
    </span>
  );
}

export function ProductTile({ output }: { output: ProductOutput }) {
  const { url, meta } = output;
  if (!url) {
    return (
      <div className="relative grid aspect-[4/5] place-items-center rounded-2xl border border-line bg-[#161720] p-4 text-center text-xs text-muted shadow-xs">
        <span>
          <ImageOff className="mx-auto mb-2.5 size-7 text-muted" strokeWidth={1.5} aria-hidden />
          <b className="block text-sm font-semibold text-white">Generation failed</b>
          <span className="mt-1 block text-muted">{meta.fail_reasons.map(reason).join(", ")}</span>
        </span>
      </div>
    );
  }
  return (
    <div className="group relative aspect-[4/5] overflow-hidden rounded-2xl border border-line bg-[#12131a] shadow-xs transition-all duration-300 hover:border-lime/40 hover:shadow-lg hover:-translate-y-0.5">
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
  const val = row.value === null ? "—" : row.lowerIsBetter ? row.value.toFixed(3) : `${Math.round(row.value * 100)}%`;
  return (
    <div className="space-y-1 py-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-muted font-medium">{row.label}</span>
        <span className={`font-mono text-xs font-semibold ${row.pass ? "text-pass" : "text-fail"}`}>
          {val} {row.pass ? "✓" : "✗"}
        </span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/10">
        {row.value !== null && (
          <div
            className={`h-full rounded-full transition-all duration-500 ${row.pass ? "bg-pass" : "bg-fail"}`}
            style={{ width: pct(row.value) }}
          />
        )}
        <span
          className="absolute inset-y-0 w-0.5 bg-white shadow-xs"
          style={{ left: pct(row.tick) }}
          title={`Threshold: ${row.tick}`}
          aria-label={`threshold: ${row.tick}`}
        />
      </div>
    </div>
  );
}

function Fact({ k, v, className = "" }: { k: string; v: string; className?: string }) {
  return (
    <div className="flex justify-between py-1.5 text-xs border-b border-line/60 last:border-b-0">
      <span className="text-muted font-medium">{k}</span>
      <span className={`font-semibold text-white ${className}`}>{v}</span>
    </div>
  );
}

export function ProductDrawer({ output }: { output: ProductOutput }) {
  const { url, meta } = output;
  const rows = visibleChecks(meta.category, meta.checks);
  return (
    <div className="space-y-4">
      <ProductTile output={output} />
      <div className="rounded-2xl border border-line bg-[#13141d] p-4">
        <Fact k="Status" v={meta.passed ? "Passed" : "Failed"} className={meta.passed ? "text-pass" : "text-fail"} />
        <Fact k="Attempts" v={String(meta.attempts)} />
        <Fact k="Repaired" v={meta.repaired ? "Yes · paste + relight" : "No"} />
      </div>
      {rows.length > 0 && (
        <div className="rounded-2xl border border-line bg-[#13141d] p-4">
          <h3 className="mb-3 text-[11px] font-bold tracking-wider text-muted uppercase">Fidelity checks</h3>
          {rows.map((r) => (
            <Meter key={r.name} row={r} />
          ))}
          <p className="mt-2 text-[11px] text-muted">White tick = pass limit</p>
        </div>
      )}
      {meta.fail_reasons.length > 0 && (
        <div className="rounded-2xl border border-fail/30 bg-fail/10 p-3.5">
          <ul className="list-disc space-y-1 pl-4 text-xs font-semibold text-fail">
            {meta.fail_reasons.map((r) => (
              <li key={r}>{reason(r)}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex gap-2.5 pt-2">
        <button
          type="button"
          disabled
          title="Coming when the API supports it"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-line bg-[#13141d] px-3 py-2.5 text-xs font-semibold text-muted/60 cursor-not-allowed"
        >
          <RefreshCw className="size-3.5" aria-hidden />
          Regenerate
        </button>
        {url ? (
          <a
            href={fileUrl(url)}
            download
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-lime px-3 py-2.5 text-xs font-extrabold text-black shadow-xs transition-colors hover:bg-lime/90"
          >
            <Download className="size-3.5" aria-hidden />
            Download
          </a>
        ) : (
          <span className="flex-1 rounded-xl border border-line bg-[#13141d] px-3 py-2.5 text-center text-xs text-muted">
            No file
          </span>
        )}
      </div>
    </div>
  );
}
