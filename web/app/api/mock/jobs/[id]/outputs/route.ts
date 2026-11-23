import { connection, type NextRequest } from "next/server";
import { getJob, outputsFor } from "@/mock/store";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/mock/jobs/[id]/outputs">) {
  await connection();
  const job = getJob((await ctx.params).id, Date.now());
  return job ? Response.json(outputsFor(job)) : Response.json({ detail: "Job not found." }, { status: 404 });
}
