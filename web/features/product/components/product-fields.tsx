"use client";

import { ImagePlus } from "lucide-react";
import { useEffect, useState } from "react";
import type { Category } from "@/lib/api-types";

const CATEGORIES: { value: Category; label: string; dot: string }[] = [
  { value: "product", label: "Product", dot: "bg-orange" },
  { value: "packaging", label: "Packaging", dot: "bg-yellow" },
  { value: "fashion", label: "Fashion", dot: "bg-pink" },
  { value: "app", label: "App", dot: "bg-violet2" },
];

const pill = "cursor-pointer rounded-full border border-line px-3 py-1.5 text-sm has-checked:border-ink has-checked:bg-ink has-checked:text-white has-focus-visible:outline-2 has-focus-visible:outline-violet2";

export function ProductFields() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  function choose(next: File | null) {
    setFile(next);
    setPreview(next ? URL.createObjectURL(next) : null);
  }

  // Free each preview URL when it is replaced or the fields unmount (they remount after each submit).
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-3">
        <label className="relative grid size-14 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-xl border border-dashed border-[#cfcfc8] bg-card text-xl text-muted has-focus-visible:outline-2 has-focus-visible:outline-violet2" title="Choose a photo">
          {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
          {file && preview ? <img src={preview} alt="" className="size-full object-cover" /> : <ImagePlus className="size-5" strokeWidth={1.75} aria-hidden />}
          <input type="file" name="file" accept=".jpg,.jpeg,.png,.webp" className="sr-only" aria-label="Product photo"
            onChange={(e) => choose(e.target.files?.[0] ?? null)} />
        </label>
        <div className="min-w-0 flex-1">
          <input name="props" placeholder="Props and mood, e.g. eucalyptus leaves, soft morning light" aria-label="Props"
            className="w-full rounded-lg px-1 py-1 text-[15px] outline-none placeholder:text-muted" />
          <p className="px-1 text-xs text-muted">{file ? file.name : "Add a photo. The product itself is never changed."}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <fieldset className="contents">
          <legend className="sr-only">Category</legend>
          {CATEGORIES.map((c) => (
            <label key={c.value} className={pill}>
              <input type="radio" name="category" value={c.value} defaultChecked={c.value === "product"} className="sr-only" />
              <span className={`mr-1.5 inline-block size-2.5 rounded-[3px] ${c.dot}`} aria-hidden />{c.label}
            </label>
          ))}
        </fieldset>
        <label className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-sm">
          Variants
          <select name="n_variants" defaultValue="3" className="bg-transparent outline-none">
            {[1, 2, 3, 4].map((n) => <option key={n}>{n}</option>)}
          </select>
        </label>
      </div>
    </div>
  );
}
