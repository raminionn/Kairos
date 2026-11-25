import { describe, expect, it } from "vitest";
import { splitPoint, validateCreate } from "./validate";

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

  const NL = String.fromCharCode(10);
  const carousel = (f: Record<string, string>) =>
    validateCreate("carousel", form({ brand_name: "Flowdesk", topic: "Plan your week", points: "List what must ship" + NL + "Review on Friday", ...f }));

  it("needs a carousel topic", () => {
    expect(carousel({ topic: "  " })).toEqual({ ok: false, error: "Add a topic." });
  });

  it("needs a brand name for the carousel", () => {
    expect(carousel({ brand_name: "" })).toEqual({ ok: false, error: "Add your brand name." });
  });

  it("needs 1 to 5 key points", () => {
    expect(carousel({ points: " " + NL + " " })).toEqual({ ok: false, error: "Add 1 to 5 key points, one per line." });
    expect(carousel({ points: ["a", "b", "c", "d", "e", "f"].join(NL) })).toEqual({ ok: false, error: "Add 1 to 5 key points, one per line." });
  });

  it("checks the brand colour", () => {
    expect(carousel({ primary: "blue" })).toEqual({ ok: false, error: "Brand colour must look like #5b12f5." });
  });

  it("accepts a carousel with defaults", () => {
    expect(carousel({})).toEqual({
      ok: true,
      input: { name: "Plan your week", topic: "Plan your week", brand_name: "Flowdesk", primary: "#5b12f5", goal: "tips", points: ["List what must ship", "Review on Friday"] },
    });
  });
});

describe("splitPoint", () => {
  it("splits on the first colon", () => {
    expect(splitPoint("List what must ship: only work with a deadline")).toEqual({ heading: "List what must ship", detail: "only work with a deadline" });
  });

  it("splits a long line with no colon at its first sentence", () => {
    const long = "Building hardware is slow because every prototype takes weeks to arrive. Plan two versions ahead and order parts early.";
    expect(splitPoint(long)).toEqual({
      heading: "Building hardware is slow because every prototype takes weeks to arrive",
      detail: "Plan two versions ahead and order parts early.",
    });
  });

  it("keeps a short line as the heading", () => {
    expect(splitPoint("Review on Friday")).toEqual({ heading: "Review on Friday" });
  });
});

describe("carousel limits", () => {
  const f = (points: string) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries({ brand_name: "B", topic: "T", points })) fd.append(k, v);
    return validateCreate("carousel", fd);
  };

  it("rejects a heading over 80 characters before sending", () => {
    expect(f("x".repeat(81))).toEqual({ ok: false, error: "Key point 1: keep the heading under 80 characters. Put details after a colon (Heading: detail)." });
  });

  it("rejects a detail over 220 characters", () => {
    expect(f(`Short heading: ${"y".repeat(221)}`)).toEqual({ ok: false, error: "Key point 1: keep the detail under 220 characters." });
  });
});
