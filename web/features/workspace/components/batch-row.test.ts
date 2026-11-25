import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Job } from "@/lib/api-types";
import { BatchRow } from "./batch-row";

const job = (over: Partial<Job> = {}): Job => ({
  id: "p1", kind: "product", status: "done", stage: null, progress: 100, error: null,
  created_at: new Date().toISOString(), updated_at: new Date().toISOString(), input: { name: "jar.png" }, ...over,
});

const render = (j: Job, loaded: boolean) =>
  renderToStaticMarkup(createElement(BatchRow, {
    job: j, outputs: [], loaded, summary: "", gridClass: "", tileAspect: "", expected: 3, highlight: false,
    renderTile: () => null, onSelect: () => {},
  }));

describe("BatchRow", () => {
  it("shows no shimmer and says so when a finished job has no results to show", () => {
    const html = render(job(), true);
    expect(html).not.toContain("shimmer");
    expect(html).toContain("No results");
  });

  it("shows shimmers while a finished job's results are still loading", () => {
    expect(render(job(), false)).toContain("shimmer");
  });

  it("falls back to the job id when the API sends no input", () => {
    const bare: Partial<Job> = job();
    delete bare.input;
    expect(render(bare as Job, true)).toContain("p1");
  });
});
