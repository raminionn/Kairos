"use client";

import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import type { JobKind } from "@/lib/api-types";

interface PromptBarProps {
  children: React.ReactNode;
  onSubmit: (form: FormData) => Promise<{ error?: string; jobId?: string }>;
  title?: string;
  kind?: JobKind;
  /** Called with the new project's id, so the page can open it. */
  onSuccess?: (jobId?: string) => void;
}

/** Studio creation workbench panel with high-contrast dark aesthetic. */
export function PromptBar({ children, onSubmit, onSuccess }: PromptBarProps) {
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
      onSuccess?.(res.jobId);
    }
  }


  return (
    <form
      onSubmit={handle}
      noValidate
      className="flex h-full flex-col justify-between p-4 md:p-5"
    >
      <div className="flex flex-col gap-4">
        {/* Inputs container */}
        <div className="flex flex-col gap-4" key={version}>
          {children}
        </div>
      </div>

      {/* Action footer with full-width Generate button */}
      <div className="mt-6 pt-4 border-t border-line">
        <button
          type="submit"
          disabled={sending}
          className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-lime px-6 text-sm font-semibold text-black transition-colors hover:bg-lime/90 disabled:cursor-not-allowed disabled:opacity-60"
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
          <p role="alert" className="mt-2.5 text-sm text-red-400">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}
