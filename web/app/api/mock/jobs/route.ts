import { connection } from "next/server";
import { listJobs } from "@/mock/store";

export async function GET() {
  await connection(); // per-request: job status depends on the current time
  return Response.json(listJobs(Date.now()));
}
