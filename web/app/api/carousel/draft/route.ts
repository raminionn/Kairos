// POST /api/carousel/draft {summary, brand_name?, goal?} -> Draft. The OpenRouter key stays on the server.
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { checkDraft, DRAFT_MODELS, DRAFT_PROMPT, SUMMARY_MAX } from "@/lib/carousel-draft";

/** From the environment, else the repo's root .env (where the Python stages read it). */
function apiKey() {
  if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY;
  const env = resolve(process.cwd(), "..", ".env");
  return existsSync(env) ? readFileSync(env, "utf8").match(/^OPENROUTER_API_KEY=["']?([^"'\r\n]+)/m)?.[1] : undefined;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const summary = typeof body?.summary === "string" ? body.summary.trim() : "";
  if (!summary) return Response.json({ detail: "Write a short summary first." }, { status: 422 });
  if (summary.length > SUMMARY_MAX) return Response.json({ detail: `Keep the summary under ${SUMMARY_MAX} characters.` }, { status: 422 });
  const key = apiKey();
  if (!key) return Response.json({ detail: "OPENROUTER_API_KEY is not set." }, { status: 500 });

  const context = [body?.brand_name && `Brand: ${String(body.brand_name).slice(0, 40)}`, body?.goal && `Goal: ${String(body.goal).slice(0, 20)}`]
    .filter(Boolean).join("\n");
  const messages = [{ role: "system", content: DRAFT_PROMPT }, { role: "user", content: `${context}\n\nSummary:\n${summary}` }];
  let problem = "";
  for (let attempt = 0; attempt < 2; attempt++) { // spec: one retry when the JSON breaks a rule
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ models: DRAFT_MODELS, messages, temperature: 0.3, response_format: { type: "json_object" } }),
      signal: AbortSignal.timeout(60_000),
    }).catch((e: Error) => e);
    if (res instanceof Error) return Response.json({ detail: `The AI did not answer (${res.message}).` }, { status: 502 });
    const data = await res.json().catch(() => null);
    if (!res.ok) return Response.json({ detail: data?.error?.message ?? `The AI service failed (${res.status}).` }, { status: 502 });
    const reply = String(data?.choices?.[0]?.message?.content ?? "");
    const checked = checkDraft(reply, summary);
    if ("draft" in checked) return Response.json(checked.draft);
    problem = checked.error;
    messages.push({ role: "assistant", content: reply }, { role: "user", content: `${problem} Return the corrected JSON only.` });
  }
  return Response.json({ detail: `The AI copy broke a rule twice: ${problem} Try a shorter summary.` }, { status: 502 });
}
