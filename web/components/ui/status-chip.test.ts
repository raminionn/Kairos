import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import type { Job } from "@/lib/api-types";
import { StatusChip } from "./status-chip";

it("truncates a long error and keeps the full text in a tooltip", () => {
  const error = "Upstream image model returned an unexpected response after three retries";
  const job = { id: "j", kind: "video", status: "failed", stage: null, progress: 60, error, created_at: "", updated_at: "", input: {} } as Job;
  const html = renderToStaticMarkup(createElement(StatusChip, { job }));
  expect(html).toContain("truncate");
  expect(html).not.toContain("whitespace-nowrap");
  expect(html).toContain(`title="failed · ${error}"`);
});
