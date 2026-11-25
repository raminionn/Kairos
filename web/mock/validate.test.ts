import { describe, expect, it } from "vitest";
import { pointRows, validateCreate } from "./validate";

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

  /** Carousel form; `rows` are [heading, detail] pairs, appended as repeated fields like the real form. */
  const carousel = (f: Record<string, string | File> = {}, rows: [string, string][] = [["List what must ship", ""], ["Review on Friday", "Move what slipped."]]) => {
    const fd = form({ brand_name: "Flowdesk", topic: "Plan your week", ...f });
    for (const [h, d] of rows) { fd.append("point_heading", h); fd.append("point_detail", d); }
    return validateCreate("carousel", fd);
  };

  it("needs a carousel topic", () => {
    expect(carousel({ topic: "  " })).toEqual({ ok: false, error: "Add a topic." });
  });

  it("needs a brand name for the carousel", () => {
    expect(carousel({ brand_name: "" })).toEqual({ ok: false, error: "Add your brand name." });
  });

  it("needs 1 to 5 key points and skips empty rows", () => {
    expect(carousel({}, [[" ", ""]])).toEqual({ ok: false, error: "Add 1 to 5 key points." });
    expect(carousel({}, Array.from({ length: 6 }, (_, i): [string, string] => [`P${i}`, ""]))).toEqual({ ok: false, error: "Add 1 to 5 key points." });
    expect(carousel({}, [["", ""], ["", "only a detail"]])).toEqual({ ok: false, error: "Key point 2: add a heading." });
  });

  it("checks heading and detail limits", () => {
    expect(carousel({}, [["x".repeat(81), ""]])).toEqual({ ok: false, error: "Key point 1: keep the heading under 80 characters." });
    expect(carousel({}, [["Short", "y".repeat(221)]])).toEqual({ ok: false, error: "Key point 1: keep the detail under 220 characters." });
  });

  it("checks the brand colour", () => {
    expect(carousel({ primary: "blue" })).toEqual({ ok: false, error: "Brand colour must look like #5b12f5." });
  });

  it("checks uploaded images", () => {
    expect(carousel({ photo: file("me.gif") })).toEqual({ ok: false, error: "me.gif: use a jpg, png or webp image." });
  });

  it("checks the numbers", () => {
    expect(carousel({ stat_value: "4", stat_label: "Tasks" })).toEqual({ ok: false, error: "Numbers: give at least 2 values, or none." });
    const fd = form({ brand_name: "B", topic: "T", point_heading: "H", point_detail: "" });
    for (const v of ["4", "many"]) { fd.append("stat_value", v); fd.append("stat_label", "x"); }
    expect(validateCreate("carousel", fd)).toEqual({ ok: false, error: "Each number needs a numeric value, e.g. 40." });
  });

  it("accepts a carousel with defaults and passes optional fields through", () => {
    expect(carousel({ theme: "bold", goal: "educate", handle: "@flowdesk", hook: " " })).toEqual({
      ok: true,
      input: { name: "Plan your week", topic: "Plan your week", brand_name: "Flowdesk", primary: "#5b12f5", goal: "educate", theme: "bold", handle: "@flowdesk",
        points: [{ heading: "List what must ship" }, { heading: "Review on Friday", detail: "Move what slipped." }] },
    });
    expect(carousel({ theme: "neon", goal: "explain" })).toMatchObject({ input: { theme: "editorial", goal: "tips" } });
  });
});

describe("pointRows", () => {
  it("keeps each image with its own row when an earlier row is empty", () => {
    const fd = new FormData();
    const img = new File(["x"], "b.png");
    for (const [h, i] of [["", new File([], "")], ["B", img]] as const) { fd.append("point_heading", h); fd.append("point_detail", ""); fd.append("point_image", i); }
    expect(pointRows(fd)).toEqual([{ row: 2, heading: "B", detail: "", image: img }]);
  });
});
