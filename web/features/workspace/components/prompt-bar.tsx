"use client";

import { LoaderCircle, Sparkles } from "lucide-react";
import { useState } from "react";

/** Floating studio prompt dock matching Higgsfield's creation bar layout. */
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
      className="mx-auto w-full max-w-4xl rounded-2xl border border-line bg-white/95 p-3.5 shadow-[0_20px_50px_rgba(0,0,0,0.12)] backdrop-blur-2xl ring-1 ring-black/5 md:p-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4" key={version}>
        <div className="min-w-0 flex-1">{children}</div>
        <button
          type="submit"
          disabled={sending}
          className="flex h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-violet2 px-6 text-sm font-bold tracking-wide text-white shadow-md shadow-violet2/20 transition-all duration-200 hover:bg-violet hover:-translate-y-px hover:shadow-lg focus-visible:ring-2 focus-visible:ring-violet2 focus-visible:outline-none active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {sending ? (
            <>
              <LoaderCircle className="size-4 animate-spin text-white" aria-hidden />
              Starting…
            </>
          ) : (
            <>
              Generate
              <Sparkles className="size-4 text-white" aria-hidden />
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
