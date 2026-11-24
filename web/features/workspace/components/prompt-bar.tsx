"use client";

import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import type { JobKind } from "@/lib/api-types";

interface PromptBarProps {
  children: React.ReactNode;
  onSubmit: (form: FormData) => Promise<{ error?: string }>;
  title?: string;
  kind?: JobKind;
  onSuccess?: () => void;
}

const MODULE_META: Record<JobKind, { studio: string; tag: string; badge: string }> = {
  product: {
    studio: "KAIROS PRODUCT STUDIO",
    tag: "High-fidelity e-commerce staging",
    badge: "Fidelity engine",
  },
  video: {
    studio: "KAIROS SHORT CLIPS",
    tag: "Viral detection & auto-captions",
    badge: "Motion engine",
  },
  carousel: {
    studio: "KAIROS CAROUSEL ENGINE",
    tag: "Multi-slide narrative synthesis",
    badge: "Narrative engine",
  },
};

/** Studio creation workbench panel with high-contrast dark aesthetic. */
export function PromptBar({ children, onSubmit, kind = "product", onSuccess }: PromptBarProps) {
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [version, setVersion] = useState(0); // remounts the fields to clear them after a job starts

  async function handle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    setError(null);
    const res = await onSubmit(new FormData(e.currentTarget));
    setSending(false);
    if (res.error) {
      setError(res.error);
    } else {
      setVersion((v) => v + 1);
      onSuccess?.();
    }
  }

  const meta = MODULE_META[kind] ?? MODULE_META.product;

  return (
    <form
      onSubmit={handle}
      noValidate
      className="flex h-full flex-col justify-between p-4 md:p-5"
    >
      <div className="flex flex-col gap-4">
        {/* Feature Engine Preview Card */}
        <div className="rounded-2xl border border-line bg-[#13141e] p-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold tracking-wide text-lime">
              {meta.studio}
            </span>
            <span className="rounded-full bg-lime/10 px-2 py-0.5 text-[10px] font-bold text-lime border border-lime/30">
              {meta.badge}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted leading-relaxed">{meta.tag}</p>
        </div>

        {/* Inputs container */}
        <div className="flex flex-col gap-3" key={version}>
          {children}
        </div>
      </div>

      {/* Action footer with full-width Generate button */}
      <div className="mt-6 pt-4 border-t border-line">
        <button
          type="submit"
          disabled={sending}
          className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-lime px-6 text-sm font-extrabold tracking-wide text-black shadow-lg shadow-lime/15 transition-all duration-200 hover:bg-lime/90 hover:-translate-y-px active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {sending ? (
            <>
              <LoaderCircle className="size-4 animate-spin text-black" aria-hidden />
              Starting…
            </>
          ) : (
            "Generate"
          )}
        </button>
        {error && (
          <p role="alert" className="mt-2.5 text-center text-xs font-semibold text-fail">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}
