import Link from "next/link";
import { Clapperboard, GalleryHorizontalEnd, LayoutList, Package, type LucideIcon } from "lucide-react";
import type { Job, JobKind } from "@/lib/api-types";

const ITEMS: { key: JobKind | "jobs"; label: string; href: string; Icon: LucideIcon }[] = [
  { key: "jobs", label: "Projects", href: "/projects", Icon: LayoutList },
  { key: "video", label: "Video clips", href: "/video", Icon: Clapperboard },
  { key: "product", label: "Product shots", href: "/product", Icon: Package },
  { key: "carousel", label: "Carousels", href: "/carousel", Icon: GalleryHorizontalEnd },
];

/** Top studio navigation bar matching Higgsfield's dark aesthetic. */
export function Rail({ active, all = [] }: { active: JobKind | "jobs"; all?: Job[] }) {
  const running = (k: string) => all.some((j) => j.kind === k && (j.status === "queued" || j.status === "running"));
  return (
    <header
      aria-label="Modules"
      className="sticky top-0 z-40 flex h-14 w-full shrink-0 items-center justify-between border-b border-line bg-[#0c0d12]/95 px-4 backdrop-blur-md md:h-16 md:px-8"
    >
      <div className="flex items-center gap-6 md:gap-8">
        <Link
          href="/"
          aria-label="Kairos home"
          className="grid size-9 place-items-center rounded-xl bg-lime text-sm font-black tracking-tight text-black shadow-xs transition-transform duration-200 hover:scale-105"
        >
          k
        </Link>
        <nav className="flex items-center gap-1 overflow-x-auto py-1 text-sm md:gap-1.5">
          {ITEMS.map(({ key, label, href, Icon }) => {
            const on = key === active;
            return (
              <Link
                key={key}
                href={href}
                aria-current={on ? "page" : undefined}
                className={`relative flex items-center gap-2 rounded-xl px-3 py-1.5 font-medium transition-all duration-150 focus-visible:ring-2 focus-visible:ring-lime focus-visible:outline-none whitespace-nowrap ${
                  on
                    ? "bg-[#1c1d27] text-white border border-[#2e3142] shadow-xs"
                    : "text-muted hover:bg-[#151620] hover:text-white"
                }`}
              >
                <Icon className={`size-4 shrink-0 ${on ? "text-lime" : ""}`} strokeWidth={1.75} aria-hidden />
                <span>{label}</span>
                {key !== "jobs" && running(key) && (
                  <span
                    className="size-2 animate-pulse rounded-full bg-pink ring-2 ring-[#0c0d12]"
                    aria-label="running"
                  />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="hidden items-center gap-3 sm:flex">
        <Link
          href="/video"
          className="rounded-xl bg-lime px-4 py-1.5 text-xs font-bold text-black shadow-xs transition-all hover:bg-lime/90 hover:-translate-y-px"
        >
          Create
        </Link>
      </div>
    </header>
  );
}
