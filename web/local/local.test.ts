import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { runStatus, safeJobFile, understandingMeta } from "./local";

const ROOT = resolve("/repo");

describe("safeJobFile", () => {
  it("resolves a file inside the job folder", () => {
    expect(safeJobFile(ROOT, "v1-abc", "understanding.json")).toBe(join(ROOT, "data", "jobs", "v1-abc", "understanding.json"));
  });

  it("refuses paths that leave the job folder", () => {
    for (const p of ["../v2/source.mp4", "../../.env", "a/../../x", "/etc/passwd", "C:\\Windows\\win.ini"]) {
      expect(safeJobFile(ROOT, "v1-abc", p)).toBeNull();
    }
  });

  it("refuses job ids that are not plain ids", () => {
    expect(safeJobFile(ROOT, "../v1", "a.json")).toBeNull();
    expect(safeJobFile(ROOT, "", "a.json")).toBeNull();
  });
});

describe("runStatus", () => {
  it("is running while the process has not exited", () => {
    expect(runStatus({ exitCode: null, outputExists: false, stderrTail: "" })).toEqual({ status: "running", error: null });
  });

  it("is done when the process exits 0 and wrote its output", () => {
    expect(runStatus({ exitCode: 0, outputExists: true, stderrTail: "" })).toEqual({ status: "done", error: null });
  });

  it("fails with the last stderr line on a non-zero exit", () => {
    expect(runStatus({ exitCode: 1, outputExists: false, stderrTail: "Traceback...\nFileNotFoundError: x.mp4\n" }))
      .toEqual({ status: "failed", error: "FileNotFoundError: x.mp4" });
  });

  it("fails when the process exits 0 but wrote nothing", () => {
    expect(runStatus({ exitCode: 0, outputExists: false, stderrTail: "" }))
      .toEqual({ status: "failed", error: "The stage finished without writing its output." });
  });
});

describe("understandingMeta", () => {
  it("keeps what the UI shows and drops word timings", () => {
    const meta = understandingMeta({
      video_id: "v1", duration: 42, route: "transcript", speech_ratio: 0.86, asr_confidence: 0.91,
      genre: "unknown", genre_confidence: 0, words: [{ w: "so", start: 0, end: 0.2 }],
      segments: [{ start: 0.4, end: 3, text: "Welcome back.", visual: null }],
    });
    expect(meta).toEqual({
      duration: 42, route: "transcript", speech_ratio: 0.86, asr_confidence: 0.91, genre: "unknown", genre_confidence: 0,
      word_count: 1, segments: [{ start: 0.4, end: 3, text: "Welcome back.", visual: null }],
    });
  });
});
