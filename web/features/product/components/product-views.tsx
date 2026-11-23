/* eslint-disable @next/next/no-img-element -- media come from the API, not from /public */
import type { Output, ProductMeta } from "@/lib/api-types";
import { fileUrl } from "@/features/jobs/api";
import { visibleChecks, type CheckRow } from "@/lib/thresholds";

type ProductOutput = Extract<Output, { kind: "product_image" }>;

const REASON: Record<string, string> = {
  ocr_cer: "Label text changed", dino_sim: "Does not look like the product", delta_e: "Colour changed",
  silhouette_iou: "Shape changed", ssim: "Screen does not match", generation: "The image model gave no image",
};
const reason = (r: string) => REASON[r] ?? r;

function Badge({ meta }: { meta: ProductMeta }) {
  return meta.passed
    ? <span className="absolute top-2 right-2 rounded-full bg-pass px-2 py-0.5 text-[11px] font-medium text-white">✓ passed</span>
    : <span className="absolute top-2 right-2 rounded-full bg-fail px-2 py-0.5 text-[11px] font-medium text-white">✗ {meta.fail_reasons[0] === "ocr_cer" ? "label" : "failed"}</span>;
}

export function ProductTile({ output }: { output: ProductOutput }) {
  const { url, meta } = output;
  if (!url) {
    return (
      <div className="relative grid aspect-[4/5] place-items-center rounded-xl bg-[#e9e9e4] p-3 text-center text-xs text-muted">
        <span><b className="block text-sm font-medium text-ink">Generation failed</b>{meta.fail_reasons.map(reason).join(", ")}</span>
      </div>
    );
  }
  return (
    <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-card">
      <img src={fileUrl(url)} alt={`Variant, ${meta.passed ? "passed" : "failed"} checks`} className="size-full object-cover" />
      <Badge meta={meta} />
    </div>
  );
}

function Meter({ row }: { row: CheckRow }) {
  const scale = row.lowerIsBetter ? row.tick * 2 : 1;
  const pct = (v: number) => `${Math.min(v / scale, 1) * 100}%`;
  return (
    <div className="mb-3">
      <div className="mb-1 flex justify-between text-sm">
        <span>{row.label}{row.lowerIsBetter && <span className="text-xs text-muted"> (lower is better)</span>}</span>
        <b className={`font-medium ${row.pass ? "" : "text-fail"}`}>{row.value}</b>
      </div>
      <div className="relative h-1.5 rounded-full bg-[#eee]" role="meter" aria-label={row.label} aria-valuenow={row.value} aria-valuemin={0} aria-valuemax={scale}>
        <span className={`absolute inset-y-0 left-0 rounded-full ${row.pass ? "bg-pass" : "bg-fail"}`} style={{ width: pct(row.value) }} />
        <i className="absolute -top-0.75 h-3 w-0.5 bg-ink" style={{ left: pct(row.tick) }} />
      </div>
    </div>
  );
}

const Fact = ({ k, v, className = "" }: { k: string; v: string; className?: string }) => (
  <div className="flex justify-between border-b border-[#f0f0ea] py-1.5 text-sm"><span className="text-muted">{k}</span><b className={`font-medium ${className}`}>{v}</b></div>
);

export function ProductDrawer({ output }: { output: ProductOutput }) {
  const { url, meta } = output;
  const rows = visibleChecks(meta.category, meta.checks);
  return (
    <div>
      <ProductTile output={output} />
      <div className="mt-4">
        <Fact k="Status" v={meta.passed ? "Passed" : "Failed"} className={meta.passed ? "text-pass" : "text-fail"} />
        <Fact k="Attempts" v={String(meta.attempts)} />
        <Fact k="Repaired" v={meta.repaired ? "Yes · paste + relight" : "No"} />
      </div>
      {rows.length > 0 && (
        <>
          <h3 className="mt-5 mb-2 text-[11px] tracking-widest text-muted uppercase">Fidelity checks</h3>
          {rows.map((r) => <Meter key={r.name} row={r} />)}
          <p className="text-[11px] text-muted">Black tick = pass limit</p>
        </>
      )}
      {meta.fail_reasons.length > 0 && (
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-fail">{meta.fail_reasons.map((r) => <li key={r}>{reason(r)}</li>)}</ul>
      )}
      <div className="mt-5 flex gap-2">
        <button type="button" disabled title="Coming when the API supports it" className="flex-1 rounded-lg border border-line px-3 py-2 text-sm text-muted">Regenerate</button>
        {url
          ? <a href={fileUrl(url)} download className="flex-1 rounded-lg bg-ink px-3 py-2 text-center text-sm text-white">Download</a>
          : <span className="flex-1 rounded-lg bg-card px-3 py-2 text-center text-sm text-muted">No file</span>}
      </div>
    </div>
  );
}
