import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Output } from "@/lib/api-types";
import { ProductTile } from "./product-views";

const none = { ocr_cer: null, dino_sim: null, delta_e: null, silhouette_iou: null, ssim: null };
const variant = (url: string): Extract<Output, { kind: "product_image" }> => ({
  id: "v3", job_id: "p1", url, kind: "product_image",
  meta: { category: "product", attempts: 3, repaired: false, passed: false, checks: none, fail_reasons: ["generation"] },
});

describe("ProductTile", () => {
  it("shows a grey 'Generation failed' tile and no image when the path is empty", () => {
    const html = renderToStaticMarkup(createElement(ProductTile, { output: variant("") }));
    expect(html).toContain("Generation failed");
    expect(html).toContain("The image model gave no image");
    expect(html).not.toContain("<img");
  });

  it("shows the image when there is a path", () => {
    const html = renderToStaticMarkup(createElement(ProductTile, { output: variant("/files/p1/variants/v1.png") }));
    expect(html).toContain('<img src="/api/mock/files/p1/variants/v1.png"');
  });
});
