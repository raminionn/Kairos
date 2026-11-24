"use client";
/* eslint-disable @next/next/no-img-element -- local blob preview */

import { Camera, ImagePlus, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { Category } from "@/lib/api-types";

const CATEGORIES: { value: Category; label: string; dot: string }[] = [
  { value: "product", label: "Product", dot: "bg-orange" },
  { value: "packaging", label: "Packaging", dot: "bg-yellow" },
  { value: "fashion", label: "Fashion", dot: "bg-pink" },
  { value: "app", label: "App", dot: "bg-peri" },
];

const pill =
  "cursor-pointer flex-1 text-center rounded-xl border border-line bg-[#13141f] py-2 text-xs font-semibold text-muted transition-all duration-150 hover:border-line hover:text-white has-checked:border-lime has-checked:bg-lime/10 has-checked:text-lime has-checked:shadow-xs has-focus-visible:ring-2 has-focus-visible:ring-lime has-focus-visible:outline-none";

export function ProductFields() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const input = useRef<HTMLInputElement>(null);
  const id = useId();

  function choose(next: File | null) {
    if (!next && input.current) input.current.value = "";
    setFile(next);
    setPreview(next ? URL.createObjectURL(next) : null);
  }

  // Free each preview URL when it is replaced or the fields unmount (they remount after each submit).
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  return (
    <div className="space-y-4">
      {/* Reference Media Dropzone Card */}
      <div>
        <label className="text-[11px] font-bold tracking-wider text-muted uppercase block mb-1.5">
          Reference Photo
        </label>
        {file && preview ? (
          <div className="relative flex items-center gap-3 rounded-2xl border border-line bg-[#13141f] p-3 shadow-xs">
            <img src={preview} alt="" className="size-14 rounded-xl object-cover shrink-0 border border-line/60" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-white">{file.name}</p>
              <p className="text-[10px] text-muted font-mono mt-0.5">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <button
              type="button"
              onClick={() => choose(null)}
              className="cursor-pointer rounded-lg p-1.5 text-muted hover:bg-[#1f212f] hover:text-white transition-colors"
              aria-label="Remove image"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <label
            htmlFor={id}
            className="group flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-line bg-[#13141f]/70 p-5 text-center cursor-pointer transition-all duration-200 hover:border-lime/60 hover:bg-[#161724] focus-within:ring-2 focus-within:ring-lime focus-within:outline-none"
            title="Upload product photo"
          >
            <div className="mb-2 grid size-10 place-items-center rounded-full bg-lime/10 text-lime transition-transform duration-200 group-hover:scale-110">
              <Camera className="size-5" />
            </div>
            <span className="text-xs font-bold text-white">Add a reference photo</span>
            <span className="mt-0.5 text-[10px] text-muted">Supports JPG, PNG, WebP up to 20MB</span>
          </label>
        )}
        {/* Always mounted, so the chosen file is still in the form after the preview replaces the drop zone. */}
        <input ref={input} id={id} type="file" name="file" accept=".jpg,.jpeg,.png,.webp" className="sr-only"
          aria-label="Product photo" onChange={(e) => choose(e.target.files?.[0] ?? null)} />
      </div>

      {/* Prompt / Props Input */}
      <div>
        <label htmlFor="prompt-props" className="text-[11px] font-bold tracking-wider text-muted uppercase block mb-1.5">
          Scene & Props Prompt
        </label>
        <textarea
          id="prompt-props"
          name="props"
          rows={3}
          placeholder="Describe the scene, props and mood, e.g. eucalyptus leaves, soft morning light, marble surface..."
          aria-label="Props"
          className="w-full rounded-xl border border-line bg-[#13141f] p-3 text-xs text-white outline-none transition-all placeholder:text-muted/60 focus:border-lime focus:ring-1 focus:ring-lime/30 resize-none font-normal leading-relaxed"
        />
      </div>

      {/* Category Pills */}
      <div>
        <label className="text-[11px] font-bold tracking-wider text-muted uppercase block mb-1.5">
          Category
        </label>
        <fieldset className="grid grid-cols-2 gap-2">
          <legend className="sr-only">Category</legend>
          {CATEGORIES.map((c) => (
            <label key={c.value} className={pill}>
              <input type="radio" name="category" value={c.value} defaultChecked={c.value === "product"} className="sr-only" />
              <span className={`mr-1.5 inline-block size-2 rounded-full ${c.dot}`} aria-hidden />
              {c.label}
            </label>
          ))}
        </fieldset>
      </div>

      {/* Variants Count Selector */}
      <div className="flex items-center justify-between rounded-xl border border-line bg-[#13141f] px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <ImagePlus className="size-4 text-muted" aria-hidden />
          <span className="text-xs font-semibold text-white">Variants</span>
        </div>
        <select
          name="n_variants"
          defaultValue="3"
          aria-label="Variants"
          className="cursor-pointer rounded-lg border border-line bg-[#191a26] px-2 py-1 text-xs font-bold text-white outline-none focus:border-lime"
        >
          {[1, 2, 3, 4].map((n) => (
            <option key={n} value={n} className="bg-[#191a26] text-white">
              {n} output{n > 1 ? "s" : ""}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
