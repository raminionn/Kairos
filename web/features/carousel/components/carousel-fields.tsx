"use client";

import { ImagePlus, LoaderCircle, Plus, Sparkles, X } from "lucide-react";
import { useRef, useState } from "react";
import type { Draft } from "@/lib/carousel-draft";
import { Field, inputClass } from "@/components/ui/field";
import { DETAIL_MAX, HEADING_MAX } from "@/mock/validate";

const GOALS = [
  { value: "tips", label: "Share tips" },
  { value: "launch", label: "Launch" },
  { value: "offer", label: "Offer" },
  { value: "educate", label: "Explain" },
];

/** Cover previews rendered by kairos_carousel itself (public/carousel-themes/<theme>.webp). */
const THEMES = [
  { value: "editorial", label: "Editorial" }, { value: "midnight", label: "Midnight" },
  { value: "notebook", label: "Notebook" }, { value: "bold", label: "Bold" },
];

const fileClass = "block w-full text-xs text-muted file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-white hover:file:bg-white/15";
const ACCEPT = "image/png,image/jpeg,image/webp";

/** Live "12/80" counter that turns red over the limit. */
function Count({ n, max }: { n: number; max: number }) {
  return <span className={`text-[11px] tabular-nums ${n > max ? "text-red-400" : "text-muted"}`}>{n}/{max}</span>;
}

interface Point { heading: string; detail: string }

/** The fields of kairos_carousel's brief (carousel/README.md). Names are read by mock/validate.ts. */
export function CarouselFields() {
  const [points, setPoints] = useState<Point[]>([{ heading: "", detail: "" }, { heading: "", detail: "" }, { heading: "", detail: "" }]);
  const edit = (i: number, p: Partial<Point>) => setPoints((ps) => ps.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const box = useRef<HTMLDivElement>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [writing, setWriting] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  /** Asks the server route for a draft, then fills the fields so the user can edit before Generate. */
  async function writeWithAi() {
    const form = box.current?.closest("form");
    if (!form) return;
    const get = (n: string) => (form.elements.namedItem(n) as HTMLInputElement | null)?.value ?? "";
    setWriting(true);
    setAiError(null);
    const res = await fetch("/api/carousel/draft", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ summary: get("summary"), brand_name: get("username"), goal: (form.querySelector("[name=goal]:checked") as HTMLInputElement | null)?.value }) })
      .catch(() => null);
    const data = await res?.json().catch(() => null);
    setWriting(false);
    if (!res?.ok) return setAiError(data?.detail ?? "The AI did not answer. Try again.");
    const d = data as Draft;
    const set = (n: string, v: string) => { const el = form.elements.namedItem(n) as HTMLInputElement | null; if (el) el.value = v; };
    set("topic", d.topic); set("hook", d.hook); set("problem", d.problem); set("cta_heading", d.cta.heading); set("cta_button", d.cta.button);
    form.querySelectorAll<HTMLInputElement>("[name=stat_value]").forEach((el, i) => { el.value = d.stats[i] ? String(d.stats[i].value) : ""; });
    form.querySelectorAll<HTMLInputElement>("[name=stat_label]").forEach((el, i) => { el.value = d.stats[i]?.label ?? ""; });
    setPoints(d.points.map((p) => ({ heading: p.heading, detail: p.detail })));
    form.querySelector("details")?.setAttribute("open", "");
  }

  return (
    <>
      <div ref={box} className="space-y-2 rounded-lg border border-lime/30 bg-lime/[0.03] p-3">
        <Field label="Write with AI" hint="Optional · the AI uses only your facts" htmlFor="summary">
          <textarea id="summary" name="summary" rows={3} maxLength={3000} className={`${inputClass} resize-none`}
            placeholder="Paste notes, a post or a summary. The AI fills the fields below, then you edit them." />
        </Field>
        <button type="button" onClick={writeWithAi} disabled={writing}
          className="flex items-center gap-1.5 rounded-lg border border-lime/50 px-3 py-1.5 text-xs text-lime hover:bg-lime/10 disabled:opacity-60">
          {writing ? <LoaderCircle size={14} className="animate-spin" /> : <Sparkles size={14} />} {writing ? "Writing…" : "Write with AI"}
        </button>
        {aiError && <p role="alert" className="text-xs text-red-400">{aiError}</p>}
      </div>

      <div className="flex items-end gap-3">
        <label className="group relative size-[38px] shrink-0 cursor-pointer overflow-hidden rounded-full border border-line bg-[#0f1017] hover:border-white/30 focus-within:border-lime"
          title="Your photo or logo">
          {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
          {photo ? <img src={photo} alt="" className="size-full object-cover" /> : <ImagePlus size={16} className="m-auto mt-[10px] text-muted" />}
          <input name="photo" type="file" accept={ACCEPT} aria-label="Your photo or logo" className="sr-only"
            onChange={(e) => { const f = e.target.files?.[0]; setPhoto(f ? URL.createObjectURL(f) : null); }} />
        </label>
        <div className="flex-1">
          <Field label="Username" htmlFor="username">
            <input id="username" name="username" placeholder="@yourname" maxLength={40} autoComplete="username" className={inputClass} />
          </Field>
        </div>
      </div>

      <Field label="Topic" htmlFor="topic">
        <input id="topic" name="topic" placeholder="e.g. Plan your week in 10 minutes" className={inputClass} />
      </Field>

      <fieldset>
        <legend className="mb-1.5 text-xs font-medium text-white/85">Goal</legend>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {GOALS.map((g) => (
            <label key={g.value}
              className="cursor-pointer rounded-lg border border-line bg-[#0f1017] px-2 py-2 text-center text-xs text-muted transition-colors hover:text-white has-checked:border-lime/60 has-checked:text-white has-[:focus-visible]:border-lime">
              <input type="radio" name="goal" value={g.value} defaultChecked={g.value === "tips"} className="sr-only" />
              {g.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-1.5 text-xs font-medium text-white/85">Design</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {THEMES.map((t) => (
            <label key={t.value}
              className="cursor-pointer rounded-lg border border-line bg-[#0f1017] p-1.5 text-center text-xs text-muted transition-colors hover:text-white has-checked:border-lime/60 has-checked:text-white has-[:focus-visible]:border-lime">
              <input type="radio" name="theme" value={t.value} defaultChecked={t.value === "editorial"} className="sr-only" />
              {/* eslint-disable-next-line @next/next/no-img-element -- 6 KB static preview */}
              <img src={`/carousel-themes/${t.value}.webp`} alt="" width={216} height={270} className="mb-1.5 aspect-[4/5] w-full rounded object-cover" />
              {t.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <div className="flex items-baseline justify-between">
          <legend className="text-xs font-medium text-white/85">Key points</legend>
          <span className="text-[11px] text-muted">1 to 5 · one slide each</span>
        </div>
        {points.map((p, i) => (
          <div key={i} className="space-y-1.5 rounded-lg border border-line bg-[#0f1017]/60 p-2.5">
            <div className="flex items-center gap-2">
              <span className="w-4 text-[11px] text-muted">{i + 1}</span>
              <input name="point_heading" aria-label={`Point ${i + 1} heading`} value={p.heading} onChange={(e) => edit(i, { heading: e.target.value })}
                placeholder={["List what must ship", "Block time for deep work", "Review on Friday", "Heading", "Heading"][i]} className={inputClass} />
              <Count n={p.heading.length} max={HEADING_MAX} />
              {points.length > 1 && (
                <button type="button" aria-label={`Remove point ${i + 1}`} onClick={() => setPoints((ps) => ps.filter((_, j) => j !== i))}
                  className="text-muted hover:text-white"><X size={14} /></button>
              )}
            </div>
            <div className="flex items-start gap-2 pl-6">
              <textarea name="point_detail" aria-label={`Point ${i + 1} detail`} rows={2} value={p.detail} onChange={(e) => edit(i, { detail: e.target.value })}
                placeholder="Detail (optional)" className={`${inputClass} resize-none`} />
              <Count n={p.detail.length} max={DETAIL_MAX} />
            </div>
            <label className="flex items-center gap-2 pl-6 text-[11px] text-muted">Image
              <input name="point_image" type="file" accept={ACCEPT} className={fileClass} />
            </label>
          </div>
        ))}
        {points.length < 5 && (
          <button type="button" onClick={() => setPoints((ps) => [...ps, { heading: "", detail: "" }])}
            className="flex items-center gap-1.5 text-xs text-muted hover:text-white"><Plus size={14} /> Add point</button>
        )}
      </fieldset>

      <Field label="Problem" hint="Optional" htmlFor="problem">
        <input id="problem" name="problem" placeholder="e.g. Monday starts with a blank page and a full inbox." className={inputClass} />
      </Field>

      <details className="group rounded-lg border border-line bg-[#0f1017]/60 p-3 [&_summary]:cursor-pointer">
        <summary className="text-xs font-medium text-white/85">More options</summary>
        <div className="mt-3 space-y-3">
          <Field label="Cover line" hint="Optional · ==word== is highlighted" htmlFor="hook">
            <input id="hook" name="hook" placeholder="e.g. Plan your week in ==10 minutes==" className={inputClass} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Your name" htmlFor="person"><input id="person" name="person" maxLength={40} className={inputClass} /></Field>
            <Field label="Website" htmlFor="site"><input id="site" name="site" maxLength={60} placeholder="flowdesk.app" className={inputClass} /></Field>
          </div>
          <fieldset className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <legend className="text-xs font-medium text-white/85">Numbers</legend>
              <span className="text-[11px] text-muted">2 to 4 for a bar chart, or none</span>
            </div>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="grid grid-cols-[6rem_1fr] gap-2">
                <input name="stat_value" inputMode="decimal" aria-label={`Number ${i + 1} value`} placeholder="40" className={inputClass} />
                <input name="stat_label" aria-label={`Number ${i + 1} label`} maxLength={30} placeholder="Tasks a day" className={inputClass} />
              </div>
            ))}
          </fieldset>
          <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
            <Field label="Closing line" htmlFor="cta_heading"><input id="cta_heading" name="cta_heading" maxLength={80} placeholder="Want more like this?" className={inputClass} /></Field>
            <Field label="Button" htmlFor="cta_button"><input id="cta_button" name="cta_button" maxLength={40} placeholder="Follow for more" className={inputClass} /></Field>
          </div>
        </div>
      </details>
    </>
  );
}
