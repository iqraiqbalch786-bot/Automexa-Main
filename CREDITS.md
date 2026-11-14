# Credits and third-party sources

Every third-party component, pattern or asset used in this site, with its licence.
Checked on 8 Oct 2026. Re-check before launch if any of these are updated.

## Code adapted into the site

| What | Source | Licence | Where it is used | How it was adapted |
|---|---|---|---|---|
| SpotlightCard | React Bits, https://reactbits.dev/components/spotlight-card (github.com/DavidHDev/react-bits, `src/ts-default/Components/SpotlightCard`) | MIT + Commons Clause, © 2026 David Haz | Home services bento (`src/pages/index.astro`), services hub rows (`src/pages/services/index.astro`), every pricing card (`src/components/PlanCard.astro`) | Ported to one delegated, rAF-throttled `pointermove` listener (`src/scripts/ui/spotlight.ts`) plus CSS in `src/styles/global.css` (`[data-spotlight]`). No React. Fine pointers only. Glow sits under the content so text contrast is unchanged. Brand green. |
| CountUp | React Bits, https://reactbits.dev/text-animations/count-up (`src/ts-default/TextAnimations/CountUp`) | MIT + Commons Clause, © 2026 David Haz | Missed-call calculator results (`src/components/Calculator.astro`), on the home page and `/missed-call-calculator/` | Ported to vanilla TS (`src/scripts/ui/countup.ts`). No `motion` dependency. Tweens from the current value to the new value as the sliders move. Seeded with the server-rendered value so it never animates on load. Instant under `prefers-reduced-motion`. The animated numbers are not a live region; a separate visually hidden live region announces the settled result once. |
| LogoLoop | React Bits, https://reactbits.dev/animations/logo-loop (`src/ts-default/Animations/LogoLoop`) | MIT + Commons Clause, © 2026 David Haz | "Tools we connect" strip (`src/components/ToolLoop.astro`) on the home page and `/services/ai-automation/` | Rebuilt as a CSS-only transform loop (no JS for the motion). Text chips instead of third-party logo artwork. The duplicate copy is `aria-hidden`. Adds a real Pause/Play button (WCAG 2.2.2), pauses on hover and focus, and becomes a static wrapped list under `prefers-reduced-motion`. |

### React Bits licence (applies to the three rows above)

The full text is MIT plus the Commons Clause:

> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, and distribute the Software **as part of an application, website, or product**, subject to the following conditions: The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
>
> Commons Clause Restriction: You may use this Software, including for any commercial purpose, **so long as you do not sell, sublicense, or redistribute the components themselves, whether alone, in a bundle, or as a ported version.**

What this means for us:

- Commercial use inside the Automexa website is allowed.
- The copyright notice is kept in each adapted file header and in this file.
- We must not sell or redistribute these components (or our ports of them) on their own, for example as a template, a UI kit, or code given to a client as a product.

## Design reference only (no code copied)

| Source | Status | Why it is reference only | What we took as inspiration |
|---|---|---|---|
| Kombai gallery, https://kombai.com/gallery/web | Inspiration gallery | It is a showcase, not a code library. | Asymmetric bento rhythm for the services grid (one lead tile, mixed spans). |
| HorizonX, https://horizonx.so/explore | Mostly premium kits and templates; licence per item | We found no clear free commercial licence for the items we looked at, so nothing was copied. | Restrained bento and cookie-banner patterns (slim, two equal buttons). |
| Originkit, https://originkit.dev | The CLI is MIT. The component source comes from a hosted registry that needs a login, and its licensing page did not render any terms we could read. | No readable licence for the component code itself, and most items are WebGL/canvas effects that would break the performance budget. | Nothing used. |
| dqnamo kitchen, https://www.dqnamo.com/kitchen | Personal experiments page; no licence found | No licence means no permission to copy. | "Scroll Fade List" and tactile button ideas helped shape the existing fade-in reveal and the `:active` press feedback, both written from scratch. |
| taste-skill, https://github.com/leonxlnx/taste-skill | MIT, © 2026 Leonxlnx | Design guidance only. We used no code and ran no scripts from it. | See "Design principles applied" in the project report. |

## Fonts

| Font | Source | Licence |
|---|---|---|
| Geist, Geist Mono (variable woff2, self-hosted in `public/fonts/`) | Vercel, https://vercel.com/font | SIL Open Font License 1.1 |

## Icons

The custom 24px icon set in `src/data/icons.ts` was drawn for this project. No third-party icon set is used.

## Client screenshots

The screenshots in `src/assets/work/` were taken from our clients' live public websites (RoseEmpire, MSBT, UniLink Recruitment). The owner confirmed on 8 Oct 2026 that these clients approved being shown.

## v3 additions (8 Oct 2026)

### Fonts (self-hosted, latin subsets)
| Font | Use | Licence | Source |
|---|---|---|---|
| League Gothic (v13) | Wordmark, project titles, footer slab | SIL Open Font License 1.1 | Google Fonts (fonts.gstatic.com), originally The League of Moveable Type |
| Playfair Display Italic (v40, 500–700) | Gold accent words in headings | SIL Open Font License 1.1 | Google Fonts (fonts.gstatic.com), Claus Eggers Sørensen |

### Hero background video (v3, superseded on the home page by the WebGL hero in v4)
`public/video/hero-*.webm|mp4` and the `hero-poster-*.webp` posters are **original, self-made** footage: abstract gold "silk" ribbons generated frame by frame by `tools/hero-video-gen.py` (numpy), then encoded with ffmpeg (VP9 and H.264). It contains no stock footage and no third-party imagery, and Automexa owns it outright.

### Project screenshots
`src/assets/work/*.jpg` are screenshots of the live sites, captured 8 Oct 2026: atrium-receptionist.netlify.app (Mexy, our own product), roseempire.co.uk, msbt.co.uk and unilinkrecruitment.co.uk. The clients approved being shown (confirmed by the owner, 8 Oct 2026).

`src/assets/work/crm/roseempire-os-{dash,agents,vault}.jpg` are client-provided screenshots of the RoseEmpire CRM. We cropped them to the app area (browser chrome, URL, taskbar and recorder removed) and replaced the original product branding with "RoseEmpire OS by Automexa". The unedited originals are kept outside the repo on purpose.

### Motion and WebGL (v4)
| Library | Version | Used for | Licence |
|---|---|---|---|
| GSAP (core and ScrollTrigger) | 3.15.0 | Pinned and scrubbed sections, horizontal work reel, parallax, cursor easing, magnetic pull | GreenSock "Standard 'no charge' license" (https://gsap.com/standard-license). Free for commercial sites since 2025 and includes all plugins |
| Lenis | 1.3.26 | Smooth scrolling (desktop, fine pointer only) | MIT |

Our own code, with no third-party shader or engine (no three.js or OGL):
- `src/scripts/motion/gl/hero-shader.ts`: the sculpted Automexa "A" mark, raymarched from signed distance fields (bevelled, pillowed gold strokes with an engraved channel, a black obsidian node, a dashed gold orbit), with an exploded-diagram state, gold scan-line contour mode, the studio light model and click pulses. It replaced the v4 liquid-gold metaballs in iteration 8. It is procedural, so there is no model file to download
- `gl/distort.ts`: hover ripple, lens and RGB-split distortion on showcase screens
- `gl/glkit.ts`: the WebGL helpers and adaptive render-scale governor
- the split-text, scramble, cursor, preloader and view-transition styles

The hero poster images (`public/hero/gl-poster-*.webp`) are stills rendered from that shader.

The tall scroll-through preview (`src/assets/work/tall/mexy.jpg`) is a full-page screenshot of Mexy's own site, captured 8 Oct 2026.

Showcase preview loops (`public/work/video/`):
- `unilink.*` and `msbt.*` are 15-second real-time recordings of the public live sites (unilinkrecruitment.co.uk, msbt.co.uk). They were captured on 8 Oct 2026 with a Playwright/Chrome DevTools screencast of a scripted scroll; the cookie notice was hidden for the recording, not answered. They are encoded to VP9 WebM and H.264 MP4 with ffmpeg, with a first-frame WebP poster. They are covered by the same client approval as the project screenshots.
- `roseempire-crm.*` is an animated walkthrough made from the three supplied RoseEmpire OS screenshots (camera moves, cursor, highlights and typing are our own HTML animation), rendered frame by frame and encoded the same way.
- Tools: `/workspace/automexa-v4-tools/rec/` (record.cjs, encode.sh, crm/).

**titi.re (v4 study):** its public bundles were inspected only to identify the techniques used (three.js shader "gel" hero, Lenis with GSAP ScrollTrigger, custom cursor, scramble text, velocity marquee, adaptive render quality). No code, shaders, assets or copy were reused. See the v4 inventory in `/workspace/automexa-v2-titire-notes.md`.

### Design references (no code, assets, fonts or copy taken)
- **titi.re**: studied for layout rhythm, the floating pill nav, hairline section markers, the fanned work cards, the scroll-lit process text and the accent-slab footer. Everything was re-implemented from scratch in our own CSS and JS. See `/workspace/automexa-v2-titire-notes.md`.
- **apple-design skill** (github.com/emilkowalski/skills, `skills/apple-design/SKILL.md`): guidance only, and no scripts were run. Applied:
  - press feedback
  - interruptible transitions
  - translucent chrome with reduced-transparency and contrast fallbacks
  - the scroll-edge effect
- **taste-skill** (github.com/leonxlnx/taste-skill): guidance only, and no scripts were run. See the v2 notes.
