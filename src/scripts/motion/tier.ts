export type Tier = "static" | "lite" | "full";
export const tier = (): Tier => (document.documentElement.dataset.motion as Tier) || "static";
