"use client";

import { Workspace, type ModuleConfig } from "@/features/workspace/workspace";
import { ClipDrawer, ClipTile } from "./components/clip-views";
import { VideoFields } from "./components/video-fields";

const videoModule: ModuleConfig = {
  kind: "video",
  title: "Video clips",
  summary: () => "",
  gridClass: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5",
  tileAspect: "aspect-[9/16]",
  renderTile: (o) => o.kind === "clip" && <ClipTile output={o} />,
  renderDrawer: (o) => o.kind === "clip" && <ClipDrawer output={o} />,
  promptFields: <VideoFields />,
  sort: (a, b) => (a.kind === "clip" && b.kind === "clip" ? a.meta.rank - b.meta.rank : 0),
  expectedCount: () => 6, // shimmer count while running; the real number arrives with the outputs
};

/** Client wrapper: the module config holds functions, which a server page cannot pass down. */
export function VideoWorkspace() {
  return <Workspace module={videoModule} />;
}
