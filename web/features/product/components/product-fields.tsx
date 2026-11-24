import { Dropzone } from "@/components/ui/dropzone";
import { Field, inputClass } from "@/components/ui/field";
import type { Category } from "@/lib/api-types";

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "product", label: "Product" },
  { value: "packaging", label: "Packaging" },
  { value: "fashion", label: "Fashion" },
  { value: "app", label: "App screen" },
];

export function ProductFields() {
  return (
    <>
      <Field label="Product photo" hint="Never changed">
        <Dropzone name="file" accept=".jpg,.jpeg,.png,.webp" label="Choose a photo" hint="JPG, PNG or WebP, up to 20 MB" image />
      </Field>

      <fieldset>
        <legend className="mb-1.5 text-xs font-medium text-white/85">Category</legend>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {CATEGORIES.map((c) => (
            <label key={c.value}
              className="cursor-pointer rounded-lg border border-line bg-[#0f1017] px-2 py-2 text-center text-xs text-muted transition-colors hover:text-white has-checked:border-lime/60 has-checked:text-white has-[:focus-visible]:border-lime">
              <input type="radio" name="category" value={c.value} defaultChecked={c.value === "product"} className="sr-only" />
              {c.label}
            </label>
          ))}
        </div>
      </fieldset>

      <Field label="Scene" hint="Optional" htmlFor="props">
        <textarea id="props" name="props" rows={2} placeholder="e.g. marble table, soft morning light, eucalyptus leaves" className={`${inputClass} resize-none`} />
      </Field>

      <Field label="Images" htmlFor="n_variants">
        <select id="n_variants" name="n_variants" defaultValue="3" className={inputClass}>
          {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </Field>
    </>
  );
}
