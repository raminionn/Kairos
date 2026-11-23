import type { NextRequest } from "next/server";
import { placeholderSvg } from "@/mock/placeholder";

/** Images come back as SVG placeholders; videos and PDFs do not exist in the mock. */
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/mock/files/[job]/[...path]">) {
  const path = (await ctx.params).path.join("/");
  if (/\.(mp4|pdf)$/.test(path)) return Response.json({ detail: "The mock API has no real media files." }, { status: 404 });
  return new Response(placeholderSvg(path), { headers: { "content-type": "image/svg+xml", "cache-control": "no-store" } });
}
