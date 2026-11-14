/** Showcase reel behaviour: pinned horizontal scrub (desktop), sticky stacking deck (touch), screen pans, counter, scramble, GL distortion. */
import type { Tier } from "./tier";
import { attachDistort } from "./gl/distort";
import { scramble } from "./scramble";

export function initReel(gsap: any, ScrollTrigger: any, tier: Tier) {
  const root = document.querySelector<HTMLElement>("[data-reel]");
  if (!root) return;
  const track = root.querySelector<HTMLElement>("[data-reel-track]")!;
  const cards = [...root.querySelectorAll<HTMLElement>("[data-reel-card]")];
  const nEl = root.querySelector<HTMLElement>("[data-reel-n]");
  const prog = root.querySelector<HTMLElement>("[data-reel-prog]");
  const mm = gsap.matchMedia();

  // per-card pan of the tall screenshot, scrubbed by `p` (0..1)
  const panOf = (card: HTMLElement) => {
    const img = card.querySelector<HTMLImageElement>("[data-pan]");
    const screen = card.querySelector<HTMLElement>(".rc-screen");
    if (!img || !screen) return null;
    let max = 0;
    // layout sizes (offsetHeight), not getBoundingClientRect: the stage is tilted in 3D, which inflates projected boxes
    const measure = () => { max = Math.max(0, img.offsetHeight - screen.clientHeight); };
    measure(); img.addEventListener("load", measure); new ResizeObserver(measure).observe(screen);
    const set = (p: number) => { img.style.setProperty("--pan", `${-Math.round(max * Math.min(1, Math.max(0, p)))}px`); };
    return { set, crop: (): [number, number, number, number] => {
      const ih = img.offsetHeight || 1, sh = screen.clientHeight;
      const pan = -parseFloat(img.style.getPropertyValue("--pan") || "0");
      const h = Math.min(1, sh / ih), t = Math.min(1 - h, pan / ih);
      return [0, 1 - t - h, 1, h];
    } };
  };
  const pans = cards.map(panOf);

  // preview loops (UniLink, MSBT: recordings of the live sites; RoseEmpire CRM: animated walkthrough of its screens).
  // They load nothing until a card is near, play only while it is on screen, and never play in the static tier,
  // with reduced motion or with Save-Data on: those visitors keep the poster frame.
  const saveData = (navigator as any).connection?.saveData === true;
  const videos = [...root.querySelectorAll<HTMLVideoElement>("[data-reel-video]")];
  // in view, and (on the touch deck) not covered by the next card
  const inView = new WeakSet<HTMLVideoElement>(), covered = new WeakSet<HTMLVideoElement>();
  const sync = (v: HTMLVideoElement) => { if (inView.has(v) && !covered.has(v)) { if (v.preload !== "auto") v.preload = "auto"; v.play().catch(() => {}); } else v.pause(); };
  const canPlay = tier !== "static" && !saveData && "IntersectionObserver" in window;
  if (canPlay) {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      const v = e.target as HTMLVideoElement;
      if (e.isIntersecting && e.intersectionRatio >= 0.35) inView.add(v); else inView.delete(v);
      sync(v);
    }), { threshold: [0, 0.35, 0.6] });
    videos.forEach((v) => { v.muted = true; io.observe(v); });
    document.addEventListener("visibilitychange", () => { if (document.hidden) videos.forEach((v) => v.pause()); });
  }

  // GL hover distortion on desktop full tier
  if (tier === "full") cards.forEach((c, i) => {
    const screen = c.querySelector<HTMLElement>("[data-distort]");
    const img = c.querySelector<HTMLImageElement | HTMLVideoElement>("[data-distort-img]");
    if (!screen || !img) return;
    const pan = pans[i];
    attachDistort(screen, img, pan ? pan.crop : () => {
      // object-fit: cover, anchored to the top for the preview loops
      const nw = img instanceof HTMLVideoElement ? img.videoWidth : img.naturalWidth, nh = img instanceof HTMLVideoElement ? img.videoHeight : img.naturalHeight;
      const ia = nw / Math.max(1, nh), sa = screen.clientWidth / Math.max(1, screen.clientHeight);
      return ia > sa ? [(1 - sa / ia) / 2, 0, sa / ia, 1] : [0, 1 - ia / sa, 1, ia / sa];
    });
  });

  // titles decode once when the card arrives
  const decoded = new WeakSet<Element>();
  const decode = (card: HTMLElement) => {
    const a = card.querySelector<HTMLElement>("[data-scramble]");
    if (a && !decoded.has(a)) { decoded.add(a); scramble(a); }
  };

  mm.add("(min-width: 1024px)", () => {
    root.setAttribute("data-reel-ready", "");
    const dist = () => Math.max(0, track.scrollWidth - innerWidth + parseFloat(getComputedStyle(track).paddingLeft || "0") * 0);
    let lastN = -1;
    const tween = gsap.to(track, {
      x: () => -dist(), ease: "none",
      scrollTrigger: {
        trigger: root.querySelector("[data-reel-pin]"), pin: true, start: "top top", end: () => `+=${dist() * 1.05}`, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1,
        onUpdate(self: any) {
          const p = self.progress, n = Math.min(cards.length - 1, Math.round(p * (cards.length - 1)));
          if (prog) prog.style.transform = `scaleX(${(p * (cards.length - 1) + 1) / cards.length})`;
          if (n !== lastN) { lastN = n; if (nEl) nEl.textContent = String(n + 1).padStart(2, "0"); decode(cards[n]); }
        },
      },
    });
    // each card: pan its screen while it crosses, slight skew-in of the info column
    const triggers = cards.map((card, i) => {
      const info = card.querySelector(".rc-info");
      const t1 = ScrollTrigger.create({
        trigger: card, containerAnimation: tween, start: "left right", end: "right left",
        onUpdate: (s: any) => pans[i]?.set(s.progress),
      });
      const t2 = gsap.fromTo(info, { xPercent: 22 }, { xPercent: 0, ease: "none",
        scrollTrigger: { trigger: card, containerAnimation: tween, start: "left 95%", end: "left 35%", scrub: true } });
      const idx = card.querySelector(".rc-idx");
      const t3 = idx && gsap.fromTo(idx, { x: 120 }, { x: -40, ease: "none", scrollTrigger: { trigger: card, containerAnimation: tween, start: "left right", end: "right left", scrub: true } });
      return [t1, t2, t3];
    });
    decode(cards[0]);
    return () => { root.removeAttribute("data-reel-ready"); triggers.flat().forEach((t: any) => t && (t.scrollTrigger ? t.scrollTrigger.kill() : t.kill?.())); gsap.set(track, { clearProps: "x" }); };
  });

  mm.add("(max-width: 1023px)", () => {
    // sticky deck: each card scales back and dims as the next one covers it; screen pans while in view
    const tw = cards.map((card, i) => {
      const inner = card.querySelector(".rc-in");
      const out = i < cards.length - 1 ? gsap.to(inner, { scale: 0.9, opacity: 0.5, ease: "none",
        scrollTrigger: { trigger: cards[i + 1], start: "top bottom", end: "top 20%", scrub: true } }) : null;
      const pan = ScrollTrigger.create({ trigger: card, start: "top 80%", end: "bottom top", onUpdate: (s: any) => pans[i]?.set(s.progress), onEnter: () => decode(card) });
      // a loop stops once the next card has slid over most of it, and resumes if the visitor scrolls back
      const v = card.querySelector<HTMLVideoElement>("[data-reel-video]");
      const cover = v && canPlay && i < cards.length - 1 ? ScrollTrigger.create({ trigger: cards[i + 1], start: "top 40%",
        onEnter: () => { covered.add(v); sync(v); }, onLeaveBack: () => { covered.delete(v); sync(v); } }) : null;
      return [out, pan, cover];
    });
    return () => tw.flat().forEach((t: any) => t && (t.scrollTrigger ? t.scrollTrigger.kill() : t.kill?.()));
  });
}
