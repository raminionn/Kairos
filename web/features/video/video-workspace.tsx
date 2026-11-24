"use client";

import { Workspace, type ModuleConfig } from "@/features/workspace/workspace";
import { ClipDrawer, ClipTile } from "./components/clip-views";
import { TranscriptDrawer, TranscriptTile } from "./components/transcript-views";
import { VideoFields } from "./components/video-fields";

const videoModule: ModuleConfig = {
  kind: "video",
  title: "Video clips",
  headline: "TURN ONE VIDEO INTO MANY",
  description:
    "Remix raw footage into viral clips with automated hook detection, captions, and engagement ranking.",
  summary: () => "",
  gridClass: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5",
  tileAspect: "aspect-[9/16]",
  renderTile: (o) => (o.kind === "clip" ? <ClipTile output={o} /> : o.kind === "understanding" && <TranscriptTile output={o} />),
  renderDrawer: (o) => (o.kind === "clip" ? <ClipDrawer output={o} /> : o.kind === "understanding" && <TranscriptDrawer output={o} />),
  promptFields: <VideoFields />,
  sort: (a, b) => (a.kind === "clip" && b.kind === "clip" ? a.meta.rank - b.meta.rank : 0),
  // shimmer count while running; a real local run makes one transcript, the mock makes 6 clips
  expectedCount: (job) => (job.input?.local ? 1 : 6),
};

/** Client wrapper: the module config holds functions, which a server page cannot pass down. */
export function VideoWorkspace() {
  return <Workspace module={videoModule} />;
}
