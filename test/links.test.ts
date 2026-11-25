import { cleanFooter, cleanLinks, emptyFooter, footerErrors, hrefError, menuErrors, socialUrlError, SOCIAL_NETWORKS, type FooterValue } from "../src/site/links";

describe("hrefError: only a path of the site, https or mailto", () => {
  it.each(["/about", "/buy/noida?q=sea+view", "/#contact", "https://www.example.com/page", "mailto:hello@example.com"])("accepts %s", (h) => {
    expect(hrefError(h)).toBeNull();
  });
  it.each([
    "tel:+911234567890",
    "TEL:1234567890",
    "sms:+911234567890",
    "javascript:alert(1)",
    " javascript:alert(1)",
    "data:text/html,<b>x</b>",
    "//evil.example/x",
    "/\\evil.example",
    "http://example.com",
    "ftp://example.com/x",
    "about",
    "",
    "/with space",
    "/a<b",
    "https://wa.me/919876543210",
    "https://api.whatsapp.com/send?phone=919876543210",
    "https://web.whatsapp.com/",
    "https://chat.whatsapp.com/abc",
    "https://example.com/a b",
    "mailto:not-an-address",
  ])("refuses %j", (h) => {
    expect(hrefError(h)).toBeTruthy();
  });
  it("refuses an over-long address", () => {
    expect(hrefError("/" + "a".repeat(250))).toBeTruthy();
    expect(hrefError("https://example.com/" + "a".repeat(600))).toBeTruthy();
  });
});

describe("socialUrlError: the network's own domain over https", () => {
  it("accepts each network on its own domain and its www or m form", () => {
    expect(socialUrlError("instagram", "https://www.instagram.com/acme")).toBeNull();
    expect(socialUrlError("facebook", "https://facebook.com/acme")).toBeNull();
    expect(socialUrlError("x", "https://x.com/acme")).toBeNull();
    expect(socialUrlError("x", "https://twitter.com/acme")).toBeNull();
    expect(socialUrlError("youtube", "https://youtu.be/abc")).toBeNull();
    expect(socialUrlError("linkedin", "https://in.linkedin.com/company/acme")).toBeNull();
  });
  it("refuses another domain, a look-alike, http and a phone link", () => {
    expect(socialUrlError("instagram", "https://example.com/acme")).toBeTruthy();
    expect(socialUrlError("instagram", "https://instagram.com.evil.example/acme")).toBeTruthy();
    expect(socialUrlError("instagram", "https://evilinstagram.com/acme")).toBeTruthy();
    expect(socialUrlError("facebook", "http://facebook.com/acme")).toBeTruthy();
    expect(socialUrlError("x", "tel:+911234567890")).toBeTruthy();
  });
  it("offers no WhatsApp", () => {
    expect(SOCIAL_NETWORKS.map((n) => n.value)).toEqual(["instagram", "facebook", "x", "youtube", "linkedin"]);
  });
});

describe("menuErrors", () => {
  it("accepts a few good links and an empty menu", () => {
    expect(menuErrors([])).toEqual({});
    expect(menuErrors([{ label: "About us", href: "/about" }])).toEqual({});
  });
  it("names the row and field that is wrong", () => {
    const e = menuErrors([{ label: "", href: "/a" }, { label: "Call", href: "tel:123" }, { label: "<b>", href: "/b" }]);
    expect(Object.keys(e).sort()).toEqual(["link:0:label", "link:1:href", "link:2:label"]);
  });
  it("allows at most 6 links", () => {
    const seven = Array.from({ length: 7 }, (_, i) => ({ label: `L${i}`, href: `/p${i}` }));
    expect(menuErrors(seven).links).toBeTruthy();
    expect(menuErrors(seven.slice(0, 6))).toEqual({});
  });
});

const good = (): FooterValue => ({
  about: "Homes in Noida",
  closing: "© 2026 Acme Realty",
  groups: [{ title: "Property", links: [{ label: "Buy", href: "/buy" }] }],
  social: [{ network: "instagram", url: "https://instagram.com/acme" }],
});

describe("footerErrors", () => {
  it("accepts a good footer and an empty one", () => {
    expect(footerErrors(good())).toEqual({});
    expect(footerErrors(emptyFooter())).toEqual({});
  });
  it("applies the limits", () => {
    const f = good();
    f.about = "x".repeat(241);
    f.closing = "x".repeat(121);
    expect(Object.keys(footerErrors(f)).sort()).toEqual(["about", "closing"]);
    const six = Array.from({ length: 6 }, (_, i) => ({ title: `C${i}`, links: [] }));
    expect(footerErrors({ ...good(), groups: six }).groups).toBeTruthy();
    const thirteen = Array.from({ length: 13 }, (_, i) => ({ label: `L${i}`, href: `/p${i}` }));
    expect(footerErrors({ ...good(), groups: [{ title: "Many", links: thirteen }] })["group:0:links"]).toBeTruthy();
    expect(footerErrors({ ...good(), groups: [{ title: "x".repeat(31), links: [] }] })["group:0:title"]).toBeTruthy();
  });
  it("refuses a phone link or a WhatsApp link wherever it hides", () => {
    const f = good();
    f.groups[0]!.links.push({ label: "Call us", href: "tel:+911234567890" });
    f.social.push({ network: "facebook", url: "https://wa.me/919876543210" });
    const e = footerErrors(f);
    expect(e["group:0:link:1:href"]).toBeTruthy();
    expect(e["social:1"]).toBeTruthy();
  });
  it("allows one link per social network and at most 6", () => {
    const f = good();
    f.social.push({ network: "instagram", url: "https://instagram.com/other" });
    expect(footerErrors(f)["social:1"]).toBeTruthy();
  });
});

describe("cleanLinks and cleanFooter read stored data defensively", () => {
  it("keeps good links and drops bad ones without throwing", () => {
    expect(cleanLinks([{ label: "About", href: "/about" }, { label: "Call", href: "tel:123" }, null, 5, { label: "x" }, { label: "Mail", href: "mailto:a@b.co" }])).toEqual([
      { label: "About", href: "/about" },
      { label: "Mail", href: "mailto:a@b.co" },
    ]);
    expect(cleanLinks("nope")).toEqual([]);
    expect(cleanLinks(undefined)).toEqual([]);
  });
  it("cleans a stored footer: bad links, a WhatsApp social link, extra groups and junk types are dropped", () => {
    const raw = {
      about: "Hello",
      closing: 5,
      groups: [{ title: "A", links: [{ label: "ok", href: "/x" }, { label: "bad", href: "javascript:1" }] }, "junk", { title: "", links: [] }],
      social: [{ network: "whatsapp", url: "https://wa.me/1" }, { network: "instagram", url: "https://instagram.com/a" }, { network: "instagram", url: "https://instagram.com/b" }],
    };
    expect(cleanFooter(raw)).toEqual({
      about: "Hello",
      closing: "",
      groups: [{ title: "A", links: [{ label: "ok", href: "/x" }] }],
      social: [{ network: "instagram", url: "https://instagram.com/a" }],
    });
    expect(cleanFooter(null)).toEqual(emptyFooter());
  });
});
