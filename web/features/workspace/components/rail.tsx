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
    <nav aria-label="Modules" className="flex shrink-0 items-center gap-1 border-b border-line bg-white px-3 py-2 md:w-16 md:flex-col md:border-r md:border-b-0 md:px-0 md:py-4">
      <Link href="/" aria-label="Kairos home"
        className="mr-2 grid size-9 place-items-center rounded-xl bg-ink text-sm font-bold tracking-tight text-white md:mr-0 md:mb-4">
        k
      </Link>
      {ITEMS.map(({ key, label, href, Icon }) => {
        const on = key === active;
        return (
          <Link key={key} href={href} title={label} aria-current={on ? "page" : undefined}
            className={`relative grid size-10 place-items-center rounded-xl transition-colors ${on ? "bg-[#f1ecff] text-violet2" : "text-muted hover:bg-card hover:text-ink"}`}>
            <Icon className="size-5" strokeWidth={1.75} aria-hidden />
            <span className="sr-only">{label}</span>
            {key !== "jobs" && running(key) && <span className="absolute top-1.5 right-1.5 size-2 rounded-full border-2 border-white bg-pink" aria-label="running" />}
          </Link>
        );
      })}
    </nav>
  );
}
