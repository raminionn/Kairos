import type { JobKind } from "@/lib/api-types";

export const KIND_LABEL: Record<JobKind, string> = { video: "Video", product: "Product", carousel: "Carousel" };

/** Module colours from the design: video violet, product pink, carousel yellow. */
export const KIND_DOT: Record<JobKind, string> = { video: "bg-violet2", product: "bg-pink", carousel: "bg-yellow" };

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export function timeAgo(iso: string, now = Date.now()): string {
  const s = Math.round((Date.parse(iso) - now) / 1000);
  if (Math.abs(s) < 60) return rtf.format(s, "second");
  if (Math.abs(s) < 3600) return rtf.format(Math.round(s / 60), "minute");
  if (Math.abs(s) < 86400) return rtf.format(Math.round(s / 3600), "hour");
  return rtf.format(Math.round(s / 86400), "day");
}
