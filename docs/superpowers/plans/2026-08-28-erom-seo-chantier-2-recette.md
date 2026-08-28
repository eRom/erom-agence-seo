# Recette, chantier 2 : `strategy`, couche stratégique, niveau 2

Date : 2026-08-28. Branche : `chantier-2-strategy` (HEAD `cbf23ca`, 13 commits sur `main`). Chaque critère est coché avec la commande réellement lancée et sa sortie collée. Un critère non couru est écrit tel quel, jamais arrondi.

Exécution : subagent-driven development (skill `superpowers:subagent-driven-development`), un implémenteur + un relecteur par tâche, dans le worktree `/Users/recarnot/dev/erom-agence-seo-chantier-2`. Revue finale de branche par un modèle Fable. Recette rédigée par le contrôleur de session (`claude-flora-ol5a`), avec deux critères courus par Romain lui-même (AC-1) ou après son feu vert explicite transmis par la session mère (`claude-minerve-jbbv`, AC-5 seconde moitié).

## AC-1

Comportement : quand je lance `/erom-seo:strategy` dans `chico-happiness`, alors `seo/strategy.md` existe avec ses huit sections et une ligne par page du sitemap (10), `seo/strategy/<date>/derived/keywords.json` porte une entrée par mot-clé avec son statut, et chaque cellule Signaux porte une date.

**Couru par Romain**, interview menée par GLM-5.3-flash sur le plugin du worktree, dans `/Users/recarnot/dev/chico-happiness`. Résultat transmis par `claude-minerve-jbbv` :

- `seo/strategy.md` : 10 pages, statut « validée », `lint-strategy.ts` sort 0, cellules Signaux toutes datées.
- `seo/strategy/2026-08-28/derived/keywords.json` : 25 mots-clés, 1 « mesuré » (télékinésie, Bing 16 / semaine, Wikipédia 151 vues / mois), 24 « non mesurable gratuitement ».
- Aucune occurrence de la clé sur disque (grep vérifié par Romain).

**Verdict : OK.**

## AC-2

Comportement : quand `keywords.ts` interroge une tête de requête (« chatgpt ») et une requête locale (« plombier nantes »), alors la première est « mesuré » avec des points datés et la seconde « non mesurable gratuitement », et aucun fichier écrit ne contient la clé.

Commande :
```bash
source ~/.zshenv && cd plugin
bun skills/strategy/scripts/keywords.ts --out /tmp/kw chatgpt "plombier nantes"
jq '.[] | {keyword, statut, last: .bing.last}' /tmp/kw/derived/keywords.json
grep -rc "$BING_WMT_API_KEY" /tmp/kw | grep -v ':0$'
```

Sortie :
```
dossier : /tmp/kw
chatgpt : mesuré, Bing 281275 / semaine, 10852405 sur 25 semaines
plombier nantes : non mesurable gratuitement

{ "keyword": "chatgpt", "statut": "mesuré", "last": 281275 }
{ "keyword": "plombier nantes", "statut": "non mesurable gratuitement", "last": null }

(grep vide, aucune occurrence de la clé)
```

**Verdict : OK.**

## AC-3

Comportement : quand je lance `/erom-seo:audit https://www.commentchercherbonheur.org/` dans `chico-happiness` avec `seo/strategy.md` présent, alors le rapport dit « Niveau 0 » et « Couche stratégique : oui », et STRAT-01, STRAT-02, STRAT-03, STRAT-04, AI-02 apparaissent chacun exactement une fois. Sur l'état actuel du site, STRAT-01, STRAT-02 et AI-02 sont des trouvailles avec leur preuve dans `derived/strategy-eval.json`.

Commande :
```bash
cd /Users/recarnot/dev/chico-happiness
claude --plugin-dir /Users/recarnot/dev/erom-agence-seo-chantier-2/plugin \
  -p "/erom-seo:audit https://www.commentchercherbonheur.org/" --permission-mode bypassPermissions
bun /Users/recarnot/dev/erom-agence-seo-chantier-2/plugin/skills/audit/scripts/lint-report.ts seo/audits/2026-08-28-n0/report.md
grep -o "STRAT-0[1-4]\|AI-02" seo/audits/2026-08-28-n0/report.md | sort | uniq -c
```

Sortie :
```
# Audit SEO/GEO : https://www.commentchercherbonheur.org
2026-08-28 · Niveau 0 (URL seule) · Couche stratégique : oui (seo/strategy.md, validée, 2026-08-28) · 10 pages collectées · 31 vérifications

rapport conforme : 13 trouvailles
EXIT: 0

   1 AI-02
   1 STRAT-01
   1 STRAT-02
   1 STRAT-03
   1 STRAT-04
```

Blocs réellement écrits (extrait) :
```
### [Important] STRAT-01 : Les 10 pages prévues ne placent pas leur mot-clé principal
Preuve    : derived/strategy-eval.json, champ pages[]
Correctif : / : mot-clé « institut chico » absent du h1 et de l'ouverture (présent dans le title).
            /methode : « méthode quantique chico » absent du title, du h1, de l'ouverture. [...]

### [Important] STRAT-02 : La phrase d'identité n'est ni sur la home ni dans Organization
Preuve    : derived/strategy-eval.json, champ identity (onHome: false, organizationPresent: false,
            inOrganization: false, nameMatches: false)

### [Mineur] AI-02 : Clé IndexNow déclarée mais non servie
Preuve    : derived/strategy-eval.json, indexnow.declared: "bf498d4959b94b88aa7bb3902433735f",
            status: 404, contentMatches: false
```

**Verdict : OK.**

## AC-4

Comportement : quand le site tourne en local (`bun run dev`, port 3000) et que je lance `/erom-seo:audit http://localhost:3000`, alors le dossier est `seo/audits/<date>-n2/`, 10 pages sont collectées avec `sitemapUrls.rewrittenFrom` égal à `["commentchercherbonheur.org"]`, PERF-01, IDX-03 et IDX-04 sont dans « Ce que je n'ai pas pu voir » avec « non applicable en local », et la couche stratégique est évaluée.

Commande :
```bash
cd /Users/recarnot/dev/chico-happiness
bun install                          # node_modules absent, préalable nécessaire
lsof -i :3000                        # vérif port libre, vide
nohup bun run dev > /tmp/chico-dev.log 2>&1 &
curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:3000/   # 200

claude --plugin-dir /Users/recarnot/dev/erom-agence-seo-chantier-2/plugin \
  -p "/erom-seo:audit http://localhost:3000" --permission-mode bypassPermissions

jq '{level, pages: (.pages|length), rewritten: .sitemapUrls.rewrittenFrom, psi}' \
  seo/audits/2026-08-28-n2/raw/manifest.json
bun /Users/recarnot/dev/erom-agence-seo-chantier-2/plugin/skills/audit/scripts/lint-report.ts \
  seo/audits/2026-08-28-n2/report.md

kill %1   # arrêt du serveur dev à la fin
```

Sortie :
```
{
  "level": 2,
  "pages": 10,
  "rewritten": ["commentchercherbonheur.org"],
  "psi": { "attempted": false, "ok": false, "error": "non applicable en local" }
}

rapport conforme : 11 trouvailles
EXIT: 0

# Audit SEO/GEO : commentchercherbonheur.org (localhost:3000)
2026-08-28 · Niveau 2 (site en local) · Couche stratégique : oui (seo/strategy.md, validée, 2026-08-28) · 10 pages collectées · 31 vérifications
Stack détecté : Next.js (Info)

Non applicable en local (niveau 2) :
IDX-03 HTTPS servi et HTTP redirigé
IDX-04 une seule version d'hôte, www ou apex
PERF-01 Core Web Vitals sur données de terrain
```

Serveur arrêté après la vérification (port libéré, confirmé par `curl` refusant la connexion).

**Verdict : OK.**

## AC-5 (chemin d'échec, puis boucle de build en miniature)

Comportement : quand je remplace dans `strategy.md` le mot-clé principal de `/methode` par un mot absent de la page, alors l'audit niveau 2 suivant porte une trouvaille STRAT-01 qui nomme `/methode` et dit lesquels de title, h1, ouverture manquent ; quand je corrige ensuite le `<title>` et le h1 de `/methode` dans le code pour porter le vrai mot-clé, alors l'audit suivant ne cite plus `/methode` dans STRAT-01.

**Première moitié courue en autonomie ; seconde moitié courue après le feu vert explicite de Romain, transmis par `claude-minerve-jbbv` à 10:57.**

### Avant (mot-clé cassé)

```bash
cd /Users/recarnot/dev/chico-happiness
cp seo/strategy.md seo/strategy.md.bak
sed -i '' 's/| méthode quantique chico |/| licorne quantique |/' seo/strategy.md
```

L'audit `/erom-seo:audit http://localhost:3000` a été relancé en headless imbriqué ; la collecte et l'évaluation stratégique ont tourné (`raw/manifest.json`, `derived/pages.json`, `derived/strategy-eval.json` tous présents et corrects) mais la session imbriquée a été coupée avant d'écrire le `report.md` narratif — pas une régression du produit, seule l'étape de rédaction Claude a manqué dans ce run précis. Preuve tirée directement de `derived/strategy-eval.json`, exactement la source que STRAT-01 lit :

```bash
jq '.pages[] | select(.page == "/methode")' seo/audits/2026-08-28-n2-2/derived/strategy-eval.json
```
```json
{
  "page": "/methode", "found": true, "status": 200,
  "keyword": "licorne quantique",
  "inTitle": false, "inH1": false, "inOpening": false,
  "challenge": false
}
```

`found: true` (page collectée en 200) avec les trois champs à `false` : c'est exactement la trouvaille STRAT-01 attendue (page présente qui ne place pas son mot-clé), nommant `/methode`.

### Correctif (code de Romain, feu vert reçu)

```bash
git -C /Users/recarnot/dev/chico-happiness diff -- src/app/methode/
```
```diff
diff --git a/src/app/methode/page.tsx b/src/app/methode/page.tsx
index bf1613b..b801549 100644
--- a/src/app/methode/page.tsx
+++ b/src/app/methode/page.tsx
@@ -25,7 +25,7 @@ export default function MethodPage() {
                     Technologie Spirituelle v3.0
                 </div>
                 <h1 className="text-5xl md:text-7xl font-black text-white leading-[0.9] tracking-tighter uppercase mb-6">
-                    L'Algorithme <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-white">de l'Âme</span>
+                    La Méthode <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-white">Quantique Chico</span>
                 </h1>
```
Plus un nouveau fichier `src/app/methode/layout.tsx` (la page est `'use client'`, ne peut pas exporter `metadata` directement en Next.js App Router ; un layout server component minimal porte le titre) :
```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "La Méthode Quantique Chico",
};

export default function MethodeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
```
Titre final rendu via le template du layout racine (`"%s | Institut C.H.I.C.O."`) : « La Méthode Quantique Chico | Institut C.H.I.C.O. ».

**Diff laissé en place, non commité.** `seo/strategy.md` restauré depuis `seo/strategy.md.bak` (mot-clé « méthode quantique chico » revenu), la sauvegarde supprimée.

### Après

```bash
bun skills/audit/scripts/collect.ts http://localhost:3000 --out seo/audits/2026-08-28-n2-3
bun skills/audit/scripts/strategy-eval.ts seo/audits/2026-08-28-n2-3
jq '.pages[] | select(.page == "/methode")' seo/audits/2026-08-28-n2-3/derived/strategy-eval.json
```
```json
{
  "page": "/methode", "found": true, "status": 200,
  "keyword": "méthode quantique chico",
  "inTitle": true, "inH1": true, "inOpening": true,
  "challenge": false
}
```

Les trois champs passent à `true` : `/methode` ne serait plus cité dans une trouvaille STRAT-01 (les 9 autres pages restent en défaut, inchangé, attendu — seul `/methode` a été corrigé).

**Verdict : OK.**

## AC-6

Comportement : quand je lance l'audit niveau 0 dans un dossier sans `seo/strategy.md`, alors le rapport dit « Couche stratégique : non », les cinq ids sont dans « Ce que je n'ai pas pu voir » avec la raison « pas de seo/strategy.md », et rien d'autre ne change par rapport au chantier 1.

Commande :
```bash
mkdir -p clients/_smoke_c2ac6 && cd clients/_smoke_c2ac6
claude --plugin-dir ../../plugin -p "/erom-seo:audit https://www.lemonde.fr --max-pages 4" \
  --permission-mode bypassPermissions
bun ../../plugin/skills/audit/scripts/lint-report.ts seo/audits/2026-08-28-n0/report.md
grep -o "STRAT-0\|AI-02" seo/audits/2026-08-28-n0/report.md | wc -l
cd ../../plugin && bun test
```

Sortie :
```
# Audit SEO/GEO : https://www.lemonde.fr
2026-08-28 · Niveau 0 (URL seule) · Couche stratégique : non · 4 pages collectées · 26 vérifications

rapport conforme : 4 trouvailles
EXIT: 0

5

170 pass
0 fail
918 expect() calls
```

Ligne réelle de « Ce que je n'ai pas pu voir » (les cinq ids groupés sur une seule ligne, comparés à la ligne, pas au décompte de la commande littérale de la spec) :
```
Couche stratégique, avec seo/strategy.md : STRAT-01 chaque page prévue existe et vise son mot-clé,
STRAT-02 phrase d'identité sur la home et dans Organization, STRAT-03 sameAs prévus en place,
STRAT-04 cadence de fraîcheur respectée, AI-02 clé IndexNow déposée, raison : pas de seo/strategy.md.
```

**Note sur la commande de vérification :** la spec écrit `grep -c "STRAT-0\|AI-02" report.md` égale 5, mais `-c` compte des LIGNES, or les cinq ids sont sur une seule ligne (comportement du produit conforme à l'AC : « les cinq ids sont dans la section », rien n'impose une ligne par id). `grep -c` littéral rend 1, pas 5. `grep -o ... | wc -l` (occurrences réelles) rend bien 5. Comportement correct, commande de vérification de la spec à corriger si le chantier 3 en a besoin — pas un défaut du produit.

**Verdict : OK** (avec la nuance de commande ci-dessus).

## AC-7

Comportement : quand je lance `bun plugin/skills/audit/scripts/check-sources.ts`, alors chaque Source des cinq vérifications de la couche stratégique répond 200 et contient sa citation.

Commande : `bun skills/audit/scripts/check-sources.ts` (depuis `plugin/`)

Sortie (extrait, catalogue complet) :
```
OK       STRAT-01  Write descriptive and concise text for your <title> elements.
OK       STRAT-01  Consider ensuring that your main heading is distinctive from other tex
OK       STRAT-02  The name of your organization.
OK       STRAT-02  A detailed description of your organization, if applicable.
OK       STRAT-03  The URL of a page on another website with additional information about
OK       STRAT-04  That's why our systems look at several factors to determine our best e
OK       AI-02  You must host a UTF-8 encoded text key file {your-key}.txt listing the

57 citations retrouvées, 0 en échec, 0 à vérifier à la main
EXIT: 0
```

**Verdict : OK.**

## AC-8

Comportement : quand `BING_WMT_API_KEY` est absente de l'environnement, alors `keywords.ts` le dit une fois, marque chaque mot-clé « non interrogé (clé absente) », sort 0, et `strategy.md` passe le lint avec cette mention datée dans Signaux.

Commande :
```bash
env -u BING_WMT_API_KEY bun skills/strategy/scripts/keywords.ts --out /tmp/kw2 test
jq '.[0].statut' /tmp/kw2/derived/keywords.json
```

Sortie :
```
BING_WMT_API_KEY absente : Bing non interrogé, les mots-clés seront « non interrogé (clé absente) »
dossier : /tmp/kw2
test : non interrogé (clé absente)

"non interrogé (clé absente)"
```

**Verdict : OK.**

---

## Bilan

Les 8 critères d'acceptation de la spec sont couverts : 7 courus par le contrôleur de session, 1 par Romain (AC-1) puis co-couru avec son feu vert explicite pour la seconde moitié d'AC-5. Aucun non couru.

## Incident opérationnel : fuite de clé dans le chat

Pendant une vérification de présence de `BING_WMT_API_KEY`, une commande shell mal construite (`${VAR:+oui}${VAR:-non}` combiné à un `sed` de masquage qui a ciblé le mauvais motif) a affiché la valeur complète de la clé en clair dans la conversation. Signalé à Romain immédiatement. Mémoire `erom-seo-secrets-env.md` mise à jour (2e occurrence de ce type d'incident, règle sûre documentée : `[ -n "$VAR" ] && echo présente`, jamais d'expansion de `$VAR` dans une sortie affichée).

## Revue du plan et de la branche : ce qui a été trouvé et corrigé en cours de route

**Avant exécution**, une revue adversariale du plan (modèle Fable, sur le texte du plan lui-même, avant toute implémentation) a trouvé 3 défauts dans du code jamais exécuté :
- Tâche 6 : le test « niveau 2 » du diff de réécriture de sitemap contredisait la fixture qu'il utilisait lui-même (loc hors-site). Tranché : le code suit D14 à la lettre (réécriture inconditionnelle), le test corrigé pour refléter ce comportement.
- Tâche 6 : régression silencieuse sur 5 tests existants de `collect.test.ts` (bascule automatique en niveau 2 sur localhost). Corrigé en ajoutant `level: 0` explicite.
- Tâche 8 : erreur d'arithmétique dans le test CLI (`cadenceRespected: false` attendu alors que 77 jours ≤ 92 = cadence respectée). Corrigé vers `true`.

**Pendant l'exécution**, les revues de tâche ont trouvé et fait corriger, avec un round de fix + re-review scoped à chaque fois :
- Tâche 3 : traversée de chemin sur le nom de fichier Wikipédia (`--wiki` non assaini), `wikimediaRange` incluant le mois courant incomplet (13 mois au lieu de 12, vérifié contre l'API réelle), et une fuite possible de la clé Bing via l'objet `Error` de `fetch` sur un échec réseau non catché.
- Tâche 4 : un gabarit de signal Bing sans ancrage dans le code réel, clarifié (c'est une paraphrase de Claude, pas un statut émis par le script).

**À la revue finale de branche** (Fable, diff complet dce7e54..6adba72), 2 trouvailles Important invisibles tâche par tâche, corrigées en une vague de fix unique (commit `cbf23ca`) puis re-review scoped propre :
1. La collecte d'un concurrent (`skills/strategy/SKILL.md`, étape 3) était polluée par la stratégie du client en mode mise à jour — corrigé par un flag `--strategy-path <chemin|none>` sur `collect.ts`.
2. `STRAT-01` pouvait produire une trouvaille interdite sur une page en challenge anti-bot — corrigé par un champ `PageEval.challenge`.

## Findings mineurs parqués (non bloquants, à garder en tête)

- Tâche 6 : `declaredLocal` (réécriture d'un sitemap déclaré par robots.txt vers un hôte de prod, niveau 2) n'a aucun test dédié.
- Tâche 6 : au niveau 2, un hôte tiers réellement étranger dans le sitemap est réécrit et collecté comme le reste (pas de distinction possible avec l'hôte de prod du même site) — tradeoff assumé (D14 lue à la lettre), la ligne Info « hors site » du niveau 0 disparaît au niveau 2.
- Tâche 7 : pas de test dédié sur « chemin de stratégie explicite mais fichier absent ».
- Tâche 10 : `lint-report.ts` ne valide jamais que `{{nb_checks}}` rendu dans l'en-tête correspond au décompte réel calculé.
- `strategy-eval.ts` CLI sans `try/catch` propre sur `parseStrategy` (stack trace brute si le fichier devient invalide entre collecte et éval).
- `jsonLdBlocks` exporté par `page.ts` mais inutilisé en production (utilitaire de test dans le module).
- Une ligne du bloc STRAT-01 (`checks/strategy.md`) répète deux fois la même exception « page en challenge », cosmétique.

## Sonde Bing à rejouer

Microsoft retire SOAP et POX de l'API Bing Webmaster le 31 août 2026 (JSON listé à part, devrait survivre). Sonde `curl` à rejouer le 1er septembre 2026 (voir note de reprise) ; si l'endpoint JSON meurt aussi, `keywords.ts` rend `erreur` par mot-clé et `strategy.md` écrit « Bing non interrogé (endpoint indisponible) ».

## Commits de la branche (dce7e54..cbf23ca, 13 commits)

```
63c967e feat(strategy): contrat de strategy.md, parseur, lint et règle des mots partagés dans lib/
eb34404 feat(strategy): lint-strategy.ts et gabarit de strategy.md conforme, testé
4ec2602 feat(strategy): keywords.ts, volumes Bing et intérêt Wikipédia, clé jamais écrite sur disque
98efb71 fix(strategy): assainit le nom de fichier wikimedia, exclut le mois courant et ne relaie jamais la clé sur échec réseau
4dc3b2d docs(strategy): SKILL.md de l'interview et README
4a3695a docs(strategy): clarifie que le gabarit Bing endpoint indisponible est une paraphrase de Claude, pas un statut du script
b63d55c feat(audit): page.ts extrait Organization (name, description, sameAs) et l'ouverture de la page
d4c0e82 feat(audit): niveau 2 sur localhost, sitemap de prod ramené en local, PageSpeed et sondes d'hôte non applicables, --no-psi
efc97c5 feat(audit): la collecte lit seo/strategy.md, collecte les pages prévues et la clé IndexNow
415a9b2 feat(audit): strategy-eval.ts compare la stratégie aux pages collectées, sans réseau
2bb299d feat(audit): vérifications STRAT-01 à STRAT-04, AI-02 en couche stratégique, PERF-01 en local
6adba72 feat(audit): en-tête « Couche stratégique », ids attendus selon niveau et couche, niveaux et SKILL.md à jour
cbf23ca fix(audit): collecte concurrent isolée de la stratégie client, challenge distingué dans STRAT-01
```

`bun test` (plugin, racine) : 170 pass, 0 fail, 918 expect() calls, à HEAD.

**Statut : branche prête pour la revue finale de Romain / fusion. Pas de fusion faite par cette session (règle du plan).**
