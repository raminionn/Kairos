import Link from "next/link";
import type { Job, JobKind } from "@/lib/api-types";

const ICONS: Record<JobKind | "jobs", React.ReactNode> = {
  jobs: <><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M3 9h18" /></>,
  video: <><rect x="6" y="2" width="12" height="20" rx="3" /><path d="M10.5 9.5l4 2.5-4 2.5z" fill="currentColor" /></>,
  product: <><rect x="5" y="7" width="14" height="14" rx="4" /><path d="M8 3h8v4H8z" /></>,
  carousel: <><rect x="7" y="4" width="11" height="15" rx="2" /><path d="M4 7v11M21 7v11" /></>,
};

const ITEMS: { key: JobKind | "jobs"; label: string; href: string }[] = [
  { key: "jobs", label: "Jobs", href: "/jobs" },
  { key: "video", label: "Video", href: "/video" },
  { key: "product", label: "Product", href: "/product" },
  { key: "carousel", label: "Carousel", href: "/carousel" },
];

/** Module switcher: a left rail on desktop, a top row on phones. */
export function Rail({ active, all }: { active: JobKind; all: Job[] }) {
  const running = (k: string) => all.some((j) => j.kind === k && (j.status === "queued" || j.status === "running"));
  return (
    <nav aria-label="Modules" className="flex shrink-0 items-center gap-1 border-b border-line bg-white px-3 py-2 md:w-16 md:flex-col md:border-r md:border-b-0 md:px-0 md:py-4">
      <Link href="/" className="mr-2 font-semibold text-lg md:mr-0 md:mb-4" aria-label="Kairos home">k</Link>
      {ITEMS.map((it) => {
        const on = it.key === active;
        return (
          <Link key={it.key} href={it.href} title={it.label} aria-current={on ? "page" : undefined}
            className={`relative grid size-10 place-items-center rounded-xl transition-colors ${on ? "bg-[#f1ecff] text-violet2" : "text-muted hover:bg-card"}`}>
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>{ICONS[it.key]}</svg>
            <span className="sr-only">{it.label}</span>
            {it.key !== "jobs" && running(it.key) && <span className="absolute top-1.5 right-1.5 size-2 rounded-full border-2 border-white bg-pink" aria-label="running" />}
          </Link>
        );
      })}
    </nav>
  );
}
