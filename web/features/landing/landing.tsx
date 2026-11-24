"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { landingMarkup } from "./markup";
import "./landing.css";

gsap.registerPlugin(ScrollTrigger);

// Chart presets per time pill: line points a,b,c,d · stat1 · stat2 · tip1 · tip2.
const SETS = [
  [220, 140, 190, 60, 27, 46, 25, 40],
  [220, 110, 200, 30, 32, 49, 25, 45],
  [200, 120, 170, 50, 30, 47, 37, 57],
  [230, 100, 210, 20, 50, 61, 49, 70],
  [210, 90, 180, 40, 44, 58, 31, 52],
  [190, 130, 200, 25, 36, 73, 40, 64],
];

export function Landing() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current!;
    const $ = <T extends Element = HTMLElement>(s: string) => el.querySelector(s) as T;
    const $$ = <T extends Element = HTMLElement>(s: string) => Array.from(el.querySelectorAll<T>(s));
    const timers: number[] = [];

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      // Big motion only on wide screens without "reduce motion".
      mm.add("(min-width: 900px) and (prefers-reduced-motion: no-preference)", () => {
        gsap.from(".hero h1 .ln>span", { yPercent: 110, duration: 1, ease: "power4.out", stagger: 0.1 });
        gsap.from(".cta-row", { opacity: 0, y: 20, duration: 0.8, delay: 0.4 });
        gsap.from([".s-yellow", ".s-pink", ".s-violet"], { yPercent: 70, duration: 1.3, ease: "power4.out", stagger: 0.08, delay: 0.2 });

        const scene = $(".scene");
        gsap
          .timeline({
            scrollTrigger: {
              trigger: "#hero", start: "top top", end: "+=320%", pin: true, scrub: 1,
              onUpdate: (s) => el.classList.toggle("dark", s.progress > 0.3 && s.progress < 0.985),
            },
          })
          .to(".hero-copy", { y: -120, opacity: 0, duration: 0.25 }, 0)
          .to(".s-yellow", { y: "40vh", rotate: 4, duration: 0.3 }, 0)
          .to(".s-pink", { y: "40vh", rotate: -8, duration: 0.3 }, 0)
          .to(".s-violet", { left: 0, width: () => innerWidth, top: 0, height: () => innerHeight, rotate: 0, borderRadius: 0, duration: 0.35, ease: "power2.inOut" }, 0.05)
          .fromTo(".scene", { rotate: 7 }, { rotate: 0, duration: 0.35, ease: "power2.inOut" }, 0.05)
          .to(".scene", { y: () => -(scene.offsetHeight - innerHeight), duration: 0.65, ease: "none" }, 0.4);

        $$(".reveal").forEach((h) =>
          gsap.from(h.querySelectorAll(".ln>span"), { yPercent: 110, duration: 1, ease: "power4.out", stagger: 0.1, scrollTrigger: { trigger: h, start: "top 85%" } }),
        );
        $$(".mcard").forEach((c) =>
          gsap.from(c, { y: () => 260 * parseFloat(c.dataset.speed ?? "1"), ease: "none", scrollTrigger: { trigger: ".cards3", start: "top bottom", end: "top 30%", scrub: true } }),
        );
        gsap.from(".bigword", { y: 80, opacity: 0, duration: 1, ease: "power4.out", scrollTrigger: { trigger: ".bigword", start: "top 85%" } });
        gsap.from(".cta", { y: 120, scale: 0.96, duration: 1.1, ease: "power3.out", scrollTrigger: { trigger: ".cta", start: "top 90%" } });
      });

      // The big text starts hidden by CSS; scrub it in, or show it at once.
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        $$(".reveal-scrub .ln>span").forEach((s) =>
          gsap.to(s, { y: 0, ease: "none", scrollTrigger: { trigger: s.parentElement, start: "top 95%", end: "top 65%", scrub: true } }),
        );
      });
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(".reveal-scrub .ln>span", { y: 0 });
      });

      // ---- analytics tabs: auto-advance with progress bars ----
      const titles = [$("#t0"), $("#t1"), $("#t2")];
      const tabs = [$("#tab0"), $("#tab1"), $("#tab2")];
      const bars = $$(".progress i");
      const show = (i: number) => {
        titles.forEach((t, k) => t.classList.toggle("off", k !== i));
        tabs.forEach((t, k) => {
          t.classList.toggle("on", k === i);
          if (k === i) t.querySelectorAll<HTMLElement>(".tag").forEach((x) => { x.style.animation = "none"; void x.offsetHeight; x.style.animation = ""; });
        });
        $$(".bars .bar").forEach((b) => (b.style.width = i === 1 ? (b.dataset.w ?? "0") : "0"));
        if (i === 2) {
          const p = $<SVGPathElement>("#yline");
          const L = p.getTotalLength();
          gsap.fromTo(p, { strokeDasharray: L, strokeDashoffset: L }, { strokeDashoffset: 0, duration: 1.6, ease: "power2.out" });
        }
        bars.forEach((b, k) => gsap.set(b, { width: k < i ? "100%" : "0%" }));
        gsap.fromTo(bars[i], { width: "0%" }, { width: "100%", duration: 5, ease: "none", onComplete: () => show((i + 1) % 3) });
      };
      // Auto-advance only when motion is allowed; with "reduce motion" the first tab stays still.
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        ScrollTrigger.create({ trigger: "#features", start: "top 60%", once: true, onEnter: () => show(0) });
      });

      // ---- ranking chart: time pills redraw the line and count the stats ----
      const tip1 = $("#tip1"), tip2 = $("#tip2");
      const setChart = (k: number) => {
        const [a, b, c, d, s1, s2, tp1, tp2] = SETS[k];
        const y2 = c + (d - c) * (60 / 160);
        gsap.to("#pline", { attr: { points: `0,${a} 90,${b} 240,${c} 400,${d}` }, duration: 0.8, ease: "power3.out" });
        gsap.to("#d1", { attr: { cy: b }, duration: 0.8 });
        gsap.to("#v1", { attr: { y1: b }, duration: 0.8 });
        gsap.to("#d2", { attr: { cy: y2 }, duration: 0.8 });
        gsap.to("#v2", { attr: { y1: y2 }, duration: 0.8 });
        tip1.style.top = `${(b / 240) * 100}%`;
        tip2.style.top = `${(y2 / 240) * 100}%`;
        tip1.textContent = `+${tp1}%`;
        tip2.textContent = `+${tp2}%`;
        gsap.to("#c1", { innerText: s1, snap: { innerText: 1 }, duration: 0.9 });
        gsap.to("#c2", { innerText: s2, snap: { innerText: 1 }, duration: 0.9 });
      };
      const segButtons = $$<HTMLButtonElement>("#seg button");
      const select = (b: HTMLButtonElement, k: number) => {
        segButtons.forEach((x) => x.classList.toggle("on", x === b));
        setChart(k);
      };
      let userPicked = false;
      segButtons.forEach((b, k) => (b.onclick = () => { userPicked = true; select(b, k); }));
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        let auto = 1;
        const t = window.setInterval(() => {
          if (userPicked) return window.clearInterval(t); // a user's choice is never overridden
          auto = (auto + 1) % SETS.length;
          select(segButtons[auto], auto);
        }, 3500);
        timers.push(t);
        return () => window.clearInterval(t);
      });

      // ---- stats: count up and pop the tag ----
      $$(".srow").forEach((r) =>
        ScrollTrigger.create({
          trigger: r, start: "top 75%", once: true,
          onEnter: () => {
            r.classList.add("in");
            const c = r.querySelector<HTMLElement>(".count")!;
            gsap.to(c, { innerText: c.dataset.to, snap: { innerText: 1 }, duration: 1.4, ease: "power2.out" });
            gsap.from(r.querySelector(".sart"), { scale: 0.8, opacity: 0, duration: 0.9, ease: "power3.out" });
          },
        }),
      );
    }, el);

    return () => {
      timers.forEach(clearInterval);
      ctx.revert();
    };
  }, []);

  return <div ref={root} className="landing" dangerouslySetInnerHTML={{ __html: landingMarkup }} />;
}
