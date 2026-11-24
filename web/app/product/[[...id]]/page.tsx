import type { Metadata } from "next";
import { ProductWorkspace } from "@/features/product/product-workspace";

export const metadata: Metadata = { title: "Product shots · Kairos" };

export default function ProductPage() {
  return <ProductWorkspace />;
}
