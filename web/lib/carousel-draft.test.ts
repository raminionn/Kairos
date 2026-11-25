import { describe, expect, it } from "vitest";
import { checkDraft } from "./carousel-draft";

const reply = (extra: object = {}) => JSON.stringify({
  topic: "Plan your week", hook: "Plan your week in ==10 minutes==", problem: "Mondays start messy.",
  points: [{ heading: "List what must ship", detail: "Only work with a deadline." }],
  stats: [{ value: 4, label: "Tasks a day" }, { value: 99, label: "Made up" }, { value: 2, label: "Focus blocks" }],
  cta: { heading: "Want more?", button: "Follow for more" }, ...extra,
});

describe("checkDraft", () => {
  it("keeps only numbers that appear in the summary", () => {
    const r = checkDraft(reply(), "I do 4 tasks a day in 2 focus blocks.");
    expect("draft" in r && r.draft.stats).toEqual([{ value: 4, label: "Tasks a day" }, { value: 2, label: "Focus blocks" }]);
  });

  it("drops a single surviving number (the chart needs 2)", () => {
    const r = checkDraft(reply(), "I do 4 tasks a day.");
    expect("draft" in r && r.draft.stats).toEqual([]);
  });

  it("accepts a fenced reply", () => {
    expect("draft" in checkDraft("```json\n" + reply() + "\n```", "")).toBe(true);
  });

  it("returns a retry message for broken JSON or text over the maker's limits", () => {
    expect(checkDraft("Sure! Here", "")).toEqual({ error: "The reply was not valid JSON." });
    expect(checkDraft(reply({ points: [{ heading: "x".repeat(81) }] }), "")).toEqual({ error: "Point 1 heading is over 80 characters." });
    expect(checkDraft(reply({ points: [] }), "")).toEqual({ error: "points is empty." });
  });
});
