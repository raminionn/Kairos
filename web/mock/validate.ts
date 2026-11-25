import type { Category, JobKind } from "@/lib/api-types";

const VIDEO_EXT = ["mp4", "mov", "mkv", "webm"];
const IMAGE_EXT = ["jpg", "jpeg", "png", "webp"];
const CATEGORIES: Category[] = ["fashion", "app", "product", "packaging"];
const GOALS = ["launch", "tips", "offer", "explain"];

type Result = { ok: true; input: Record<string, unknown> } | { ok: false; error: string };

const fileName = (v: FormDataEntryValue | null) => (v && typeof v === "object" && "name" in v ? v.name : null);
const ext = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";
const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

/** Same checks the real API makes on POST /jobs/<kind> (system design section 8). */
export function validateCreate(kind: JobKind, form: FormData): Result {
  if (kind === "video") {
    const name = fileName(form.get("file"));
    if (!name || !VIDEO_EXT.includes(ext(name))) return { ok: false, error: "Video must be mp4, mov, mkv or webm." };
    return { ok: true, input: { name } };
  }

  if (kind === "product") {
    const name = fileName(form.get("file"));
    if (!name || !IMAGE_EXT.includes(ext(name))) return { ok: false, error: "Image must be jpg, png or webp." };
    const category = text(form, "category") as Category;
    if (!CATEGORIES.includes(category)) return { ok: false, error: "Pick a category." };
    const raw = text(form, "n_variants");
    const n_variants = raw === "" ? 3 : Number(raw);
    if (!Number.isInteger(n_variants) || n_variants < 1 || n_variants > 4) return { ok: false, error: "Variants must be 1 to 4." };
    const props = text(form, "props");
    return { ok: true, input: { name, category, ...(props && { props }), n_variants } };
  }

  // Carousel: the fields kairos_carousel's brief needs (carousel/README.md).
  const topic = text(form, "topic");
  if (!topic) return { ok: false, error: "Add a topic." };
  const brand_name = text(form, "brand_name");
  if (!brand_name) return { ok: false, error: "Add your brand name." };
  const points = text(form, "points").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (points.length < 1 || points.length > 5) return { ok: false, error: "Add 1 to 5 key points, one per line." };
  const primary = text(form, "primary") || "#5b12f5";
  if (!/^#[0-9a-fA-F]{6}$/.test(primary)) return { ok: false, error: "Brand colour must look like #5b12f5." };
  const goal = GOALS.includes(text(form, "goal")) ? text(form, "goal") : "tips";
  const problem = text(form, "problem");
  return { ok: true, input: { name: topic, topic, brand_name, primary, goal, points, ...(problem && { problem }) } };
}
