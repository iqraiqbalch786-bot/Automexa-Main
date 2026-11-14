/**
 * Single source of truth for Automexa marketing content.
 * Rules: no invented stats or testimonials. Anything not yet real is flagged with `placeholder: true`
 * and rendered with a visible "slot" label.
 */
import type { IconName } from "./icons";
import { PRICES } from "../lib/currency.mjs";
export type PriceKey = keyof typeof PRICES;

export const SITE_URL = (import.meta.env.PUBLIC_SITE_URL || "https://automexa.co.uk").replace(/\/$/, "");

export const company = {
  brand: "Automexa",
  legalName: "AUTOMEXA LTD",
  number: "17390176",
  registeredIn: "England and Wales",
  // Trading / office address (Barry, Oct 10 2026). Used for the business address, JSON-LD and contact details.
  office: {
    street: "99 Clowes Street",
    locality: "Manchester",
    postcode: "M12 5FY",
    country: "United Kingdom",
    countryCode: "GB",
  },
  // Registered office: must match Companies House (checked Oct 10 2026, still Milton Keynes; no change filed).
  // Update this only after the change of registered office (form AD01) shows on Companies House.
  registered: {
    street: "Unit 9 The Farthing Enterprise Centre, 39 Farthing Grove",
    locality: "Netherfield, Milton Keynes",
    postcode: "MK6 4JH",
    country: "England",
  },
  email: "info@automexa.co.uk",
  phone: { display: "07999 988450", tel: "+447999988450", intl: "+44 7999 988450" },
  whatsapp: "https://wa.me/447999988450",
  mexyLine: { display: "+1 505-422-4794", tel: "+15054224794", note: "US number. International rates may apply from the UK." },
  // UK demo line (Telnyx, Manchester 0161). Shown to GBP visitors via <html data-currency>; see MexyTel.astro.
  mexyLineUK: { display: "+44 161 482 7771", tel: "+441614827771", intl: "+44 161 482 7771", note: "Manchester number. Standard UK call rates apply." },
  wishlistUrl: "https://atrium-receptionist.netlify.app/wishlist",
  wishlistTarget: 5000,
  // Social profiles: add only verified URLs owned by Automexa. The scaffold guesses were removed on 2026-10-08
  // (linkedin.com/company/automexa belongs to a different company; the others could not be verified).
  socials: [] as { label: "LinkedIn" | "Instagram" | "Facebook" | "TikTok" | "YouTube"; href: string }[],
};

/**
 * Trading-name statement (Barry, Oct 12 2026; needed for Telnyx UK number verification).
 * Checked on Companies House Oct 12 2026: MCR EDUCATORS LTD, 17353310, active, incorporated 21 July 2026,
 * registered office 99 Clowes Street, Manchester, England, M12 5FY.
 */
export const tradingEntity = { name: "MCR Educators LTD", number: "17353310", registeredIn: "England and Wales", registeredOffice: "99 Clowes Street, Manchester, M12 5FY" };
export const tradingStatement = `Automexa is a trading name of ${tradingEntity.name}, registered in ${tradingEntity.registeredIn}, company number ${tradingEntity.number}. Registered office: ${tradingEntity.registeredOffice}.`;

/** "99 Clowes Street, Manchester, M12 5FY, United Kingdom" */
export const officeLine = `${company.office.street}, ${company.office.locality}, ${company.office.postcode}, ${company.office.country}`;
export const registeredLine = `${company.registered.street}, ${company.registered.locality}, ${company.registered.postcode}`;

export const nav = [
  { label: "Work", href: "/work/" },
  { label: "Services", href: "/services/" },
  { label: "Mexy", href: "/mexy/" },
  { label: "Pricing", href: "/pricing/" },
  { label: "About", href: "/about/" },
];

export type Service = {
  slug: string;
  outcome: string; // headline = the result
  name: string; // what it is
  icon: IconName;
  summary: string;
  points: string[];
  priceFrom: string; // copy string; may hold price tokens like {{starter}} (src/lib/currency.mjs)
  href: string;
};

export const services: Service[] = [
  {
    slug: "websites",
    outcome: "Turn visitors into enquiries",
    name: "Websites & landing pages",
    icon: "browser",
    summary: "A fast site with one clear offer and one next step on every page.",
    points: ["Clear offer above the fold", "Fast load on any phone", "You own the code"],
    priceFrom: "{{starter}}{{gbp: + VAT}}",
    href: "/services/websites/",
  },
  {
    slug: "growth",
    outcome: "Get found when buyers search",
    name: "Ads, SEO & AEO/GEO",
    icon: "search",
    summary: "Rank on Google, appear in AI answers and run ads that bring in buyers.",
    points: ["Ads tracked to the lead", "Technical and local SEO", "Content AI assistants can quote"],
    priceFrom: "Quote after discovery call",
    href: "/services/growth-marketing/",
  },
  {
    slug: "automation",
    outcome: "Win back hours every week",
    name: "Automations, CRMs & AI agents",
    icon: "workflow",
    summary: "Leads, calendars, email and invoices update themselves, so nothing slips.",
    points: ["CRM built around how you sell", "Instant lead alerts and routing", "AI agents trained on your business"],
    priceFrom: "Quote after discovery call",
    href: "/services/ai-automation/",
  },
  {
    slug: "brand",
    outcome: "Earn trust on first look",
    name: "Brand & design",
    icon: "palette",
    summary: "A brand system that makes you look established before the first call.",
    points: ["Logo suite and colour system", "Typography and usage rules", "Social and marketing assets"],
    priceFrom: "Quote after discovery call",
    href: "/services/brand-design/",
  },
  {
    slug: "mexy",
    outcome: "Never miss a customer call",
    name: "Mexy, AI receptionist",
    icon: "phoneIn",
    summary: "Our AI receptionist answers, qualifies and books every caller, day or night.",
    points: ["Answers 24/7 on the first ring", "Books straight into your calendar", "Sends you the lead summary"],
    priceFrom: "{{mexySetup}}{{gbp: + VAT}}",
    href: "/mexy/",
  },
];

export type Plan = {
  id: string;
  name: string;
  outcome: string;
  price: string; // copy string with price tokens, or "Quote" / "Custom"
  pricePrefix?: string; // small word before the price, e.g. "from"
  priceKey?: PriceKey; // the main price, for JSON-LD offers
  monthlyKey?: PriceKey;
  priceNote: string;
  monthly?: string;
  badge?: string;
  features: string[];
  cta: string;
  // Checkout is intentionally OFF in this build. Plug Stripe Price IDs in here later:
  // mode "payment" for one-off setup fees, "subscription" for the monthly line.
  checkout: { mode: "payment" | "subscription" | "payment+subscription" | "quote"; enabled: false };
  group: "build" | "ai" | "design" | "growth";
};

/** Prices: USD verbatim from the owner's published price list; GBP fixed figures. Both live in PRICES (src/lib/currency.mjs). */
export const plans: Plan[] = [
  {
    id: "simple-website", group: "build", name: "Simple Website", outcome: "A clean, fast site to get you online",
    price: "{{starter}}", priceKey: "starter", priceNote: "one-time",
    features: ["A basic website built with Next.js", "Mobile-first, so it works on any phone", "Scope confirmed on your discovery call", "You own the code on final payment"],
    cta: "Start my website", checkout: { mode: "payment", enabled: false },
  },
  {
    id: "mexy-crm", group: "ai", name: "Mexy with CRM", outcome: "Every call answered, every lead logged",
    price: "{{mexySetup}}", priceKey: "mexySetup", monthlyKey: "mexyMonthly", priceNote: "setup", monthly: "+ {{mexyMonthly}}/month{{gbp: + VAT}}", badge: "Most popular",
    features: ["Mexy, our AI receptionist, answers 24/7 on the first ring", "Books callers straight into your calendar", "Logs every caller and call summary in your CRM", "Passes urgent callers straight to you", "Ongoing maintenance and prompt tuning"],
    cta: "Get Mexy with CRM", checkout: { mode: "payment+subscription", enabled: false },
  },
  {
    id: "enterprise", group: "growth", name: "Enterprise", outcome: "Bespoke systems at scale",
    price: "Custom", priceNote: "fixed-scope quote",
    features: ["Multi-agent AI networks and custom internal tools", "Full-stack web application development and legacy migration", "Dedicated SLA and priority support window", "Fixed scope quote provided after technical scoping call"],
    cta: "Book a call", checkout: { mode: "quote", enabled: false },
  },
];

export const terms = [
  { icon: "chat" as IconName, title: "Free 15-minute discovery call", text: "We find your biggest growth lever first, with no obligation." },
  { icon: "fileCheck" as IconName, title: "Fixed fee, in writing", text: "Scope, exclusions and timeline agreed before work starts." },
  { icon: "calendarCheck" as IconName, title: "50% books your slot", text: "The balance is set out in your written plan." },
  { icon: "key" as IconName, title: "You own everything", text: "Code, domains, accounts and keys transfer to you." },
  { icon: "lifebuoy" as IconName, title: "30-day aftercare", text: "We fix and fine-tune for 30 days after launch." },
];

export const process = [
  { icon: "chat" as IconName, step: "01", title: "Discovery call", tag: "Free · 15 min", text: "We find where growth is leaking: calls, site, search or admin." },
  { icon: "fileCheck" as IconName, step: "02", title: "Fixed-price plan", tag: "50% books the slot", text: "You get scope, timeline and one fixed fee in writing." },
  { icon: "eye" as IconName, step: "03", title: "Weekly previews", tag: "Live staging link", text: "Review progress on a live link each week and approve every milestone." },
  { icon: "rocket" as IconName, step: "04", title: "Launch & handover", tag: "30-day aftercare", text: "We launch, verify and hand you full ownership." },
];

/**
 * Selected work. Facts only: taken from each live site and Automexa's records.
 * Clients have approved being shown. Per-project numbers are not claimed; see `results` for figures across client projects.
 */
export type Project = {
  slug: string;
  name: string;
  kind: "Product" | "Website" | "CRM";
  client: string;
  sector: string;
  url?: string;
  img?: "mexy" | "roseempire" | "msbt" | "unilink" | "crm" | "mrahaven" | "toybloom" | "gummytraders" | "jtkremovals";
  line: string; // one-line, factual
  about: string; // factual paragraph
  built: string[];
  tags: string[];
  mexy?: boolean; // green scope
  featured?: boolean; // shown in the home showcase
  placeholder?: string; // what's missing, shown as a visible slot
  related?: string; // slug of a related project
  features?: { icon: IconName; title: string; points: string[] }[];
  gallery?: { img: "crm-dash" | "crm-agents" | "crm-vault"; caption: string; alt: string }[];
  captured?: string; // date the live-site screenshot was taken (default 8 Oct 2026)
  published: string; // ISO date the case study went up
  updated: string; // ISO date of the last content update
};

export const projects: Project[] = [
  {
    published: "2026-10-08", updated: "2026-10-08",
    slug: "mexy", client: "Automexa (own product)", name: "Mexy", kind: "Product", sector: "Automexa product, AI voice receptionist", mexy: true, featured: true,
    url: "https://atrium-receptionist.netlify.app/", img: "mexy",
    line: "Our AI receptionist. Answers every call, books the job and briefs you.",
    about: "Mexy is Automexa's own AI voice receptionist for service businesses. She answers calls 24/7, takes the caller's details, books them in or passes them on, and sends the owner a summary.",
    built: ["AI voice agent that answers as your business", "Booking and lead-capture flow", "Call summaries, plus the product website and wishlist"],
    tags: ["AI agent", "Voice", "Product"],
  },
  {
    published: "2026-10-08", updated: "2026-10-08",
    slug: "roseempire-crm", client: "RoseEmpire", related: "roseempire", name: "RoseEmpire CRM", kind: "CRM", sector: "Wholesale bedding supplier, UK", featured: true,
    img: "crm",
    line: "An AI-run CRM that writes, sends and follows up on sales emails, with a person approving what matters.",
    about: "RoseEmpire supplies wholesale mattress protectors and pillows to hotels and care homes across the UK. Automexa built RoseEmpire OS: a CRM where AI agents run the sales pipeline and a person approves anything important.",
    built: ["Autopilot sales pipeline with an approval queue", "11 AI agents coordinated by a CEO agent", "Voice assistant", "Memory Vault for business knowledge", "Leads, outreach, proposals, clients, projects, revenue and content tools"],
    tags: ["CRM", "AI agents", "Automation"],
    features: [
      { icon: "workflow", title: "Sales on autopilot", points: ["Writes and sends outreach emails", "Reads replies and moves deals forward", "A person approves anything important first"] },
      { icon: "users", title: "11 AI agents, one CEO", points: ["Agents for research, copywriting and outreach", "Coordinated by a CEO agent, ARIA"] },
      { icon: "wave", title: "A voice assistant", points: ["Ask questions and give instructions by voice"] },
      { icon: "layers", title: "A Memory Vault", points: ["Remembers the business, its clients and its decisions", "Agents load it on every task, so nothing gets explained twice"] },
      { icon: "crm", title: "Everything in one place", points: ["Leads, outreach, proposals and clients", "Projects, revenue and content tools"] },
    ],
    gallery: [
      { img: "crm-dash", caption: "Dashboard: autopilot on, the approval queue, drafts waiting for review and today's sends.", alt: "RoseEmpire OS dashboard with autopilot switched on, 53 items awaiting approval, 125 drafts to review and send counts" },
      { img: "crm-agents", caption: "The orbital network: 11 AI agents coordinated by the CEO agent, ARIA.", alt: "RoseEmpire OS orbital network showing 11 named AI agents arranged around the CEO agent ARIA" },
      { img: "crm-vault", caption: "Memory Vault: the built-in second brain the agents read before every task.", alt: "RoseEmpire OS Memory Vault page with tagged notes and a markdown note editor" },
    ],
  },

  {
    published: "2026-10-08", updated: "2026-10-08",
    slug: "unilink", client: "UniLink Recruitment", name: "UniLink Recruitment", kind: "Website", sector: "Student recruitment, UK", featured: true,
    url: "https://unilinkrecruitment.co.uk/", img: "unilink",
    line: "Recruitment website for fully funded UK higher-education programmes.",
    about: "UniLink Recruitment helps people into fully funded UK higher-education programmes with flexible two-day study schedules. Automexa built their recruitment website: programme pages and a fast route to apply.",
    built: ["Recruitment website", "Programme pages", "Fast apply flow"],
    tags: ["Website", "Lead generation", "Education"],
  },
  {
    published: "2026-10-08", updated: "2026-10-08",
    slug: "msbt", client: "Manchester School of Business and Technology", name: "MSBT", kind: "Website", sector: "Education, Manchester", featured: true,
    url: "https://msbt.co.uk/", img: "msbt",
    line: "Website for Manchester School of Business and Technology.",
    about: "Manchester School of Business and Technology (MSBT) is an education provider. Automexa built their brand website with course pathways and an enquiry route for prospective students.",
    built: ["Brand website", "Course pathways", "Enrolment enquiries"],
    tags: ["Website", "Brand", "Education"],
  },
  {
    published: "2026-10-08", updated: "2026-10-08",
    slug: "roseempire", client: "RoseEmpire", related: "roseempire-crm", name: "RoseEmpire", kind: "Website", sector: "Wholesale bedding supplier, UK",
    url: "https://www.roseempire.co.uk/", img: "roseempire",
    line: "Trade website for wholesale mattress protectors and pillows.",
    about: "RoseEmpire's trade website serves hotels and care homes buying mattress protectors and pillows wholesale, with Manchester-held stock and clear minimum order quantities. Automexa built the trade-buyer paths and the enquiry flow.",
    built: ["Trade-buyer website", "Product paths for wholesale", "Enquiry flow"],
    tags: ["Website", "B2B", "Wholesale"],
  },
  {
    published: "2026-10-14", updated: "2026-10-14", captured: "14 Oct 2026",
    slug: "mrahaven", client: "MRA Haven Estates", name: "MRA Haven Estates", kind: "Website", sector: "Estate agent and removals, UK",
    url: "https://www.mrahavenestates.com/", img: "mrahaven",
    line: "Estate agency website for sales, lettings, removals and a Land Registry price guide.",
    about: "MRA Haven Estates is a UK estate agent covering sales, lettings, conveyancing, mortgages and removals. The website puts every service on one site, with a property value calculator built on HM Land Registry sold prices.",
    built: ["Property value calculator using HM Land Registry sold prices", "Pages for sales, lettings, conveyancing, mortgages and removals", "Enquiry form that routes by reason, plus a client login"],
    tags: ["Website", "Property", "Lead generation"],
  },
  {
    published: "2026-10-14", updated: "2026-10-14", captured: "14 Oct 2026",
    slug: "toybloom", client: "Toy Bloom", name: "Toy Bloom", kind: "Website", sector: "Online toy shop, UK",
    url: "https://toybloom.co.uk/", img: "toybloom",
    line: "UK online toy shop with 153 squishies, each listed with piece count and box price.",
    about: "Toy Bloom is a UK online toy shop for families, led by squishies and sensory toys. The shop lists every product with its piece count and box price, sorted into clear categories.",
    built: ["Online shop with categories and product pages", "Piece count and UK box price on every product", "Cart, wishlist and newsletter sign-up"],
    tags: ["Website", "E-commerce", "Retail"],
  },
  {
    published: "2026-10-16", updated: "2026-10-16", captured: "16 Oct 2026",
    slug: "gummytraders", client: "Gummy Traders", name: "Gummy Traders", kind: "Website", sector: "Online vape shop, UK (18+)",
    url: "https://gummytraders.co.uk/", img: "gummytraders",
    line: "Adults-only online store for vape kits, pods and e-liquids, with an age check at entry.",
    about: "Gummy Traders is a UK online store for vape kits, prefilled pods, e-liquids and nic salts, for adults only. The store opens with an 18+ age check and sorts the catalogue by category and by brand.",
    built: ["18+ age check at entry", "Shop by category or brand, with search", "Product pages, cart, sale and Buy 1 Get 1 ranges"],
    tags: ["Website", "E-commerce", "Retail"],
  },
  {
    published: "2026-10-16", updated: "2026-10-16", captured: "16 Oct 2026",
    slug: "jtkremovals", client: "JTK Removals Manchester", name: "JTK Removals", kind: "Website", sector: "Removals, Greater Manchester",
    url: "https://jtkremovalsmanchester.co.uk/", img: "jtkremovals",
    line: "Removals website for a Swinton team, with a quote form and clear hourly rates.",
    about: "JTK Removals Manchester is a Swinton-based removals company covering house moves, man with a van, office and student moves across Greater Manchester. The site leads with a quote form, shows its hourly rates and has a page for each area it covers.",
    built: ["Quote form with house, office, student and man-and-van tabs", "Hourly rate packages on the page", "Area pages for 19 towns within 12 miles"],
    tags: ["Website", "Lead generation", "Local services"],
  },
];

/** @deprecated kept for older imports */
export const work = projects.filter((p) => p.img && p.kind === "Website");

/**
 * Results across Automexa client projects, as confirmed by the owner (8 Oct 2026).
 * Not attributed to any single client. Always shown with RESULTS_NOTE.
 */
export const results = [
  { value: 71.34, decimals: 2, prefix: "", suffix: "%", label: "Increase in sales", icon: "growth" as IconName },
  { value: 48, decimals: 0, prefix: "+", suffix: "%", label: "More website traffic", icon: "browser" as IconName },
  { value: 3, decimals: 0, prefix: "Top ", suffix: "", label: "Google rankings in 45 days", icon: "search" as IconName },
];
export const RESULTS_NOTE = "Results across our client projects. Results vary by project, market and starting point, and past results don't guarantee future ones.";

export type Faq = { q: string; a: string };

export const faqs: Record<string, Faq[]> = {
  general: [
    { q: "Is this worth it for my business?", a: "If you already have customers and want more, usually yes. On the free call we find the one change most likely to pay back first, and you decide from there." },
    { q: "How much does it cost?", a: "A Simple Website is {{starter}}{{gbp: + VAT}}. Mexy with CRM, our AI receptionist plus a CRM, is {{mexySetup}} setup plus {{mexyMonthly}} a month{{gbp:, plus VAT}}. Enterprise projects, automations, brand and design, ads, SEO and AEO/GEO are quoted after a free discovery call. Every project is a fixed fee agreed in writing." },
    { q: "What if it doesn't work for us?", a: "You approve each milestone on a live preview before we move on, so nothing ships without your sign-off. After launch you get 30 days of aftercare to fix and fine-tune." },
    { q: "Will I be locked in?", a: "On final payment, the code, domains, accounts and keys transfer to you. Monthly plans have no lock-in unless your written plan says so." },
    { q: "How much of my time will it take?", a: "A 15-minute call to start. After that, you review a live preview each week and approve milestones when they're ready." },
    { q: "How do payments work?", a: "Every project is a fixed fee. 50% books your slot, and the balance and any milestones are set out in your written plan. Monthly plans, like the AI receptionist, are billed monthly." },
  ],
  about: [
    { q: "Who is Automexa for?", a: "Owners and managers of established businesses that already have customers and want to scale. We find the lever that grows you fastest (calls, website, search, ads or admin) and build it." },
    { q: "What does Automexa do?", a: "Automexa (AUTOMEXA LTD, a UK company) builds growth systems: websites and landing pages, ads, SEO and AEO/GEO, automations, CRMs and AI agents, brand design, and Mexy, an AI receptionist. We work with clients worldwide." },
  ],
  mexy: [
    { q: "What is Mexy?", a: "Mexy is Automexa's AI receptionist. She answers your business calls 24/7, answers common questions, takes the caller's details and books them in or passes them to you." },
    { q: "Will callers know they're talking to AI?", a: "Yes. Mexy introduces herself as an AI receptionist on every call." },
    { q: "Can I hear her before buying?", a: "Yes. Call the live demo line on {{mexyTel}}.{{usd: It's a US number, so international rates may apply from the UK.}}{{gbp: It's a Manchester number, so standard UK rates apply.}}" },
    { q: "Does it work with my existing number?", a: "Usually, yes. Calls can be forwarded to Mexy when you're busy or after hours. We confirm the setup for your phone provider on the discovery call." },
    { q: "What if Mexy can't answer something?", a: "She takes a message or transfers the caller to you, so no enquiry is lost." },
    { q: "What does it cost?", a: "Mexy with CRM is {{mexySetup}} setup plus {{mexyMonthly}} a month{{gbp:, all plus VAT}}. Your setup is confirmed on a free 15-minute discovery call. Bigger or custom setups are quoted under Enterprise." },
  ],
  growth: [
    { q: "What is AEO/GEO?", a: "Answer Engine Optimisation and Generative Engine Optimisation. It means structuring your content so AI assistants like ChatGPT, Gemini and Google's AI answers can understand, trust and quote your business." },
    { q: "How are ads, SEO and AEO/GEO priced?", a: "They're quoted after a free discovery call, because the right budget depends on your market and goals." },
    { q: "How do you measure results?", a: "In leads and booked customers. Every campaign gets conversion tracking before it goes live." },
  ],
};

export const calculatorDefaults = { callsPerWeek: 40, missedPct: 25, closePct: 30, jobValue: 400, currency: "USD" as "GBP" | "USD" | "EUR" };
