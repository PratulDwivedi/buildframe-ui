// Links and the footer's content, and the checks on them. Pure (no React, no browser), so a server action and a public page run the same checks
// the forms run. The one rule that matters most: a link on a public page is a path of the site, an https address or an email link, and
// NEVER a phone link or a WhatsApp address (those carry someone's phone number).

export type NavLink = { label: string; href: string };
export type FooterGroup = { title: string; links: NavLink[] };

export const SOCIAL_NETWORKS = [
  { value: "instagram", label: "Instagram", domains: ["instagram.com"] },
  { value: "facebook", label: "Facebook", domains: ["facebook.com"] },
  { value: "x", label: "X (Twitter)", domains: ["x.com", "twitter.com"] },
  { value: "youtube", label: "YouTube", domains: ["youtube.com", "youtu.be"] },
  { value: "linkedin", label: "LinkedIn", domains: ["linkedin.com"] },
] as const;
export type SocialNetwork = (typeof SOCIAL_NETWORKS)[number]["value"];
export type SocialLink = { network: SocialNetwork; url: string };

export type FooterValue = { about: string; closing: string; groups: FooterGroup[]; social: SocialLink[] };

export const LINK_LIMITS = { menu: 6, groups: 5, groupLinks: 12, label: 40, title: 30, about: 240, closing: 120, social: 6, path: 200, https: 500, mailto: 200 } as const;

export const emptyFooter = (): FooterValue => ({ about: "", closing: "", groups: [], social: [] });

const NO_MARKUP = /[<>]/;
const PATH = /^\/(?![/\\])[^\s<>"'\\]*$/;
const HTTPS = /^https:\/\/([^\s<>"'/?#:@]+)(?::\d+)?(?:[/?#][^\s<>"']*)?$/;
const MAILTO = /^mailto:[^\s<>"',;?&]+@[^\s<>"',;?&]+\.[^\s<>"',;?&]+$/;
const WHATSAPP_HOST = /(^|\.)(wa\.me|whatsapp\.com)$/i;

const hostOf = (url: string): string | null => HTTPS.exec(url)?.[1]?.toLowerCase() ?? null;

/** Why an address cannot be a link, in words for the person, or null when it can. */
export function hrefError(href: unknown): string | null {
  if (typeof href !== "string" || href === "") return "Add an address";
  if (href.startsWith("https://")) {
    const host = hostOf(href);
    if (!host || href.length > LINK_LIMITS.https) return "That web address does not look right";
    if (WHATSAPP_HOST.test(host)) return "WhatsApp links carry a phone number, so they cannot be used here";
    return null;
  }
  if (href.startsWith("mailto:")) return MAILTO.test(href) && href.length <= LINK_LIMITS.mailto ? null : "That email link does not look right";
  if (href.startsWith("/")) return PATH.test(href) && href.length <= LINK_LIMITS.path ? null : "That page address does not look right";
  return "Use a page of your site, an https address or an email link. Phone links are not allowed";
}

/** The reason a social address is wrong for its network, or null. It must be https on the network's own domain. */
export function socialUrlError(network: string, url: unknown): string | null {
  const n = SOCIAL_NETWORKS.find((x) => x.value === network);
  if (!n) return "Choose a network";
  if (typeof url !== "string" || url === "") return "Add the address of your page";
  const host = hostOf(url);
  if (!host || url.length > LINK_LIMITS.https) return "Use the full https address of your page";
  return n.domains.some((d) => host === d || host.endsWith(`.${d}`)) ? null : `That address is not on ${n.label}`;
}

const labelError = (label: unknown): string | null =>
  typeof label !== "string" || label.trim() === "" ? "Add the words to show" : label.length > LINK_LIMITS.label || NO_MARKUP.test(label) ? `Up to ${LINK_LIMITS.label} characters, without angle brackets` : null;

/** Errors of a header menu by field: "link:0:label", "link:0:href", and "links" for too many. */
export function menuErrors(links: NavLink[]): Record<string, string> {
  const e: Record<string, string> = {};
  if (links.length > LINK_LIMITS.menu) e.links = `A menu can have at most ${LINK_LIMITS.menu} links`;
  links.forEach((l, i) => {
    const a = labelError(l.label);
    const b = hrefError(l.href);
    if (a) e[`link:${i}:label`] = a;
    if (b) e[`link:${i}:href`] = b;
  });
  return e;
}

/** Errors of a footer by field: "about", "closing", "groups", "group:0:title", "group:0:links", "group:0:link:1:href", "social", "social:0". */
export function footerErrors(f: FooterValue): Record<string, string> {
  const e: Record<string, string> = {};
  if (f.about.length > LINK_LIMITS.about || NO_MARKUP.test(f.about)) e.about = `Up to ${LINK_LIMITS.about} characters, without angle brackets`;
  if (f.closing.length > LINK_LIMITS.closing || NO_MARKUP.test(f.closing)) e.closing = `Up to ${LINK_LIMITS.closing} characters, without angle brackets`;
  if (f.groups.length > LINK_LIMITS.groups) e.groups = `A footer can have at most ${LINK_LIMITS.groups} columns`;
  f.groups.forEach((g, i) => {
    const t = g.title.trim();
    if (t === "" || t.length > LINK_LIMITS.title || NO_MARKUP.test(t)) e[`group:${i}:title`] = `Give the column a title of up to ${LINK_LIMITS.title} characters`;
    if (g.links.length > LINK_LIMITS.groupLinks) e[`group:${i}:links`] = `A column can have at most ${LINK_LIMITS.groupLinks} links`;
    g.links.forEach((l, j) => {
      const a = labelError(l.label);
      const b = hrefError(l.href);
      if (a) e[`group:${i}:link:${j}:label`] = a;
      if (b) e[`group:${i}:link:${j}:href`] = b;
    });
  });
  if (f.social.length > LINK_LIMITS.social) e.social = `At most ${LINK_LIMITS.social} social links`;
  const seen = new Set<string>();
  f.social.forEach((s, i) => {
    const bad = socialUrlError(s.network, s.url);
    if (bad) e[`social:${i}`] = bad;
    else if (seen.has(s.network)) e[`social:${i}`] = "One link for each network";
    seen.add(s.network);
  });
  return e;
}

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const text = (v: unknown, max: number): string => (typeof v === "string" && !NO_MARKUP.test(v) ? v.trim().slice(0, max) : "");

/** Reads stored links defensively (a public page must never throw over stored data): keeps the good ones, drops the rest. */
export function cleanLinks(raw: unknown, max: number = LINK_LIMITS.groupLinks): NavLink[] {
  if (!Array.isArray(raw)) return [];
  const out: NavLink[] = [];
  for (const item of raw) {
    const o = obj(item);
    const label = typeof o.label === "string" ? o.label.trim() : "";
    const href = typeof o.href === "string" ? o.href : "";
    if (labelError(label) === null && hrefError(href) === null) out.push({ label, href });
    if (out.length >= max) break;
  }
  return out;
}

/** Reads a stored footer defensively: bad links, unknown or repeated networks, and anything over the limits are dropped. */
export function cleanFooter(raw: unknown): FooterValue {
  const o = obj(raw);
  const groups: FooterGroup[] = [];
  if (Array.isArray(o.groups)) {
    for (const g of o.groups) {
      const go = obj(g);
      const title = text(go.title, LINK_LIMITS.title);
      if (title) groups.push({ title, links: cleanLinks(go.links, LINK_LIMITS.groupLinks) });
      if (groups.length >= LINK_LIMITS.groups) break;
    }
  }
  const social: SocialLink[] = [];
  if (Array.isArray(o.social)) {
    for (const s of o.social) {
      const so = obj(s);
      const network = typeof so.network === "string" ? so.network : "";
      const url = typeof so.url === "string" ? so.url : "";
      if (socialUrlError(network, url) === null && !social.some((x) => x.network === network)) social.push({ network: network as SocialNetwork, url });
      if (social.length >= LINK_LIMITS.social) break;
    }
  }
  return { about: text(o.about, LINK_LIMITS.about), closing: text(o.closing, LINK_LIMITS.closing), groups, social };
}
