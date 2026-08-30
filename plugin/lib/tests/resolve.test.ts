// plugin/lib/tests/resolve.test.ts
import { describe, test, expect } from "bun:test";
import { resolveProperty, resolveBingSite, type Property } from "../resolve";

// Les trois propriétés réelles du compte de Romain, capture du 29/08 (échantillon A du plan).
const PROPS: Property[] = [
  { siteUrl: "sc-domain:healthincloud.app", permissionLevel: "siteUnverifiedUser" },
  { siteUrl: "sc-domain:romain-ecarnot.com", permissionLevel: "siteOwner" },
  { siteUrl: "https://lebonpote.romain-ecarnot.com/", permissionLevel: "siteOwner" },
];

describe("resolveProperty", () => {
  test("une propriété Domaine couvre son hôte et ses sous-domaines", () => {
    expect(resolveProperty("https://romain-ecarnot.com/", PROPS)?.siteUrl).toBe("sc-domain:romain-ecarnot.com");
    expect(resolveProperty("https://www.romain-ecarnot.com/methode", PROPS)?.siteUrl).toBe("sc-domain:romain-ecarnot.com");
    expect(resolveProperty("https://healthincloud.app/x", PROPS)?.siteUrl).toBe("sc-domain:healthincloud.app");
  });
  test("une propriété préfixe d'URL bat la propriété Domaine qui la contient", () => {
    expect(resolveProperty("https://lebonpote.romain-ecarnot.com/article", PROPS)?.siteUrl).toBe("https://lebonpote.romain-ecarnot.com/");
  });
  test("entre deux préfixes candidats, le plus long gagne", () => {
    const p: Property[] = [
      { siteUrl: "https://a.example.com/", permissionLevel: "siteOwner" },
      { siteUrl: "https://a.example.com/blog/", permissionLevel: "siteFullUser" },
    ];
    expect(resolveProperty("https://a.example.com/blog/x", p)?.siteUrl).toBe("https://a.example.com/blog/");
  });
  test("un préfixe s'arrête à une frontière de segment : /blog ne capture pas /blogging", () => {
    const p: Property[] = [
      { siteUrl: "https://a.example.com/blog", permissionLevel: "siteOwner" },
      { siteUrl: "sc-domain:example.com", permissionLevel: "siteOwner" },
    ];
    expect(resolveProperty("https://a.example.com/blogging/x", p)?.siteUrl).toBe("sc-domain:example.com");
    expect(resolveProperty("https://a.example.com/blog/x", p)?.siteUrl).toBe("https://a.example.com/blog");
    expect(resolveProperty("https://a.example.com/blog", p)?.siteUrl).toBe("https://a.example.com/blog");
  });
  test("l'origine est insensible à la casse, le chemin ne l'est pas", () => {
    const p: Property[] = [
      { siteUrl: "https://a.example.com/blog", permissionLevel: "siteOwner" },
      { siteUrl: "sc-domain:example.com", permissionLevel: "siteOwner" },
    ];
    expect(resolveProperty("https://A.EXAMPLE.COM/blog/x", p)?.siteUrl).toBe("https://a.example.com/blog");
    expect(resolveProperty("https://a.example.com/BLOG/x", p)?.siteUrl).toBe("sc-domain:example.com");
  });
  test("un domaine qui se termine pareil sans être un sous-domaine ne compte pas", () => {
    expect(resolveProperty("https://notromain-ecarnot.com/", PROPS)).toBeNull();
  });
  test("hors de toute propriété, ou pas une URL, rend null", () => {
    expect(resolveProperty("https://example.com/", PROPS)).toBeNull();
    expect(resolveProperty("pas une url", PROPS)).toBeNull();
  });
});

describe("resolveBingSite", () => {
  test("apparie l'hôte au site du compte, apex et www confondus, et garde IsVerified", () => {
    const sites = [{ Url: "https://www.chico.org", IsVerified: true }];
    expect(resolveBingSite("chico.org", sites)).toEqual({ Url: "https://www.chico.org", IsVerified: true });
  });
  test("un compte vide ou un hôte inconnu rend null", () => {
    expect(resolveBingSite("chico.org", [])).toBeNull();
    expect(resolveBingSite("autre.org", [{ Url: "https://www.chico.org", IsVerified: true }])).toBeNull();
  });
});
