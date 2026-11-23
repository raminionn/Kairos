import { describe, expect, it } from "vitest";
import { createJob, getJob, jobAt, listJobs, outputsFor, RUN_MS, STAGES } from "./store";

const T0 = 1_800_000_000_000;

describe("jobAt", () => {
  const job = createJob("video", { name: "talk.mp4" }, T0);

  it("is queued with no progress at the start", () => {
    const j = jobAt(job, T0);
    expect(j.status).toBe("queued");
    expect(j.progress).toBe(0);
  });

  it("is running mid-way with a stage from the module flow", () => {
    const j = jobAt(job, T0 + 4000);
    expect(j.status).toBe("running");
    expect(j.progress).toBeGreaterThanOrEqual(1);
    expect(j.progress).toBeLessThanOrEqual(99);
    expect(STAGES.video).toContain(j.stage);
  });

  it("is done at RUN_MS", () => {
    const j = jobAt(job, T0 + RUN_MS);
    expect(j.status).toBe("done");
    expect(j.progress).toBe(100);
  });

  it("fails when the input name contains 'fail'", () => {
    const j = jobAt(createJob("video", { name: "fail.mp4" }, T0), T0 + RUN_MS);
    expect(j.status).toBe("failed");
    expect(j.error).toBe("Mock failure");
  });
});

describe("store", () => {
  it("lists created jobs newest first and finds them by id", () => {
    const a = createJob("carousel", { name: "older" }, T0);
    const b = createJob("carousel", { name: "newer" }, T0 + 10);
    const ids = listJobs(T0 + 20).map((j) => j.id);
    expect(ids.indexOf(b.id)).toBeLessThan(ids.indexOf(a.id));
    expect(getJob(a.id, T0 + 20)?.input.name).toBe("older");
    expect(getJob("nope", T0)).toBeUndefined();
  });
});

describe("outputsFor", () => {
  it("gives one product_image per variant, including an empty-path one", () => {
    const job = jobAt(createJob("product", { name: "jar.png", category: "product", n_variants: 3 }, T0), T0 + RUN_MS);
    const outs = outputsFor(job);
    expect(outs).toHaveLength(3);
    expect(outs.every((o) => o.kind === "product_image")).toBe(true);
    expect(outs.some((o) => o.url === "")).toBe(true);
  });

  it("gives nothing while the job is running", () => {
    const job = jobAt(createJob("product", { name: "jar.png", category: "product", n_variants: 3 }, T0), T0 + 4000);
    expect(outputsFor(job)).toEqual([]);
  });
});
