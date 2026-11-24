// API types from docs/specs/2026-11-17-kairos-system-design.md section 7 ("Jobs (api <-> web)").
// Hand-written until the FastAPI app exists; then replace with openapi-typescript output.

export type JobKind = "video" | "product" | "carousel";
export type JobStatus = "queued" | "running" | "done" | "failed";

export interface Job {
  id: string;
  kind: JobKind;
  status: JobStatus;
  stage: string | null;
  progress: number;
  error: string | null;
  created_at: string;
  updated_at: string;
  /** Request fields. `name` is the uploaded file name or the carousel topic. Not in the system design
   *  Job contract yet (only in the DB table), so it may be missing: always read it with `?.`. */
  input?: Record<string, unknown>;
}

export type Category = "fashion" | "app" | "product" | "packaging";

/** Gate scores from contracts/product.py. null = check does not apply. */
export interface Checks {
  ocr_cer: number | null;
  dino_sim: number | null;
  delta_e: number | null;
  silhouette_iou: number | null;
  ssim: number | null;
}

export interface ProductMeta {
  category: Category;
  attempts: number;
  repaired: boolean;
  passed: boolean;
  checks: Checks;
  fail_reasons: string[];
}

export interface ClipMeta {
  rank: number;
  start: number;
  end: number;
  title: string;
  hook_text: string;
  suggested_caption: string;
  scores: {
    hook: number;
    self_containment: number;
    emotional_peak: number;
    pacing: number;
    retention_risk: number;
    genre_fit: number;
  };
  signals: { words_per_sec: number; audio_energy: number; cut_count: number };
  total: number;
  reasons: string[];
  thumb_url: string;
}

/** contracts/understanding.py, trimmed for the UI (local runner; the real API needs this kind too). */
export interface UnderstandingMeta {
  duration: number;
  route: string;
  speech_ratio: number;
  asr_confidence: number;
  genre: string;
  genre_confidence: number;
  word_count: number;
  segments: { start: number; end: number; text: string | null; visual: string | null }[];
}

/** Assumed until the carousel spec defines it. */
export interface CarouselMeta {
  slides: string[];
}

export type Output = { id: string; job_id: string; url: string } & (
  | { kind: "clip"; meta: ClipMeta }
  | { kind: "product_image"; meta: ProductMeta }
  | { kind: "carousel_pdf"; meta: CarouselMeta }
  | { kind: "understanding"; meta: UnderstandingMeta }
);
