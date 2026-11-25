import type { Category, JobKind } from "@/lib/api-types";

const VIDEO_EXT = ["mp4", "mov", "mkv", "webm"];
const IMAGE_EXT = ["jpg", "jpeg", "png", "webp"];
const CATEGORIES: Category[] = ["fashion", "app", "product", "packaging"];
// kairos_carousel values and limits (carousel/kairos_carousel/brief.py, render.py THEMES).
export const GOALS = ["launch", "tips", "offer", "educate"];
/** Each theme brings its own brand colour (the form has no colour picker). */
export const THEME_COLORS: Record<string, string> = { editorial: "#5b12f5", midnight: "#5b12f5", notebook: "#3b4cca", bold: "#ff5a1f" };
export const THEMES = Object.keys(THEME_COLORS);
export const HEADING_MAX = 80;
export const DETAIL_MAX = 220;
const IMAGE_MAX = 4 * 1024 ** 2;
/** Optional carousel text fields, passed through as typed. */
const OPTIONAL = ["hook", "problem", "person", "site", "cta_heading", "cta_button"];

type Result = { ok: true; input: Record<string, unknown> } | { ok: false; error: string };

const fileName = (v: FormDataEntryValue | null) => (v && typeof v === "object" && "name" in v ? v.name : null);
const ext = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";
const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

/** Filled key point rows of the carousel form (empty rows skipped), with each row's optional image. */
export function pointRows(form: FormData) {
  const details = form.getAll("point_detail");
  const images = form.getAll("point_image");
  return form.getAll("point_heading").map((h, i) => {
    const img = images[i];
    return { row: i + 1, heading: String(h).trim(), detail: String(details[i] ?? "").trim(),
      image: img && typeof img !== "string" && img.size > 0 ? img : null };
  }).filter((r) => r.heading || r.detail);
}

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

  // Carousel: the fields kairos_carousel's brief needs (carousel/README.md). Python checks the other
  // text limits again and its message reaches the user, so only the common mistakes are caught here.
  const topic = text(form, "topic");
  if (!topic) return { ok: false, error: "Add a topic." };
  const username = text(form, "username").replace(/^@/, "");
  if (!username) return { ok: false, error: "Add your username." };
  if (!/^[\w.-]{1,39}$/.test(username)) return { ok: false, error: "Username: use letters, numbers, dots, dashes or underscores." };
  const points: { heading: string; detail?: string }[] = [];
  for (const { row, heading, detail } of pointRows(form)) {
    if (!heading) return { ok: false, error: `Key point ${row}: add a heading.` };
    if (heading.length > HEADING_MAX) return { ok: false, error: `Key point ${row}: keep the heading under ${HEADING_MAX} characters.` };
    if (detail.length > DETAIL_MAX) return { ok: false, error: `Key point ${row}: keep the detail under ${DETAIL_MAX} characters.` };
    points.push(detail ? { heading, detail } : { heading });
  }
  if (points.length < 1 || points.length > 5) return { ok: false, error: "Add 1 to 5 key points." };
  const goal = GOALS.includes(text(form, "goal")) ? text(form, "goal") : "tips";
  const theme = THEMES.includes(text(form, "theme")) ? text(form, "theme") : "editorial";
  const primary = THEME_COLORS[theme];
  for (const key of ["photo", "point_image"]) {
    for (const f of form.getAll(key)) {
      if (typeof f === "string" || f.size === 0) continue;
      if (!IMAGE_EXT.includes(ext(f.name))) return { ok: false, error: `${f.name}: use a jpg, png or webp image.` };
      if (f.size > IMAGE_MAX) return { ok: false, error: `${f.name}: images must be 4 MB or smaller.` };
    }
  }
  const labels = form.getAll("stat_label").map((v) => String(v).trim());
  const stats = form.getAll("stat_value").map((v, i) => ({ value: String(v).trim(), label: labels[i] ?? "" }))
    .filter((s) => s.value || s.label);
  if (stats.length === 1) return { ok: false, error: "Numbers: give at least 2 values, or none." };
  if (stats.some((s) => !s.value || !Number.isFinite(Number(s.value)))) return { ok: false, error: "Each number needs a numeric value, e.g. 40." };
  const optional = Object.fromEntries(OPTIONAL.map((k) => [k, text(form, k)]).filter(([, v]) => v));
  return { ok: true, input: { name: topic, topic, brand_name: username, handle: `@${username}`, primary, goal, theme, points, ...(stats.length && { stats }), ...optional } };
}
