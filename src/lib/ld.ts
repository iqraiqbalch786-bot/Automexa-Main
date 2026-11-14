import type { Faq } from "../data/site";
import { SITE_URL, type PriceKey } from "../data/site";
import { fillBoth, priceValue, CURRENCIES } from "./currency.mjs";
export const faqLd = (items: Faq[]) => ({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: items.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: fillBoth(f.a) } })) });
export const serviceLd = (name: string, description: string, path: string, offers?: { priceKey?: PriceKey; name: string }[]) => ({
  "@context": "https://schema.org", "@type": "Service", name, description, url: `${SITE_URL}${path}`, areaServed: ["GB", "US"], provider: { "@id": `${SITE_URL}/#org` },
  ...(offers ? { offers: offers.flatMap((o) => (o.priceKey ? offerLd(o.name, o.priceKey) : [{ "@type": "Offer", name: o.name }])) } : {}),
});

/** One Offer per currency. GBP prices exclude VAT; schema.org puts that flag on a PriceSpecification. */
export const offerLd = (name: string, key: PriceKey) =>
  CURRENCIES.map((c) => ({
    "@type": "Offer", name, price: priceValue(key, c), priceCurrency: c,
    ...(c === "GBP" ? { priceSpecification: { "@type": "UnitPriceSpecification", price: priceValue(key, c), priceCurrency: c, valueAddedTaxIncluded: false } } : {}),
  }));
