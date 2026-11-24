"use client";

import { Workspace, type ModuleConfig } from "@/features/workspace/workspace";
import { ProductFields } from "./components/product-fields";
import { ProductDrawer, ProductTile } from "./components/product-views";

const productModule: ModuleConfig = {
  kind: "product",
  title: "Product shots",
  headline: "TURN CONCEPTS INTO PRODUCTION ASSETS",
  description:
    "Generate photorealistic e-commerce imagery with automated multi-model fidelity verification and pass/fail thresholds.",
  summary: (job) => [job.input?.category, job.input?.props].filter(Boolean).join(" · "),
  gridClass: "grid-cols-2 sm:grid-cols-3 xl:grid-cols-4",
  tileAspect: "aspect-[4/5]",
  renderTile: (o) => o.kind === "product_image" && <ProductTile output={o} />,
  renderDrawer: (o) => o.kind === "product_image" && <ProductDrawer output={o} />,
  promptFields: <ProductFields />,
  filter: (o, f) => o.kind === "product_image" && (f === "passed") === o.meta.passed,
  expectedCount: (job) => Number(job.input?.n_variants ?? 3),
};

/** Client wrapper: the module config holds functions, which a server page cannot pass down. */
export function ProductWorkspace() {
  return <Workspace module={productModule} />;
}
