import type { Metadata } from "next";
import { VideoWorkspace } from "@/features/video/video-workspace";

export const metadata: Metadata = { title: "Video to clips · Kairos" };

export default function VideoPage() {
  return <VideoWorkspace />;
}
