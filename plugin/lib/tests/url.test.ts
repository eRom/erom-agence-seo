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

test("rewriteToOrigin garde chemin et requête, change schéma et hôte", () => {
  expect(rewriteToOrigin("https://commentchercherbonheur.org/methode?x=1", "http://localhost:3000")).toBe("http://localhost:3000/methode?x=1");
  expect(rewriteToOrigin("https://commentchercherbonheur.org", "http://localhost:3000")).toBe("http://localhost:3000/");
  expect(rewriteToOrigin("http://", "http://localhost:3000")).toBeNull();
});
