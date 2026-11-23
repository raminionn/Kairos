import type { Category, JobKind } from "@/lib/api-types";

const VIDEO_EXT = ["mp4", "mov", "mkv", "webm"];
const IMAGE_EXT = ["jpg", "jpeg", "png", "webp"];
const CATEGORIES: Category[] = ["fashion", "app", "product", "packaging"];

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

  const topic = text(form, "topic");
  const body = text(form, "text");
  const source_job_id = text(form, "source_job_id");
  if (!topic && !body && !source_job_id) return { ok: false, error: "Add a topic, text or a source video." };
  return {
    ok: true,
    input: {
      name: topic || body.slice(0, 40) || "From video",
      ...(topic && { topic }),
      ...(body && { text: body }),
      ...(source_job_id && { source_job_id }),
    },
  };
}
