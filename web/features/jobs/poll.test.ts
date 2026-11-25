import { describe, expect, it } from "vitest";
import type { Job } from "@/lib/api-types";
import { shouldPoll } from "./poll";

const job = (id: string, status: Job["status"]): Job => ({
  id, kind: "product", status, stage: null, progress: 0, error: null, created_at: "", updated_at: "", input: {},
});

describe("shouldPoll", () => {
  it("polls while any job is queued or running", () => {
    expect(shouldPoll([job("a", "running")], [], new Set())).toBe(true);
  });

  it("keeps polling until a finished job's outputs have loaded", () => {
    expect(shouldPoll([job("a", "done")], [job("a", "done")], new Set())).toBe(true);
  });

  it("stops when every job is idle and every finished job has its outputs", () => {
    expect(shouldPoll([job("a", "done"), job("b", "failed")], [job("a", "done")], new Set(["a"]))).toBe(false);
  });
});
