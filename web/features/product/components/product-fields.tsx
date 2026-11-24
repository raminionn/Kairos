"use client";
/* eslint-disable @next/next/no-img-element -- local blob preview */

import { ImagePlus } from "lucide-react";
import { useEffect, useState } from "react";
import type { Category } from "@/lib/api-types";

const CATEGORIES: { value: Category; label: string; dot: string }[] = [
  { value: "product", label: "Product", dot: "bg-orange" },
  { value: "packaging", label: "Packaging", dot: "bg-yellow" },
  { value: "fashion", label: "Fashion", dot: "bg-pink" },
  { value: "app", label: "App", dot: "bg-violet2" },
];

const pill =
  "cursor-pointer rounded-full border border-line bg-card/60 px-3 py-1.5 text-xs font-medium text-muted transition-all duration-150 hover:border-white/20 hover:text-ink has-checked:border-violet2 has-checked:bg-violet-500/20 has-checked:text-white has-checked:shadow-[0_0_12px_rgba(139,92,246,0.25)] has-focus-visible:ring-2 has-focus-visible:ring-violet2 has-focus-visible:outline-none";

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
        <label
          className="relative grid size-13 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-xl border border-dashed border-white/20 bg-card/70 text-muted transition-colors hover:border-violet-500/50 hover:bg-card focus-within:ring-2 focus-within:ring-violet2"
          title="Choose a photo"
        >
          {file && preview ? (
            <img src={preview} alt="" className="size-full object-cover" />
          ) : (
            <ImagePlus className="size-5" strokeWidth={1.75} aria-hidden />
          )}
          <input
            type="file"
            name="file"
            accept=".jpg,.jpeg,.png,.webp"
            className="sr-only"
            aria-label="Product photo"
            onChange={(e) => choose(e.target.files?.[0] ?? null)}
          />
        </label>
        <div className="min-w-0 flex-1">
          <input
            name="props"
            placeholder="Props and mood, e.g. eucalyptus leaves, soft morning light"
            aria-label="Props"
            className="w-full bg-transparent px-1 py-1 text-[15px] text-ink outline-none placeholder:text-muted/60"
          />
          <p className="px-1 text-xs text-muted/80 truncate">
            {file ? file.name : "Add a photo. The product itself is never changed."}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <fieldset className="contents">
          <legend className="sr-only">Category</legend>
          {CATEGORIES.map((c) => (
            <label key={c.value} className={pill}>
              <input type="radio" name="category" value={c.value} defaultChecked={c.value === "product"} className="sr-only" />
              <span className={`mr-1.5 inline-block size-2 rounded-full ${c.dot}`} aria-hidden />
              {c.label}
            </label>
          ))}
        </fieldset>
        <label className="flex items-center gap-1.5 rounded-full border border-line bg-card/60 px-3 py-1 text-xs font-medium text-muted hover:border-white/20">
          Variants
          <select name="n_variants" defaultValue="3" className="cursor-pointer bg-transparent text-ink outline-none">
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n} className="bg-card text-ink">
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
