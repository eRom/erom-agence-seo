import { describe, test, expect } from "bun:test";
import { sameSite, pageKey, rewriteToOrigin } from "../url";

describe("sameSite", () => {
  test("apex et www sont le même site, dans les deux sens", () => {
    expect(sameSite("https://acme.fr/a", "https://www.acme.fr")).toBe(true);
    expect(sameSite("https://www.acme.fr/a", "https://acme.fr")).toBe(true);
  });
  test("le schéma est indifférent", () => {
    expect(sameSite("http://acme.fr/a", "https://www.acme.fr")).toBe(true);
    expect(sameSite("https://www.acme.fr/a", "http://acme.fr")).toBe(true);
  });
  test("la casse de l'hôte est indifférente", () => {
    expect(sameSite("https://WWW.Acme.FR/a", "https://acme.fr")).toBe(true);
  });
  test("un autre domaine est refusé, y compris s'il commence par l'hôte visé", () => {
    expect(sameSite("https://autre.fr/a", "https://www.acme.fr")).toBe(false);
    expect(sameSite("https://acme.fr.evil.com/a", "https://acme.fr")).toBe(false);
  });
  test("un sous-domaine autre que www reste un autre site", () => {
    expect(sameSite("https://blog.acme.fr/a", "https://acme.fr")).toBe(false);
  });
  test("un seul www est retiré : www.www.acme.fr n'est pas acme.fr", () => {
    expect(sameSite("https://www.www.acme.fr/a", "https://acme.fr")).toBe(false);
  });
  test("le port fait partie de l'identité du site", () => {
    expect(sameSite("http://acme.fr:8080/a", "http://acme.fr:9090")).toBe(false);
    expect(sameSite("http://www.acme.fr:8080/a", "http://acme.fr:8080")).toBe(true);
  });
  test("une URL non analysable est refusée", () => {
    expect(sameSite("/relatif", "https://acme.fr")).toBe(false);
  });
});

describe("pageKey", () => {
  test("même page en apex et en www : une seule clé", () => {
    expect(pageKey("https://acme.fr/a")).toBe(pageKey("https://www.acme.fr/a"));
    expect(pageKey("https://acme.fr/a")).toBe("acme.fr/a");
  });
  test("la barre finale fait partie de la clé : /a et /a/ restent deux pages distinctes", () => {
    // C'est la différence avec le helper propre à keywordChecks (plugin/skills/audit/scripts/lib/level1.ts) :
    // wantedPages s'appuie sur pageKey pour dédoublonner des pages à collecter, où /a et /a/ peuvent
    // légitimement être deux requêtes distinctes. pageKey ne doit donc jamais gommer cette barre lui-même.
    expect(pageKey("https://acme.fr/a")).not.toBe(pageKey("https://acme.fr/a/"));
  });
  test("la requête fait partie de la clé", () => {
    expect(pageKey("https://acme.fr/a?x=1")).not.toBe(pageKey("https://acme.fr/a"));
  });
  // Repli sur une entrée non absolue (T1) : c'est ce trou de couverture qui a laissé passer C-1. Une page de
  // stratégie est toujours un chemin nu (« /methode », imposé par parseStrategy) : new URL() lève sans base,
  // et pageKey doit rendre l'entrée telle quelle plutôt que de faire sortir une exception du module.
  test("une entrée non absolue (chemin nu de strategy.md) est rendue telle quelle, jamais résolue", () => {
    expect(pageKey("/methode")).toBe("/methode");
    expect(pageKey("/")).toBe("/");
  });
  test("une chaîne totalement inanalysable est rendue telle quelle", () => {
    expect(pageKey("pas une url du tout")).toBe("pas une url du tout");
  });
});

test("rewriteToOrigin garde chemin et requête, change schéma et hôte", () => {
  expect(rewriteToOrigin("https://commentchercherbonheur.org/methode?x=1", "http://localhost:3000")).toBe("http://localhost:3000/methode?x=1");
  expect(rewriteToOrigin("https://commentchercherbonheur.org", "http://localhost:3000")).toBe("http://localhost:3000/");
  expect(rewriteToOrigin("http://", "http://localhost:3000")).toBeNull();
});
