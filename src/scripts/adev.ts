/**
 * ADEV chat (third-party widget by the site owner's developer).
 * Loaded ONLY when the visitor asks for it (click on a [data-adev-open] control):
 * - keeps the 200 KB script off first load (performance),
 * - nothing is stored by the widget before the visitor chooses to chat (PECR),
 * - the widget's own SEO engine is neutralised: our <title>, meta, canonical and JSON-LD are restored if it edits them.
 */
import { track } from "./analytics";
const ADEV_API = ((import.meta.env.PUBLIC_ADEV_API_URL as string) || "https://adev-web-developer-plugin.adeelcolchester.workers.dev").replace(/\/$/, "");
let state: "idle" | "loading" | "ready" = "idle";

function protectHead() {
  const title = document.title;
  const snap = new Map<Element, string | null>();
  document.head.querySelectorAll("meta[name], meta[property], link[rel='canonical']").forEach((el) => snap.set(el, el.getAttribute("content") ?? el.getAttribute("href")));
  const restore = () => {
    if (document.title !== title) document.title = title;
    snap.forEach((v, el) => { const attr = el.tagName === "LINK" ? "href" : "content"; if (el.getAttribute(attr) !== v && v !== null) el.setAttribute(attr, v); });
    document.head.querySelectorAll("#adev-jsonld, meta[name='keywords'], meta[name='google-site-verification']").forEach((el) => { if (!snap.has(el)) el.remove(); });
  };
  new MutationObserver(restore).observe(document.head, { subtree: true, childList: true, attributes: true, characterData: true });
}

// The widget opens on pointerdown + pointerup on its launcher (it has a drag-to-move
// launcher and no public open() API), so a plain .click() does nothing.
const isOpen = () => !!document.getElementById("adev-panel")?.classList.contains("open");
function pressLauncher(launcher: HTMLElement) {
  const r = launcher.getBoundingClientRect();
  const init: PointerEventInit = { bubbles: true, cancelable: true, button: 0, buttons: 1, pointerId: 1, pointerType: "mouse", isPrimary: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
  launcher.dispatchEvent(new PointerEvent("pointerdown", init));
  launcher.dispatchEvent(new PointerEvent("pointerup", { ...init, buttons: 0 }));
}
function openWidget(tries = 0) {
  const launcher = document.getElementById("adev-launcher");
  if (launcher) {
    document.documentElement.classList.add("adev-ready");
    if (!isOpen()) {
      pressLauncher(launcher);
      // Retry briefly in case the widget is still wiring its listeners.
      if (tries < 40) setTimeout(() => { if (!isOpen()) openWidget(tries + 5); }, 250);
    }
    return;
  }
  if (tries < 60) setTimeout(() => openWidget(tries + 1), 100);
  else { state = "idle"; document.documentElement.classList.remove("adev-loading"); location.href = "/contact/"; }
}

export function initAdev() {
  document.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>("[data-adev-open]");
    if (!btn) return;
    e.preventDefault();
    track("chat_open", { location: btn.dataset.loc });
    if (state === "ready") return openWidget();
    if (state === "loading") return;
    state = "loading";
    document.documentElement.classList.add("adev-loading");
    protectHead();
    const s = document.createElement("script");
    s.src = `${ADEV_API}/widget.js`;
    s.async = true;
    Object.assign(s.dataset, { adevEmbed: "automexa", apiBase: ADEV_API, clientId: "automexa", title: "ADEV", siteName: "Automexa", publicRole: "AI assistant", accent: "#2be45e", whatsapp: "447999988450", fx: "false" });
    s.onload = () => { state = "ready"; document.documentElement.classList.remove("adev-loading"); openWidget(); };
    s.onerror = () => { state = "idle"; document.documentElement.classList.remove("adev-loading"); location.href = "/contact/"; };
    document.body.appendChild(s);
  });
}
