// SVG stand-ins for media the real API will serve, so no binary files are committed.
import { SLIDES } from "./data";

const COLOURS = [["#ff8fd8", "#f05bb5"], ["#8b92e8", "#4b0fc8"], ["#fff3c4", "#fbd431"], ["#ffe0cc", "#f27a2e"], ["#e7f3e4", "#5d8752"]];

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const pick = (s: string) => COLOURS[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % COLOURS.length];

/** `path` is the file path inside the job folder, e.g. "variants/v1.png" or "clips/c01.jpg". */
export function placeholderSvg(path: string): string {
  const [a, b] = pick(path);
  const name = path.split("/").pop() ?? path;
  const bg = `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>`;

  if (path.startsWith("clips/")) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 640">${bg}<rect width="360" height="640" fill="url(#g)"/>
<circle cx="180" cy="250" r="70" fill="#4b0fc8"/><path d="M60 640 Q70 400 180 380 Q290 400 300 640Z" fill="#4b0fc8"/>
<rect x="60" y="470" width="240" height="44" rx="8" fill="#fff"/><text x="180" y="500" font-family="sans-serif" font-weight="700" font-size="22" text-anchor="middle">${esc(name)}</text></svg>`;
  }
  if (path.startsWith("slides/")) {
    const n = Number.parseInt(name, 10) || 1;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1350"><rect width="1080" height="1350" fill="#fff"/>
<rect x="0" y="0" width="1080" height="24" fill="${b}"/><text x="90" y="300" font-family="sans-serif" font-size="96" font-weight="600">${esc(SLIDES[n - 1] ?? "Slide")}</text>
<text x="990" y="1260" font-family="sans-serif" font-size="40" fill="#999" text-anchor="end">${n}/${SLIDES.length}</text></svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500">${bg}<rect width="400" height="500" fill="url(#g)"/>
<ellipse cx="200" cy="430" rx="130" ry="20" fill="rgba(0,0,0,.12)"/><rect x="140" y="140" width="120" height="30" rx="8" fill="#3a1fa8"/>
<rect x="120" y="165" width="160" height="260" rx="36" fill="#ffb12e"/><rect x="138" y="250" width="124" height="70" rx="10" fill="#fff"/>
<text x="200" y="293" font-family="sans-serif" font-weight="700" font-size="22" text-anchor="middle">HONEY</text>
<text x="20" y="485" font-family="sans-serif" font-size="16" fill="#fff">${esc(name)}</text></svg>`;
}
