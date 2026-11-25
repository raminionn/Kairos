"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { Field, inputClass } from "@/components/ui/field";
import { DETAIL_MAX, HEADING_MAX } from "@/mock/validate";

const GOALS = [
  { value: "tips", label: "Share tips" },
  { value: "launch", label: "Launch" },
  { value: "offer", label: "Offer" },
  { value: "educate", label: "Explain" },
];

/** A tiny look of each kairos_carousel theme (carousel/kairos_carousel/static/<theme>.css). */
const THEMES = [
  { value: "editorial", label: "Editorial", tile: "bg-[#f4efe6] text-[#1a1a1a] font-serif", sample: <>Aa <span className="bg-[#ffd84d] px-0.5">b</span></> },
  { value: "midnight", label: "Midnight", tile: "bg-[#1b1b1b] text-white font-light", sample: <>Aa <b className="font-bold">b</b></> },
  { value: "notebook", label: "Notebook", tile: "bg-[#f6f2ec] text-black bg-[linear-gradient(#e7e1d8_1px,transparent_1px),linear-gradient(90deg,#e7e1d8_1px,transparent_1px)] bg-[size:8px_8px]", sample: <>Aa <span className="rounded-full border-2 border-[#3b4cca] px-1">b</span></> },
  { value: "bold", label: "Bold", tile: "bg-[#f2f0e8] text-black font-black uppercase tracking-tight", sample: <><span className="text-[#3b4cca]">01→</span> <span className="bg-[#3b4cca] px-0.5 text-white">B</span></> },
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

  return (
    <>
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <Field label="Brand name" htmlFor="brand_name">
          <input id="brand_name" name="brand_name" placeholder="e.g. Flowdesk" maxLength={40} className={inputClass} />
        </Field>
        <Field label="Colour" htmlFor="primary">
          <input id="primary" name="primary" type="color" defaultValue="#5b12f5"
            className="h-[38px] w-14 cursor-pointer rounded-lg border border-line bg-[#0f1017] p-1" />
        </Field>
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
              <span aria-hidden="true" className={`mb-1.5 flex aspect-[4/5] items-center justify-center rounded text-lg ${t.tile}`}>{t.sample}</span>
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
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Your name" htmlFor="person"><input id="person" name="person" maxLength={40} className={inputClass} /></Field>
            <Field label="Handle" htmlFor="handle"><input id="handle" name="handle" maxLength={40} placeholder="@flowdesk" className={inputClass} /></Field>
            <Field label="Website" htmlFor="site"><input id="site" name="site" maxLength={60} placeholder="flowdesk.app" className={inputClass} /></Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Your photo" htmlFor="photo"><input id="photo" name="photo" type="file" accept={ACCEPT} className={fileClass} /></Field>
            <Field label="Logo" htmlFor="logo"><input id="logo" name="logo" type="file" accept={ACCEPT} className={fileClass} /></Field>
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
