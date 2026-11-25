import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, listJobs } from "./api";

afterEach(() => vi.unstubAllGlobals());

describe("api errors", () => {
  it("turns a 500 with a detail into an ApiError with that message", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ detail: "boom" }), { status: 500 })));
    const err = await listJobs().catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(500);
    expect(err.message).toBe("boom");
  });

  it("turns a network failure into an ApiError with status 0", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
    const err = await listJobs().catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(0);
  });
});
