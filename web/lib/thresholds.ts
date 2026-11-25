// Copy of the gate thresholds in product/config.yaml (branch feat/product-spec).
// Keep in sync until the API sends thresholds in Output.meta.
import type { Category, Checks } from "./api-types";

export type CheckName = keyof Checks;
type Limit = { max: number } | { min: number };

export const THRESHOLDS: Record<Category, Partial<Record<CheckName, Limit>>> = {
  product: { ocr_cer: { max: 0.1 }, dino_sim: { min: 0.8 }, delta_e: { max: 8 }, silhouette_iou: { min: 0.85 } },
  packaging: { ocr_cer: { max: 0.1 }, dino_sim: { min: 0.8 }, delta_e: { max: 8 }, silhouette_iou: { min: 0.85 } },
  fashion: { ocr_cer: { max: 0.15 }, dino_sim: { min: 0.75 }, delta_e: { max: 10 }, silhouette_iou: { min: 0.6 } },
  app: { ssim: { min: 0.9 } },
};

const LABELS: Record<CheckName, string> = {
  ocr_cer: "Label text",
  dino_sim: "Look",
  delta_e: "Colour (ΔE)",
  silhouette_iou: "Shape",
  ssim: "Screen",
};

const ORDER: CheckName[] = ["ocr_cer", "dino_sim", "delta_e", "silhouette_iou", "ssim"];

const passes = (limit: Limit, value: number) => ("max" in limit ? value <= limit.max : value >= limit.min);

export function checkPasses(category: Category, name: CheckName, value: number): boolean {
  const limit = THRESHOLDS[category][name];
  return limit ? passes(limit, value) : true;
}

export interface CheckRow {
  name: CheckName;
  label: string;
  value: number;
  pass: boolean;
  /** The limit value; the UI draws it as a tick on the meter. */
  tick: number;
  lowerIsBetter: boolean;
}

export function visibleChecks(category: Category, checks: Checks): CheckRow[] {
  return ORDER.flatMap((name) => {
    const value = checks[name];
    const limit = THRESHOLDS[category][name];
    if (value === null || !limit) return [];
    const lowerIsBetter = "max" in limit;
    return [{ name, label: LABELS[name], value, pass: passes(limit, value), tick: lowerIsBetter ? limit.max : limit.min, lowerIsBetter }];
  });
}
