import { Field, inputClass } from "@/components/ui/field";

const GOALS = [
  { value: "tips", label: "Share tips" },
  { value: "launch", label: "Launch" },
  { value: "offer", label: "Offer" },
  { value: "explain", label: "Explain" },
];

/** The fields kairos_carousel's brief needs (carousel/README.md). */
export function CarouselFields() {
  return (
    <>
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <Field label="Brand name" htmlFor="brand_name">
          <input id="brand_name" name="brand_name" placeholder="e.g. Flowdesk" className={inputClass} />
        </Field>
        <Field label="Colour" htmlFor="primary">
          <input id="primary" name="primary" type="color" defaultValue="#5b12f5"
            className="h-[38px] w-14 cursor-pointer rounded-lg border border-line bg-[#0f1017] p-1" />
        </Field>
      </div>

      <Field label="Topic" htmlFor="topic">
        <input id="topic" name="topic" placeholder="e.g. Plan your week in 10 minutes" className={inputClass} />
      </Field>

      <fieldset>
        <legend className="mb-1.5 text-xs font-medium text-white/85">Goal</legend>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {GOALS.map((g) => (
            <label key={g.value}
              className="cursor-pointer rounded-lg border border-line bg-[#0f1017] px-2 py-2 text-center text-xs text-muted transition-colors hover:text-white has-checked:border-lime/60 has-checked:text-white has-[:focus-visible]:border-lime">
              <input type="radio" name="goal" value={g.value} defaultChecked={g.value === "tips"} className="sr-only" />
              {g.label}
            </label>
          ))}
        </div>
      </fieldset>

      <Field label="Key points" hint="1 to 5, one per line" htmlFor="points">
        <textarea id="points" name="points" rows={4} className={`${inputClass} resize-none`}
          placeholder={"List what must ship: only work with a deadline\nBlock time for deep work\nReview on Friday"} />
      </Field>

      <Field label="Problem" hint="Optional" htmlFor="problem">
        <input id="problem" name="problem" placeholder="e.g. Monday starts with a blank page and a full inbox." className={inputClass} />
      </Field>
    </>
  );
}
