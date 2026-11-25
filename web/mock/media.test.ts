import { describe, expect, it } from "vitest";
import { resolveMockFile } from "./media";

describe("resolveMockFile", () => {
  it("maps product variants and the source to real photos", () => {
    expect(resolveMockFile("variants/v2.png")).toEqual({ redirect: "/mock/product/v2.jpg" });
    expect(resolveMockFile("source.jpg")).toEqual({ redirect: "/mock/product/source.jpg" });
  });

  it("maps clip thumbnails to real photos", () => {
    expect(resolveMockFile("clips/c03.jpg")).toEqual({ redirect: "/mock/clips/c03.jpg" });
  });

  it("draws text slides as SVG with the slide title", () => {
    const r = resolveMockFile("slides/2.png");
    expect(r && "svg" in r && r.svg).toContain("Myth 1");
  });

  it("returns nothing for files the mock does not have", () => {
    for (const p of ["variants/v9.png", "clips/c07.jpg", "clips/c01.mp4", "carousel.pdf", "../.env", "slides/9.png"]) {
      expect(resolveMockFile(p)).toBeNull();
    }
  });
});
