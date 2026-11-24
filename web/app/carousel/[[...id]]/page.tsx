import type { Metadata } from "next";
import { CarouselWorkspace } from "@/features/carousel/carousel-workspace";

export const metadata: Metadata = { title: "LinkedIn carousels · Kairos" };

export default function CarouselPage() {
  return <CarouselWorkspace />;
}
