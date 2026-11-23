// Fake outputs for the mock API. Product variants follow fixtures/product.result.json;
// clips follow the clips.json example in the system design (section 7).
import type { CarouselMeta, ClipMeta, ProductMeta } from "@/lib/api-types";

type Variant = Omit<ProductMeta, "category"> & { path: string };

/** Order matters: n_variants takes the first n. Index 2 is the "generation failed" case. */
export const VARIANTS: Variant[] = [
  { path: "variants/v1.png", attempts: 2, repaired: true, passed: true, fail_reasons: [],
    checks: { ocr_cer: 0.04, dino_sim: 0.91, delta_e: 3.2, silhouette_iou: 0.88, ssim: null } },
  { path: "variants/v2.png", attempts: 3, repaired: false, passed: false, fail_reasons: ["ocr_cer"],
    checks: { ocr_cer: 0.22, dino_sim: 0.86, delta_e: 4.1, silhouette_iou: 0.9, ssim: null } },
  { path: "", attempts: 3, repaired: false, passed: false, fail_reasons: ["generation"],
    checks: { ocr_cer: null, dino_sim: null, delta_e: null, silhouette_iou: null, ssim: null } },
  { path: "variants/v4.png", attempts: 1, repaired: false, passed: true, fail_reasons: [],
    checks: { ocr_cer: 0.02, dino_sim: 0.94, delta_e: 2.1, silhouette_iou: 0.92, ssim: null } },
];

/** App screenshots are checked by screen match only. */
export const APP_CHECKS = { ocr_cer: null, dino_sim: null, delta_e: null, silhouette_iou: null, ssim: 0.93 };

type Clip = Omit<ClipMeta, "thumb_url" | "rank">;

const clip = (start: number, len: number, title: string, hook_text: string, total: number, reasons: string[]): Clip => ({
  start, end: start + len, title, hook_text, total, reasons,
  suggested_caption: `${title} #startups #podcast`,
  scores: { hook: Math.round(total * 10), self_containment: 8, emotional_peak: 6, pacing: 7, retention_risk: 3, genre_fit: 8 },
  signals: { words_per_sec: 2.9, audio_energy: 0.64, cut_count: 2 },
});

/** Already in rank order. */
export const CLIPS: Clip[] = [
  clip(312.1, 44.7, "Why most first funding rounds fail", "Nobody tells you this about funding", 0.81,
    ["Opens with an open question in the first 3 seconds", "Complete argument, no reference to earlier context"]),
  clip(845.0, 38.2, "The hiring mistake that cost a year", "We hired the wrong person first", 0.77,
    ["Personal story with a clear lesson", "Emotional peak at 0:12"]),
  clip(1210.4, 51.0, "Burn rate math in one minute", "Here is the only formula you need", 0.72,
    ["Concrete numbers keep attention", "Self-contained explanation"]),
  clip(1502.8, 33.5, "Say no to your first investor", "I turned down our first cheque", 0.68,
    ["Surprising claim in the hook", "Short and fast-paced"]),
  clip(1888.0, 47.9, "What a good board meeting looks like", "Most board meetings are theatre", 0.61,
    ["Strong opinion opens the clip", "Ends on a clear takeaway"]),
  clip(2201.3, 41.2, "The one metric that matters early", "Ignore everything except this", 0.55,
    ["Clear single idea", "Some reference to earlier context"]),
];

export const SLIDES = ["5 funding myths", "Myth 1: you need a warm intro", "Myth 2: traction beats team",
  "Myth 3: more money is better", "Follow for more"];

export const carouselMeta = (jobId: string): CarouselMeta => ({
  slides: SLIDES.map((_, i) => `/files/${jobId}/slides/${i + 1}.png`),
});
