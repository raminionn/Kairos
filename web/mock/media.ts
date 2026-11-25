// Media for the fake API. Photos are free Unsplash images in public/mock (see public/mock/CREDITS.md);
// carousel slides are drawn as SVG so their text matches the mock slide plan.
import { SLIDES } from "./data";

type Resolved = { redirect: string } | { svg: string } | null;

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

/** Greedy word wrap for SVG text, by character count. */
function wrap(text: string, max: number): string[] {
  return text.split(" ").reduce<string[]>((lines, w) => {
    const last = lines.at(-1);
    if (last !== undefined && `${last} ${w}`.length <= max) lines[lines.length - 1] = `${last} ${w}`;
    else lines.push(w);
    return lines;
  }, []);
}

const FONT = "Archivo, 'Helvetica Neue', Arial, sans-serif";

function slideSvg(n: number, cover?: string): string {
  const total = SLIDES.length;
  const lines = (size: number, x: number, y: number, text: string, max: number, fill: string) =>
    `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="500" fill="${fill}" letter-spacing="-2">${wrap(text, max)
      .map((l, i) => `<tspan x="${x}" dy="${i ? size * 1.08 : 0}">${esc(l)}</tspan>`).join("")}</text>`;
  const footer = (fill: string) =>
    `<text x="90" y="1270" font-family="${FONT}" font-size="34" font-weight="700" fill="${fill}">kairos</text>
<text x="990" y="1270" font-family="${FONT}" font-size="32" fill="${fill}" opacity=".7" text-anchor="end">${n} / ${total}</text>`;

  if (n === 1) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1350">
<defs><linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop offset=".35" stop-color="#0c0c0c" stop-opacity="0"/><stop offset="1" stop-color="#0c0c0c" stop-opacity=".85"/></linearGradient></defs>
<rect width="1080" height="1350" fill="#4b0fc8"/>${cover ? `<image href="${cover}" width="1080" height="1350" preserveAspectRatio="xMidYMid slice"/>` : ""}
<rect width="1080" height="1350" fill="url(#shade)"/>
<rect x="90" y="90" width="210" height="60" rx="30" fill="#fbd431"/><text x="195" y="131" font-family="${FONT}" font-size="28" font-weight="600" text-anchor="middle">CAROUSEL</text>
${lines(120, 90, 900, SLIDES[0], 14, "#fff")}
<text x="90" y="1150" font-family="${FONT}" font-size="34" fill="#fff" opacity=".85">Swipe to read →</text>${footer("#fff")}</svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1350"><rect width="1080" height="1350" fill="#fbfbf7"/>
<circle cx="980" cy="120" r="260" fill="#f05bb5" opacity=".12"/><rect x="90" y="110" width="80" height="12" rx="6" fill="#5b12f5"/>
<text x="90" y="330" font-family="${FONT}" font-size="150" font-weight="300" fill="#5b12f5">${String(n - 1).padStart(2, "0")}</text>
${lines(92, 90, 540, SLIDES[n - 1], 17, "#0c0c0c")}${footer("#0c0c0c")}</svg>`;
}

/**
 * Maps an API file path (as in Output.url, after /files/<job>/) to mock media.
 * `cover` is the cover photo as a data URI, because an SVG shown in <img> cannot load other files.
 */
export function resolveMockFile(path: string, cover?: string): Resolved {
  let m: RegExpMatchArray | null;
  if (path === "source.jpg") return { redirect: "/mock/product/source.jpg" };
  if ((m = path.match(/^variants\/v([1-4])\.png$/))) return { redirect: `/mock/product/v${m[1]}.jpg` };
  if ((m = path.match(/^clips\/(c0[1-6])\.jpg$/))) return { redirect: `/mock/clips/${m[1]}.jpg` };
  if ((m = path.match(/^slides\/(\d+)\.png$/))) {
    const n = Number(m[1]);
    return n >= 1 && n <= SLIDES.length ? { svg: slideSvg(n, cover) } : null;
  }
  return null;
}
