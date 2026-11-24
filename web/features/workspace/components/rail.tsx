import Link from "next/link";
import { LayoutList, type LucideIcon } from "lucide-react";
import type { Job, JobKind } from "@/lib/api-types";
import { KIND_ICON } from "@/features/jobs/kinds";

const ITEMS: { key: JobKind | "jobs"; label: string; href: string; Icon: LucideIcon }[] = [
  { key: "jobs", label: "Projects", href: "/projects", Icon: LayoutList },
  { key: "video", label: "Video", href: "/video", Icon: KIND_ICON.video },
  { key: "product", label: "Product", href: "/product", Icon: KIND_ICON.product },
  { key: "carousel", label: "Carousel", href: "/carousel", Icon: KIND_ICON.carousel },
];

/** Module switcher: a left rail on desktop, a top row on phones. */
export function Rail({ active, all }: { active: JobKind; all: Job[] }) {
  const running = (k: string) => all.some((j) => j.kind === k && (j.status === "queued" || j.status === "running"));
  return (
    <nav
      aria-label="Modules"
      className="flex shrink-0 items-center justify-between border-b border-line bg-white/95 px-4 py-2.5 backdrop-blur-md md:w-18 md:flex-col md:justify-start md:gap-2 md:border-r md:border-b-0 md:px-0 md:py-5"
    >
      <Link
        href="/"
        aria-label="Kairos home"
        className="mr-2 grid size-9.5 place-items-center rounded-xl bg-violet2 text-sm font-bold tracking-tight text-white shadow-xs transition-transform duration-200 hover:scale-105 md:mr-0 md:mb-5"
      >
        k
      </Link>
      <div className="flex items-center gap-1.5 md:flex-col md:gap-2">
        {ITEMS.map(({ key, label, href, Icon }) => {
          const on = key === active;
          return (
            <Link
              key={key}
              href={href}
              title={label}
              aria-current={on ? "page" : undefined}
              className={`relative grid size-10 place-items-center rounded-xl transition-all duration-200 focus-visible:ring-2 focus-visible:ring-violet2 focus-visible:outline-none ${
                on
                  ? "bg-[#f1ecff] text-violet2 ring-1 ring-violet2/20 shadow-xs"
                  : "text-muted hover:bg-card hover:text-ink"
              }`}
            >
              <Icon className="size-5" strokeWidth={1.75} aria-hidden />
              <span className="sr-only">{label}</span>
              {key !== "jobs" && running(key) && (
                <span
                  className="absolute top-1.5 right-1.5 size-2 animate-pulse rounded-full bg-pink ring-2 ring-white"
                  aria-label="running"
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
