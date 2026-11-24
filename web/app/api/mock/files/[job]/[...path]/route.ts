import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { NextRequest } from "next/server";
import { resolveMockFile } from "@/mock/media";

let cover: string | undefined;
async function coverDataUri() {
  cover ??= `data:image/jpeg;base64,${(await readFile(join(process.cwd(), "public/mock/slides/cover.jpg"))).toString("base64")}`;
  return cover;
}

/** Photos redirect to public/mock; slides are SVG; videos and PDFs do not exist in the mock. */
export async function GET(req: NextRequest, ctx: RouteContext<"/api/mock/files/[job]/[...path]">) {
  const path = (await ctx.params).path.join("/");
  const file = resolveMockFile(path, path === "slides/1.png" ? await coverDataUri() : undefined);
  if (!file) return Response.json({ detail: "The mock API has no such file." }, { status: 404 });
  if ("redirect" in file) return Response.redirect(new URL(file.redirect, req.url), 307);
  return new Response(file.svg, { headers: { "content-type": "image/svg+xml", "cache-control": "no-store" } });
}
