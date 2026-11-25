"use client";

import { ImagePlus, LoaderCircle, PenLine, Plus, Sparkles, X } from "lucide-react";
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

const ACCEPT = "image/png,image/jpeg,image/webp";

/** Live "12/80" counter that turns red over the limit. */
function Count({ n, max }: { n: number; max: number }) {
  return <span className={`text-[11px] tabular-nums ${n > max ? "text-red-400" : "text-muted"}`}>{n}/{max}</span>;
}

const MODES = [
  { value: "ai", label: "AI writes it", hint: "Paste your notes, then edit the draft.", icon: Sparkles },
  { value: "manual", label: "I write it", hint: "Fill in the slides yourself.", icon: PenLine },
] as const;

interface Point { id: number; heading: string; detail: string; image?: string }
let nextId = 0;
const blank = (): Point => ({ id: nextId++, heading: "", detail: "" });

/** Numbered form section. */
function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 border-t border-line pt-4 first:border-0 first:pt-0">
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
          <span className="grid size-5 place-items-center rounded-full bg-lime text-[11px] font-bold text-black">{n}</span>{title}
        </h3>
      </div>
      {children}
    </section>
  );
}

/** Small label + counter row above an input. */
function Label({ htmlFor, text, n, max }: { htmlFor: string; text: string; n: number; max: number }) {
  return (
    <div className="flex items-baseline justify-between">
      <label htmlFor={htmlFor} className="text-[11px] text-white/70">{text}</label>
      <Count n={n} max={max} />
    </div>
  );
}

/** The fields of kairos_carousel's brief (carousel/README.md). Names are read by mock/validate.ts. */
export function CarouselFields() {
  // Rows are keyed by id, not index: each row holds an uncontrolled file input that must stay with its row.
  const [points, setPoints] = useState<Point[]>(() => [blank()]);
  const edit = (id: number, p: Partial<Point>) => setPoints((ps) => ps.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const box = useRef<HTMLDivElement>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [mode, setMode] = useState<"ai" | "manual">("ai");
  const [drafted, setDrafted] = useState(false);
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
    setPoints(d.points.map((p) => ({ ...blank(), heading: p.heading, detail: p.detail })));
    form.querySelector("details[data-more]")?.setAttribute("open", "");
    setDrafted(true);
  }

  return (
    <div ref={box} className="space-y-4">
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-white">How do you want to write it?</legend>
        <div className="grid grid-cols-2 gap-2">
          {MODES.map((m) => (
            <label key={m.value}
              className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-line bg-[#0f1017] p-3 transition-colors hover:border-white/30 has-checked:border-lime/60 has-checked:bg-lime/[0.04] has-[:focus-visible]:border-lime">
              <input type="radio" name="mode" value={m.value} checked={mode === m.value} onChange={() => setMode(m.value)} className="sr-only" />
              <m.icon size={18} className="mt-0.5 shrink-0 text-lime" />
              <span><span className="block text-sm font-medium text-white">{m.label}</span><span className="text-[11px] text-muted">{m.hint}</span></span>
            </label>
          ))}
        </div>
      </fieldset>

      <Section n={1} title="You">
        <div className="flex items-center gap-3">
          <label className="flex shrink-0 cursor-pointer flex-col items-center gap-1 text-[11px] text-muted hover:text-white">
            <span className="grid size-12 place-items-center overflow-hidden rounded-full border border-dashed border-white/25 bg-[#0f1017]">
              {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
              {photo ? <img src={photo} alt="" className="size-full object-cover" /> : <ImagePlus size={18} />}
            </span>
            Photo
            <input name="photo" type="file" accept={ACCEPT} className="sr-only"
              onChange={(e) => { const f = e.target.files?.[0]; setPhoto(f ? URL.createObjectURL(f) : null); }} />
          </label>
          <div className="flex-1">
            <Field label="Username" htmlFor="username">
              <input id="username" name="username" placeholder="@yourname" maxLength={40} autoComplete="username" className={inputClass} />
            </Field>
          </div>
        </div>
      </Section>

      <Section n={2} title="Content">
        {mode === "ai" && (
          <div className="space-y-2 rounded-lg border border-lime/30 bg-lime/[0.03] p-3">
            <Field label="Your notes" htmlFor="summary">
              <textarea id="summary" name="summary" rows={4} maxLength={3000} className={`${inputClass} resize-none`}
                placeholder="Paste notes, a post or a few facts. The AI writes the slides from them." />
            </Field>
            <button type="button" onClick={writeWithAi} disabled={writing}
              className="flex items-center gap-1.5 rounded-lg bg-lime px-3 py-1.5 text-xs font-medium text-black hover:bg-lime/90 disabled:opacity-60">
              {writing ? <LoaderCircle size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {writing ? "Writing… (about 30 s)" : drafted ? "Write again" : "Write draft"}
            </button>
            {aiError && <p role="alert" className="text-xs text-red-400">{aiError}</p>}
            {drafted && !aiError && <p className="text-xs text-lime">Draft ready. Check and edit it below.</p>}
          </div>
        )}

        {/* hidden, not unmounted: the AI fills these inputs in place */}
        <div hidden={mode === "ai" && !drafted} className="space-y-3">
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

        <fieldset className="space-y-2">
          <legend className="text-xs font-medium text-white/85">Key points</legend>
          {points.map((p, i) => (
            <div key={p.id} className="space-y-1.5 rounded-lg border border-line bg-[#0f1017]/60 p-3">
              <div className="flex items-center gap-2">
                <div className="flex-1"><Label htmlFor={`ph${p.id}`} text={`Point ${i + 1} heading`} n={p.heading.length} max={HEADING_MAX} /></div>
                {points.length > 1 && (
                  <button type="button" aria-label={`Remove point ${i + 1}`} onClick={() => setPoints((ps) => ps.filter((x) => x.id !== p.id))}
                    className="text-muted hover:text-white"><X size={14} /></button>
                )}
              </div>
              <div>
                <input id={`ph${p.id}`} name="point_heading" value={p.heading} onChange={(e) => edit(p.id, { heading: e.target.value })}
                  placeholder={["List what must ship", "Block time for deep work", "Review on Friday"][i] ?? "Short heading"} className={inputClass} />
              </div>
              <details open={p.detail || p.image ? true : undefined} className="[&_summary]:cursor-pointer">
                <summary className="text-[11px] text-muted hover:text-white">Detail and image</summary>
                <div className="mt-2 space-y-2">
                  <div className="space-y-1">
                    <Label htmlFor={`pd${p.id}`} text="Detail" n={p.detail.length} max={DETAIL_MAX} />
                    <textarea id={`pd${p.id}`} name="point_detail" rows={2} value={p.detail} onChange={(e) => edit(p.id, { detail: e.target.value })}
                      placeholder="What to do, or why it matters." className={`${inputClass} resize-none`} />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[11px] text-white/70">Image</span>
                    <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-line px-3 py-2 text-xs text-muted hover:text-white">
                      <ImagePlus size={14} /> {p.image ?? "Choose image"}
                      <input name="point_image" type="file" accept={ACCEPT} aria-label={`Point ${i + 1} image`} className="sr-only"
                        onChange={(e) => edit(p.id, { image: e.target.files?.[0]?.name })} />
                    </label>
                  </div>
                </div>
              </details>
            </div>
          ))}
          {points.length < 5 && (
            <button type="button" onClick={() => setPoints((ps) => [...ps, blank()])}
              className="flex items-center gap-1.5 text-xs text-muted hover:text-white"><Plus size={14} /> Add point</button>
          )}
        </fieldset>
        </div>
      </Section>

      <Section n={3} title="Design">
        <fieldset>
          <legend className="sr-only">Design</legend>
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
      </Section>

      <details data-more className="rounded-lg border border-line bg-[#0f1017]/60 p-3 [&_summary]:cursor-pointer">
        <summary className="text-xs font-medium text-white/85">More options</summary>
        <div className="mt-3 space-y-3">
          <Field label="Problem" htmlFor="problem">
            <input id="problem" name="problem" placeholder="e.g. Monday starts with a blank page and a full inbox." className={inputClass} />
          </Field>
          <Field label="Cover line" hint="==word== is highlighted" htmlFor="hook">
            <input id="hook" name="hook" placeholder="e.g. Plan your week in ==10 minutes==" className={inputClass} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Your name" htmlFor="person"><input id="person" name="person" maxLength={40} placeholder="Morgan Maxwell" className={inputClass} /></Field>
            <Field label="Website" htmlFor="site"><input id="site" name="site" maxLength={60} placeholder="flowdesk.app" className={inputClass} /></Field>
          </div>
          <fieldset className="space-y-1.5">
            <legend className="text-xs font-medium text-white/85">Chart numbers <span className="font-normal text-muted">(2 to 3)</span></legend>
            {[0, 1, 2].map((i) => (
              <div key={i} className="grid grid-cols-[5rem_1fr] gap-2">
                <div className="space-y-1"><label htmlFor={`sv${i}`} className="text-[11px] text-white/70">Number {i + 1}</label>
                  <input id={`sv${i}`} name="stat_value" inputMode="decimal" placeholder={["40", "12", "3"][i]} className={inputClass} /></div>
                <div className="space-y-1"><label htmlFor={`sl${i}`} className="text-[11px] text-white/70">Label {i + 1}</label>
                  <input id={`sl${i}`} name="stat_label" maxLength={30} placeholder={["Tasks a day", "Focus hours", "Meetings"][i]} className={inputClass} /></div>
              </div>
            ))}
          </fieldset>
          <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
            <Field label="Closing line" htmlFor="cta_heading"><input id="cta_heading" name="cta_heading" maxLength={80} placeholder="Want more like this?" className={inputClass} /></Field>
            <Field label="Button" htmlFor="cta_button"><input id="cta_button" name="cta_button" maxLength={40} placeholder="Follow for more" className={inputClass} /></Field>
          </div>
        </div>
      </details>
    </div>
  );
}
