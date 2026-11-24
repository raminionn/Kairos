"use client";
/* eslint-disable @next/next/no-img-element -- local blob preview */

import { ImagePlus } from "lucide-react";
import { useEffect, useState } from "react";
import type { Category } from "@/lib/api-types";

const CATEGORIES: { value: Category; label: string; dot: string }[] = [
  { value: "product", label: "Product", dot: "bg-orange" },
  { value: "packaging", label: "Packaging", dot: "bg-yellow" },
  { value: "fashion", label: "Fashion", dot: "bg-pink" },
  { value: "app", label: "App", dot: "bg-peri" },
];

const pill =
  "cursor-pointer rounded-xl border border-line bg-card/60 px-3 py-1.5 text-xs font-semibold text-muted transition-all duration-150 hover:border-line hover:text-ink has-checked:border-violet2 has-checked:bg-[#f1ecff] has-checked:text-violet2 has-checked:shadow-xs has-focus-visible:ring-2 has-focus-visible:ring-violet2 has-focus-visible:outline-none";

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
      {/* Top Prompt Line */}
      <input
        name="props"
        placeholder="Describe the scene, props and mood, e.g. eucalyptus leaves, soft morning light..."
        aria-label="Props"
        className="w-full bg-transparent px-1 py-1 text-base text-ink outline-none placeholder:text-muted/70 font-normal"
      />

      {/* Bottom Parameter Controls Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <label
          className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-line bg-card/80 px-2.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-card focus-within:ring-2 focus-within:ring-violet2 max-w-xs"
          title="Choose a photo"
        >
          {file && preview ? (
            <img src={preview} alt="" className="size-4.5 rounded-md object-cover" />
          ) : (
            <ImagePlus className="size-4 text-muted" aria-hidden />
          )}
          <span className="truncate">{file ? file.name : "Add reference photo"}</span>
          <input
            type="file"
            name="file"
            accept=".jpg,.jpeg,.png,.webp"
            className="sr-only"
            aria-label="Product photo"
            onChange={(e) => choose(e.target.files?.[0] ?? null)}
          />
        </label>

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

        <label className="flex items-center gap-1.5 rounded-xl border border-line bg-card/60 px-3 py-1.5 text-xs font-semibold text-muted hover:border-line">
          <span>Variants</span>
          <select name="n_variants" defaultValue="3" className="cursor-pointer bg-transparent text-ink font-semibold outline-none">
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
