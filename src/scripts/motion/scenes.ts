/**
 * Page-wide scroll scenes (GSAP ScrollTrigger):
 * - [data-parallax="0.15"]: element drifts against scroll by that fraction of its travel.
 * - hero: content lifts and fades a little as you leave; scroll cue fades.
 * - [data-manifesto]: pinned on desktop while each word lights up in order (scrubbed).
 * - [data-marquee]: endless line whose speed and direction follow scroll velocity.
 * - [data-slab]: giant footer wordmark rises out of a mask.
 */
import type { Tier } from "./tier";

export function initScenes(gsap: any, ScrollTrigger: any, tier: Tier) {
  const desktop = matchMedia("(min-width: 1024px)").matches;

  document.querySelectorAll<HTMLElement>("[data-parallax]").forEach((el) => {
    const k = parseFloat(el.dataset.parallax || "0.15");
    gsap.fromTo(el, { yPercent: -k * 50 }, { yPercent: k * 50, ease: "none", scrollTrigger: { trigger: el.parentElement || el, start: "top bottom", end: "bottom top", scrub: true } });
  });

  const hero = document.querySelector<HTMLElement>("[data-hero]");
  if (hero) {
    const inner = hero.querySelector(".hero-in");
    gsap.to(inner, { yPercent: -14, opacity: 0.2, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true } });
    const cue = hero.querySelector(".hero-cue");
    if (cue) gsap.to(cue, { opacity: 0, ease: "none", scrollTrigger: { trigger: hero, start: "top top", end: "+=200", scrub: true } });
  }

  document.querySelectorAll<HTMLElement>("[data-manifesto]").forEach((m) => {
    // colour (not opacity) so unlit words still pass contrast (muted ink is 7:1)
    const words = m.querySelectorAll(".mf-w");
    const cs = getComputedStyle(document.documentElement);
    const dim = cs.getPropertyValue("--ink-3").trim() || "#9c978c", lit = cs.getPropertyValue("--ink").trim() || "#f5f2ea";
    m.classList.add("is-scrub");
    gsap.fromTo(words, { color: dim }, {
      color: lit, ease: "none", stagger: 0.08,
      scrollTrigger: desktop
        ? { trigger: m.closest("[data-manifesto-pin]") || m, start: "top 18%", end: "+=110%", pin: true, scrub: 0.6, anticipatePin: 1 }
        : { trigger: m, start: "top 80%", end: "bottom 45%", scrub: 0.6 },
    });
  });

  document.querySelectorAll<HTMLElement>("[data-marquee]").forEach((mq) => {
    const track = mq.querySelector<HTMLElement>(".mq-track");
    if (!track) return;
    let x = 0, dir = -1, boost = 0;
    const speed = 0.045; // % of track width per frame at 60fps
    gsap.ticker.add((_t: number, dt: number) => {
      boost *= 0.92;
      x += dir * (speed + boost) * (dt / 16.7);
      if (x <= -50) x += 50; if (x > 0) x -= 50;
      track.style.transform = `translate3d(${x}%,0,0)`;
    });
    ScrollTrigger.create({ trigger: mq, start: "top bottom", end: "bottom top", onUpdate: (s: any) => {
      const v = s.getVelocity(); dir = v < 0 ? 1 : -1; boost = Math.min(0.6, Math.abs(v) / 4000);
    } });
  });

  document.querySelectorAll<HTMLElement>("[data-slab]").forEach((el) => {
    // finish 24 px before the bottom of the page, so the word is fully up even if smooth scrolling stops a hair short
    const slab = el.parentElement || el;
    gsap.fromTo(el, { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, ease: "power1.out", scrollTrigger: {
      trigger: slab, start: "top bottom", end: (st: any) => Math.max(st.start + 1, ScrollTrigger.maxScroll(window) - 24), scrub: true, invalidateOnRefresh: true } });
  });

  void tier;
}
