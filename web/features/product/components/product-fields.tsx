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
  "cursor-pointer rounded-full border border-line bg-white px-3 py-1.5 text-xs font-medium text-muted transition-all duration-150 hover:border-line hover:text-ink has-checked:border-violet2 has-checked:bg-[#f1ecff] has-checked:text-violet2 has-checked:shadow-xs has-focus-visible:ring-2 has-focus-visible:ring-violet2 has-focus-visible:outline-none";

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
          className="relative grid size-13 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-xl border border-dashed border-[#cfcfc8] bg-card text-muted transition-colors hover:border-violet2/50 focus-within:ring-2 focus-within:ring-violet2"
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
            className="w-full bg-transparent px-1 py-1 text-[15px] text-ink outline-none placeholder:text-muted"
          />
          <p className="px-1 text-xs text-muted truncate">
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
        <label className="flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1 text-xs font-medium text-muted hover:border-line">
          Variants
          <select name="n_variants" defaultValue="3" className="cursor-pointer bg-transparent text-ink outline-none">
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
