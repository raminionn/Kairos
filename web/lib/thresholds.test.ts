import { describe, expect, it } from "vitest";
import { checkPasses, visibleChecks } from "./thresholds";

const none = { ocr_cer: null, dino_sim: null, delta_e: null, silhouette_iou: null, ssim: null };

describe("checkPasses", () => {
  it("treats label error as lower-is-better", () => {
    expect(checkPasses("product", "ocr_cer", 0.04)).toBe(true);
    expect(checkPasses("product", "ocr_cer", 0.2)).toBe(false);
  });

  it("treats look as higher-is-better", () => {
    expect(checkPasses("product", "dino_sim", 0.91)).toBe(true);
  });

  it("uses each category's own colour limit", () => {
    expect(checkPasses("fashion", "delta_e", 9.5)).toBe(true);
    expect(checkPasses("product", "delta_e", 9.5)).toBe(false);
  });
});

describe("visibleChecks", () => {
  it("shows only the screen check for app", () => {
    const rows = visibleChecks("app", { ...none, ssim: 0.93 });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ name: "ssim", label: "Screen", value: 0.93, pass: true, tick: 0.9 });
  });

  it("hides checks whose value is null", () => {
    const rows = visibleChecks("product", { ...none, dino_sim: 0.9, delta_e: 3, silhouette_iou: 0.9 });
    expect(rows.map((r) => r.name)).toEqual(["dino_sim", "delta_e", "silhouette_iou"]);
  });

  it("hides checks with no threshold for the category", () => {
    expect(visibleChecks("app", { ...none, dino_sim: 0.9 })).toEqual([]);
  });
});
