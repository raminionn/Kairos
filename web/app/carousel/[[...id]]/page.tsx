import type { Metadata } from "next";
import { CarouselWorkspace } from "@/features/carousel/carousel-workspace";

export const metadata: Metadata = { title: "Carousels · Kairos" };

export default function CarouselPage() {
  return <CarouselWorkspace />;
}
