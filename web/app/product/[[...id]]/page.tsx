import type { Metadata } from "next";
import { ProductWorkspace } from "@/features/product/product-workspace";

export const metadata: Metadata = { title: "Product photos · Kairos" };

export default function ProductPage() {
  return <ProductWorkspace />;
}
