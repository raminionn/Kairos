import { connection, type NextRequest } from "next/server";
import type { JobKind } from "@/lib/api-types";
import { createJob, getJob } from "@/mock/store";
import { validateCreate } from "@/mock/validate";
import { LOCAL, startLocalJob } from "@/local/runner";

const KINDS: JobKind[] = ["video", "product", "carousel"];

/** GET /jobs/{id} */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/mock/jobs/[id]">) {
  await connection();
  const job = getJob((await ctx.params).id, Date.now());
  return job ? Response.json(job) : Response.json({ detail: "Job not found." }, { status: 404 });
}

/** POST /jobs/{kind}: here the segment is the job kind, as in the real API. */
export async function POST(req: NextRequest, ctx: RouteContext<"/api/mock/jobs/[id]">) {
  const kind = (await ctx.params).id as JobKind;
  if (!KINDS.includes(kind)) return Response.json({ detail: "Unknown job kind." }, { status: 404 });
  const form = await req.formData().catch(() => null);
  if (!form) return Response.json({ detail: "Send the job as multipart form data." }, { status: 400 });
  const result = validateCreate(kind, form);
  if (!result.ok) return Response.json({ detail: result.error }, { status: 422 });
  if (LOCAL) {
    const started = await startLocalJob(kind, form, result.input);
    return "problem" in started ? Response.json({ detail: started.problem }, { status: started.code }) : Response.json(started, { status: 201 });
  }
  return Response.json(createJob(kind, result.input), { status: 201 });
}
