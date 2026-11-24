"use client";

import { Workspace, type ModuleConfig } from "@/features/workspace/workspace";
import { CarouselFields } from "./components/carousel-fields";
import { CarouselDrawer, CarouselTile } from "./components/carousel-views";

const carouselModule: ModuleConfig = {
  kind: "carousel",
  title: "Carousels",
  summary: (job) => (job.input?.source_job_id ? "from a video" : job.input?.text ? "from text" : ""),
  gridClass: "grid-cols-2 sm:grid-cols-3 xl:grid-cols-5",
  tileAspect: "aspect-[4/5]",
  renderTile: (o) => o.kind === "carousel_pdf" && <CarouselTile output={o} />,
  renderDrawer: (o) => o.kind === "carousel_pdf" && <CarouselDrawer output={o} />,
  promptFields: <CarouselFields />,
  expectedCount: () => 1,
};

/** Client wrapper: the module config holds functions, which a server page cannot pass down. */
export function CarouselWorkspace() {
  return <Workspace module={carouselModule} />;
}
