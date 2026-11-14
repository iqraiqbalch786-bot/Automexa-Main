import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import outboundUtm from "./tools/outbound-utm.mjs";

// Date the site content was last revised (used for sitemap <lastmod>). Update when pages change.
const CONTENT_UPDATED = "2026-10-08";

const site = (process.env.PUBLIC_SITE_URL || "https://automexa.co.uk").replace(/\/$/, "");

export default defineConfig({
  site,
  trailingSlash: "always",
  build: { format: "directory", inlineStylesheets: "auto" },
  compressHTML: true,
  prefetch: { prefetchAll: false, defaultStrategy: "hover" },
  integrations: [
    sitemap({
      filter: (page) => !page.includes("/404"),
      serialize: (item) => ({ ...item, lastmod: CONTENT_UPDATED }),
    }),
    outboundUtm(),
  ],
  image: { responsiveStyles: false },
  vite: { build: { assetsInlineLimit: 0 } },
});
