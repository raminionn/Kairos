"""Layout guard: measures the rendered slides in Chromium.

Per slide it checks: text clipped or outside the safe margins, text colliding with the header/footer
or with other text/media, media squeezed too small, chart labels cut off, and WCAG text contrast.
Overflow is fixed deterministically by stepping the slide's text scale (--fit) down; decorations that
would cover text are hidden. Anything it cannot fix is reported as an error.
"""
from __future__ import annotations

FIT_STEPS = [1.0, 0.94, 0.88, 0.82, 0.76, 0.70]
LARGE_PX, LARGE_BOLD_PX = 36, 28  # "large text" is judged on the 1080px canvas, since slides are viewed shrunk

CHECK_JS = r"""
({idx, hideDeco, lg, lgb}) => {
  const S = document.querySelectorAll('.slide')[idx];
  const sr = S.getBoundingClientRect();
  const M = parseFloat(getComputedStyle(S).getPropertyValue('--M')) || 84;
  const out = [];
  const add = (sev, kind, msg) => out.push({sev, kind, msg});
  const desc = e => { const c = (e.getAttribute('class') || '').split(' ')[0];
    return `${e.tagName.toLowerCase()}${c ? '.' + c : ''} "${(e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 34)}"`; };
  const inter = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
                          Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  const lines = e => { const rg = document.createRange(); rg.selectNodeContents(e);
    return [...rg.getClientRects()].filter(q => q.width > 1 && q.height > 1); };
  const top = S.querySelector('.chrome-top'), foot = S.querySelector('.chrome-bottom');
  const inChrome = e => (top && top.contains(e)) || (foot && foot.contains(e));
  const topB = top ? top.getBoundingClientRect().bottom : sr.top;
  const footT = foot ? foot.getBoundingClientRect().top : sr.bottom;
  const texts = [...S.querySelectorAll('[data-guard]')].filter(e => (e.textContent || '').trim() && e.getClientRects().length);

  for (const e of texts) {
    const r = e.getBoundingClientRect();
    if (!inChrome(e)) {
      if (r.left < sr.left + M - 2 || r.right > sr.right - M + 2) add('error', 'margin', `${desc(e)} runs into the side margins`);
      if (r.top < topB + 6 || r.bottom > footT - 6) add('error', 'margin', `${desc(e)} collides with the header/footer zone`);
    }
    const card = e.closest('.card');
    if (card) { const c = card.getBoundingClientRect();
      if (r.left < c.left + 24 || r.right > c.right - 24 || r.top < c.top + 24 || r.bottom > c.bottom - 24)
        add('error', 'overflow', `${desc(e)} spills past the edge of the card`); }
    const svg = e.ownerSVGElement;
    if (svg) {
      const v = svg.getBoundingClientRect();
      if (r.left < v.left - 1 || r.right > v.right + 1 || r.top < v.top - 1 || r.bottom > v.bottom + 1)
        add('error', 'clip', `chart label ${desc(e)} is cut off`);
    } else if (getComputedStyle(e).display !== 'inline' && lines(e).some(q => q.left < r.left - 1 || q.right > r.right + 1)) {
      add('error', 'clip', `${desc(e)} has text running outside its box`);
    }
  }
  const main = S.querySelector('.main'), det = S.querySelector('.details'), media = S.querySelector('.media');
  if (main && det && det.getBoundingClientRect().bottom > main.getBoundingClientRect().bottom + 1)
    add('error', 'overflow', 'text is taller than the space available on this slide');
  if (media) {
    const mr = media.getBoundingClientRect();
    if (mr.height < 260 || mr.width < 260) add('error', 'media', `media area squeezed to ${Math.round(mr.width)}x${Math.round(mr.height)}px`);
    for (const e of texts) if (!media.contains(e) && inter(e.getBoundingClientRect(), mr) > 4) add('error', 'overlap', `${desc(e)} overlaps the media`);
  }
  for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
    const a = texts[i], b = texts[j];
    if (a.contains(b) || b.contains(a)) continue;
    if (inter(a.getBoundingClientRect(), b.getBoundingClientRect()) > 4) add('error', 'overlap', `${desc(a)} overlaps ${desc(b)}`);
  }
  if (hideDeco) {
    const grow = (r, n) => ({left: r.left - n, right: r.right + n, top: r.top - n, bottom: r.bottom + n});
    const placed = [];
    const busy = r => texts.some(t => !inChrome(t) && lines(t).some(q => inter(q, grow(r, 10)) > 4)) ||
                      placed.some(p => inter(p, grow(r, 6)) > 4);
    for (const d of S.querySelectorAll('[data-deco]')) {
      if (getComputedStyle(d).display === 'none') continue;
      let r = d.getBoundingClientRect(), ok = !busy(r);
      if (!ok) {
        for (const sl of (d.getAttribute('data-slots') || '').split(';').filter(Boolean)) {
          const [x, y] = sl.split(',').map(Number);
          Object.assign(d.style, {left: x + 'px', top: y + 'px', right: 'auto', bottom: 'auto'});
          r = d.getBoundingClientRect();
          if (!busy(r)) { ok = true; break; }
        }
      }
      if (ok) placed.push(r);
      else { d.style.display = 'none'; add('warn', 'decoration', `a ${(d.getAttribute('class') || '').split(' ')[1] || 'decoration'} had no free spot beside the title, so it was hidden`); }
    }
  }

  const parse = s => { const m = (s || '').match(/rgba?\(([^)]+)\)/); if (!m) return null;
    const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return {r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1}; };
  const over = (f, b) => ({r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1});
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const hex = c => '#' + [c.r, c.g, c.b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
  const bgOf = e => { const stack = []; let unver = false;
    for (let n = e; n && n.nodeType === 1; n = n.parentElement) {
      const cs = getComputedStyle(n), bg = parse(cs.backgroundColor);
      if (cs.backgroundImage !== 'none' && (!bg || bg.a === 0)) unver = true;
      if (bg && bg.a > 0) { stack.push(bg); if (bg.a >= 1) break; }
    }
    let base = {r: 255, g: 255, b: 255, a: 1};
    for (let i = stack.length - 1; i >= 0; i--) base = over(stack[i], base);
    return {c: base, unver}; };
  for (const e of texts) {
    const cs = getComputedStyle(e), fg0 = parse(e.ownerSVGElement ? cs.fill : cs.color);
    if (!fg0) { add('warn', 'contrast', `${desc(e)}: colour could not be read, so contrast was not checked`); continue; }
    const {c: bg, unver} = bgOf(e), fg = over(fg0, bg);
    const l1 = lum(fg), l2 = lum(bg), ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    const fs = parseFloat(cs.fontSize), wt = parseInt(cs.fontWeight) || 400;
    const need = (fs >= lg || (fs >= lgb && wt >= 700)) ? 3 : 4.5;
    if (unver) add('warn', 'contrast', `${desc(e)} sits on an image or gradient, so contrast cannot be verified`);
    else if (ratio < need) add('error', 'contrast', `${desc(e)}: contrast ${ratio.toFixed(2)}:1, needs ${need}:1 (${hex(fg)} on ${hex(bg)})`);
  }
  return out;
}
"""


def _check(page, idx, hide_deco=False):
    return page.evaluate(CHECK_JS, {"idx": idx, "hideDeco": hide_deco, "lg": LARGE_PX, "lgb": LARGE_BOLD_PX})


def run_guard(page, n_slides: int, steps=FIT_STEPS):
    """Returns (issues, fits). Issues are dicts with slide (0-based), sev, kind, msg."""
    fits, issues = {}, []
    for i in range(n_slides):
        chosen = steps[0]
        for step in steps:
            page.evaluate("([i, v]) => document.querySelectorAll('.slide')[i].style.setProperty('--fit', v)", [i, step])
            chosen = step
            if not any(x["sev"] == "error" and x["kind"] != "contrast" for x in _check(page, i)):
                break
        fits[i] = chosen
        final = _check(page, i, hide_deco=True)
        if chosen != steps[0] and not any(x["sev"] == "error" and x["kind"] != "contrast" for x in final):
            issues.append({"slide": i, "sev": "info", "kind": "fit", "msg": f"text scaled to {round(chosen * 100)}% to fit"})
        issues += [{"slide": i, **x} for x in final]
    return issues, fits
