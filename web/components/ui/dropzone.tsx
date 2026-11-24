"use client";
/* eslint-disable @next/next/no-img-element -- local blob preview */

import { Upload, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

/**
 * File picker that keeps its <input name> mounted at all times, so the chosen file is always
 * sent with the form (the card that replaces the drop area must not remove the input).
 */
export function Dropzone({ name, accept, label, hint, image = false }: { name: string; accept: string; label: string; hint: string; image?: boolean }) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  function choose(next: File | null) {
    if (!next && input.current) input.current.value = "";
    setFile(next);
    setPreview(next && image ? URL.createObjectURL(next) : null);
  }
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const size = file ? (file.size > 1024 ** 2 ? `${(file.size / 1024 ** 2).toFixed(1)} MB` : `${Math.ceil(file.size / 1024)} KB`) : "";

  return (
    <div>
      {file ? (
        <div className="flex items-center gap-3 rounded-lg border border-line bg-[#0f1017] p-2.5">
          {preview ? <img src={preview} alt="" className="size-11 rounded-md object-cover" />
            : <span className="grid size-11 place-items-center rounded-md bg-white/5 text-muted"><Upload className="size-4" aria-hidden /></span>}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm text-white">{file.name}</span>
            <span className="text-[11px] text-muted">{size}</span>
          </span>
          <button type="button" onClick={() => choose(null)} aria-label="Remove file"
            className="rounded-md p-1.5 text-muted hover:bg-white/5 hover:text-white"><X className="size-4" /></button>
        </div>
      ) : (
        <label htmlFor={id}
          className="flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-dashed border-white/15 bg-[#0f1017] px-4 py-6 text-center transition-colors hover:border-white/30 has-[:focus-visible]:border-lime">
          <Upload className="mb-1 size-5 text-muted" aria-hidden />
          <span className="text-sm text-white">{label}</span>
          <span className="text-[11px] text-muted">{hint}</span>
        </label>
      )}
      <input ref={input} id={id} type="file" name={name} accept={accept} className="sr-only" aria-label={label}
        onChange={(e) => choose(e.target.files?.[0] ?? null)} />
    </div>
  );
}
