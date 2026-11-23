import { describe, expect, it } from "vitest";
import { validateCreate } from "./validate";

const file = (name: string) => new File(["x"], name);
const form = (fields: Record<string, string | File>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.append(k, v);
  return f;
};

describe("validateCreate", () => {
  it("rejects a video with the wrong type", () => {
    expect(validateCreate("video", form({ file: file("a.txt") }))).toEqual({ ok: false, error: "Video must be mp4, mov, mkv or webm." });
  });

  it("accepts an upper-case video extension and keeps the name", () => {
    expect(validateCreate("video", form({ file: file("a.MP4") }))).toEqual({ ok: true, input: { name: "a.MP4" } });
  });

  it("rejects a missing video file", () => {
    expect(validateCreate("video", form({}))).toEqual({ ok: false, error: "Video must be mp4, mov, mkv or webm." });
  });

  it("needs a product category", () => {
    expect(validateCreate("product", form({ file: file("a.png") }))).toEqual({ ok: false, error: "Pick a category." });
  });

  it("limits product variants to 1-4", () => {
    expect(validateCreate("product", form({ file: file("a.png"), category: "product", n_variants: "5" }))).toEqual({
      ok: false,
      error: "Variants must be 1 to 4.",
    });
  });

  it("rejects a product image with the wrong type", () => {
    expect(validateCreate("product", form({ file: file("a.gif"), category: "product" }))).toEqual({
      ok: false,
      error: "Image must be jpg, png or webp.",
    });
  });

  it("accepts a product with defaults", () => {
    expect(validateCreate("product", form({ file: file("jar.webp"), category: "packaging", props: " leaves " }))).toEqual({
      ok: true,
      input: { name: "jar.webp", category: "packaging", props: "leaves", n_variants: 3 },
    });
  });

  it("needs a carousel topic, text or source", () => {
    expect(validateCreate("carousel", form({ topic: "  " }))).toEqual({ ok: false, error: "Add a topic, text or a source video." });
  });

  it("accepts a carousel topic", () => {
    expect(validateCreate("carousel", form({ topic: "Funding tips" }))).toEqual({ ok: true, input: { name: "Funding tips", topic: "Funding tips" } });
  });
});
