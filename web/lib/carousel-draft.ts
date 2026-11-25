// AI copy for carousels (docs/specs/2026-11-25-carousel-ai-copy-and-themes.md, section 1).
// The model only writes words into this schema; checkDraft is the trust boundary for its output.

export const DRAFT_MODELS = ["google/gemma-4-31b-it:free", "nvidia/nemotron-3.5-super-vl:free"];
export const SUMMARY_MAX = 3000;

export const DRAFT_PROMPT = `You write LinkedIn carousel copy. You return ONLY JSON that matches the schema. No prose, no markdown.

Use only facts from the user's summary. Never invent numbers, customers, awards, prices or claims.
If the summary has no numbers, leave "stats" empty. If unsure, say less.

Structure (one idea per slide):
- topic: the promise of the carousel in plain words, 3 to 8 words.
- hook: the cover title, max 60 characters. A clear benefit, a surprising fact from the summary,
  or a "how to" for a specific reader. Mark 1 or 2 key words with ==word==.
  No clickbait, no questions that can be answered "no", no emojis.
- problem: one sentence the reader recognises from their own work, max 140 characters.
- points: 3 to 5 items, in a logical order (steps, or most important first).
  heading: max 60 characters, starts with a verb or a number, no full stop.
  detail: one or two short sentences, max 160 characters, concrete (what to do, or why it matters).
- stats: 0 to 4 items {value: number, label: max 24 characters}, only from the summary.
- cta: heading max 60 characters; button max 24 characters ("Follow for more", "Save this post",
  "Book a demo"). One action only.

Style: plain English at a level a 14-year-old understands. Active voice. Short words. Second person ("you").
No jargon, no hashtags, no emojis, no ALL CAPS, no exclamation marks, no "unlock", "elevate",
"game-changer", "in today's fast-paced world". Same tone in every slide.

Schema:
{ "topic": "str", "hook": "str", "problem": "str",
  "points": [{"heading": "str", "detail": "str"}],
  "stats": [{"value": 0, "label": "str"}],
  "cta": {"heading": "str", "button": "str"} }`;

export interface Draft {
  topic: string; hook: string; problem: string;
  points: { heading: string; detail: string }[];
  stats: { value: number; label: string }[];
  cta: { heading: string; button: string };
}

// The kairos_carousel hard limits (brief.py), not the tighter prompt targets: a few characters over
// the target still renders, so only text the maker would refuse costs a retry.
const str = (v: unknown, max: number, what: string) => {
  const s = typeof v === "string" ? v.trim() : "";
  if (s.length > max) throw new Error(`${what} is over ${max} characters`);
  return s;
};

/** Model reply -> checked Draft, or an error message to send back for one retry. */
export function checkDraft(reply: string, summary: string): { draft: Draft } | { error: string } {
  try {
    const j = JSON.parse(reply.replace(/^```(?:json)?\s*|\s*```$/g, ""));
    const points = (Array.isArray(j.points) ? j.points : []).slice(0, 5).map((p: Record<string, unknown>, i: number) => ({
      heading: str(p?.heading, 80, `Point ${i + 1} heading`), detail: str(p?.detail, 220, `Point ${i + 1} detail`),
    })).filter((p: { heading: string }) => p.heading);
    if (points.length < 1) throw new Error("points is empty");
    // Spec: numbers only from the summary. A value that does not appear in it is dropped, never shown.
    const stats = (Array.isArray(j.stats) ? j.stats : []).slice(0, 4)
      .map((s: Record<string, unknown>) => ({ value: Number(s?.value), label: str(s?.label, 30, "Number label") }))
      .filter((s: { value: number; label: string }) => Number.isFinite(s.value) && s.label && summary.includes(String(s.value)));
    return { draft: {
      topic: str(j.topic, 80, "topic"), hook: str(j.hook, 80, "hook"), problem: str(j.problem, 220, "problem"), points,
      stats: stats.length >= 2 ? stats : [],
      cta: { heading: str(j.cta?.heading, 80, "cta heading"), button: str(j.cta?.button, 40, "cta button") },
    } };
  } catch (e) {
    return { error: e instanceof SyntaxError ? "The reply was not valid JSON." : `${(e as Error).message}.` };
  }
}
