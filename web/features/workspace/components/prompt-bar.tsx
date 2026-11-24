"use client";

import { LoaderCircle, Sparkles } from "lucide-react";
import { useState } from "react";

/** Docked form at the bottom of the feed. Fields are plain named inputs inside `children`. */
export function PromptBar({
  children,
  onSubmit,
}: {
  children: React.ReactNode;
  onSubmit: (form: FormData) => Promise<{ error?: string }>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [version, setVersion] = useState(0); // remounts the fields to clear them after a job starts

  async function handle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    setError(null);
    const res = await onSubmit(new FormData(e.currentTarget));
    setSending(false);
    if (res.error) setError(res.error);
    else setVersion((v) => v + 1);
  }

  return (
    <form
      onSubmit={handle}
      noValidate
      className="mx-auto w-full max-w-3xl rounded-2xl border border-line bg-white/95 p-3 shadow-[0_12px_40px_rgba(20,0,60,.12)] backdrop-blur-xl md:p-3.5"
    >
      <div className="flex flex-wrap items-end gap-2.5" key={version}>
        <div className="w-full min-w-0 sm:w-auto sm:flex-1">{children}</div>
        <button
          type="submit"
          disabled={sending}
          className="ml-auto flex cursor-pointer items-center gap-2 rounded-xl bg-violet2 px-5 py-2.5 text-sm font-medium text-white shadow-md transition-all duration-200 hover:bg-violet hover:-translate-y-px hover:shadow-lg focus-visible:ring-2 focus-visible:ring-violet2 focus-visible:outline-none active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {sending ? (
            <>
              <LoaderCircle className="size-4 animate-spin" aria-hidden />
              Starting…
            </>
          ) : (
            <>
              Generate
              <Sparkles className="size-4" aria-hidden />
            </>
          )}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2.5 text-sm font-medium text-fail">
          {error}
        </p>
      )}
    </form>
  );
}
