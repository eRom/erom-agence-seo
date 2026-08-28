---
name: strategy
description: Interview SEO/GEO qui produit seo/strategy.md, le contrat d'un site : identité, cibles, concurrents, pages et mots-clés mesurés (Bing, Wikipédia), entité, liens, cadence de fraîcheur. Une question à la fois, chiffres datés et sourcés, jamais un volume inventé. Triggers : '/erom-seo:strategy', 'écris la stratégie SEO de', 'stratégie de mots-clés pour', 'quelles pages viser pour'.
argument-hint: "[<url du site>]"
---

# Stratégie SEO/GEO

Tu produis `seo/strategy.md`, un contrat lisible par le client et lu par des scripts. Tu proposes, Romain corrige. Une question par message. Aucun chiffre sans date ni source ; un vide chez Bing s'écrit « non mesurable gratuitement », jamais un chiffre inventé, jamais un chiffre Google (D11).

## 0. Préparer

1. Répertoire courant : le dossier du site (`clients/<domaine>/` ou le repo du site). Créer `seo/` s'il manque.
2. Lire avant toute question, s'ils existent : le dernier `seo/audits/*/derived/pages.json` (titres, h1, descriptions, slugs) et `raw/pages/index.html` (liens du pied de page vers x.com, linkedin.com, facebook.com, instagram.com, youtube.com, tipeee.com, linktr.ee, github.com, wikidata.org, annuaires, plateformes d'avis) ; `seo/strategy.md` (mode mise à jour : résumer ce qu'il contient et demander ce qui change ; si `lint-strategy.ts` le refuse, proposer de le corriger d'abord).
3. Clé Bing : `BING_WMT_API_KEY` doit être dans l'environnement (`source ~/.zshenv` avant de lancer Claude). Absente : le dire une fois, continuer ; les signaux seront « Bing non interrogé (clé absente) ».
4. Scripts : `${CLAUDE_PLUGIN_ROOT}/skills/strategy/scripts/`. Si `${CLAUDE_PLUGIN_ROOT}/node_modules` manque : `cd ${CLAUDE_PLUGIN_ROOT} && bun install --frozen-lockfile`.
5. Le dossier de données `seo/strategy/<date>/` est réservé par `keywords.ts` à sa première exécution (étape 5) ; lire sa première ligne `dossier : …` et reprendre ce chemin dans l'en-tête du fichier (`Données : seo/strategy/<date>/`).

## 1. L'interview, neuf étapes

1. **Identité.** Proposer la phrase « <Site> est <catégorie> qui <différenciateur>. » à partir du title et de la description de la home, ou de ce que Romain dit. Une phrase, elle nourrira le H1 de la home et Organization.description.
2. **Cibles.** Audience, langue (défaut fr), pays (défaut FR). Surfaces IA proposées selon l'audience : B2B → Copilot, LinkedIn ; développeurs → Claude, Brave ; grand public → AI Overviews, ChatGPT, YouTube. Le « Pourquoi » en une phrase.
3. **Concurrents.** Zéro à quatre URLs. Pour chacune : `bun ${CLAUDE_PLUGIN_ROOT}/skills/audit/scripts/collect.ts <url> --max-pages 10 --no-psi --strategy-path none --out seo/strategy/<date>/raw/concurrents/<domaine>` (`--strategy-path none` : la stratégie du client, si elle existe déjà dans le dossier courant, ne doit jamais polluer la collecte du concurrent ; si `keywords.ts` n'a pas encore réservé le dossier, le réserver maintenant avec `mkdir -p seo/strategy/<date>` et passer `--out seo/strategy/<date>` à `keywords.ts` à l'étape 5). Résumer ce que chacun vise depuis `derived/pages.json` (titres, h1, slugs) ; Romain dit ce qu'on prend et ce qu'on évite. Aucun concurrent : la ligne « Aucun concurrent identifié. ».
4. **Pages et mots-clés.** Liste des pages : le sitemap du dernier audit (site existant) ou Romain (site à construire). Pour chaque page, proposer intention (informationnelle, transactionnelle, navigationnelle, locale), mot-clé principal, secondaires, à partir des titres, des concurrents et des mots de Romain. Présenter le tableau entier, Romain amende.
5. **Mesure.** `source ~/.zshenv && bun ${CLAUDE_PLUGIN_ROOT}/skills/strategy/scripts/keywords.ts [--out seo/strategy/<date>] --country <PAYS> --language <langue-PAYS> [--wiki "<mot-clé>=<Titre_article>"]... <tous les mots-clés, principaux et secondaires>`. Pour les sujets informationnels qui ont un article Wikipédia en français, proposer le titre exact de l'article (`Optimisation_pour_les_moteurs_de_recherche`), Romain confirme. Montrer le tableau des statuts et des chiffres. Puis une question : relever l'autocomplétion Google des mots-clés principaux maintenant (Romain colle les suggestions, navigateur privé, localisé en France) ou plus tard.
6. **Entité.** Nom ; `sameAs` proposés depuis les liens de la home ; NAP seulement si une page a l'intention locale.
7. **Liens externes.** Liste libre : annuaires, avis, partenaires, presse, podcasts. Jamais d'achat de liens.
8. **Cadence.** Par page, proposée selon l'intention : transactionnelle et comparatifs → 4 semaines ; informationnelle et navigationnelle → trimestriel ; mentions légales → annuel. IndexNow : clé existante (Romain la colle), à générer (`bun -e "console.log(crypto.randomUUID().replace(/-/g, ''))"`, 32 caractères hexadécimaux, `build` la déposera), ou non.
9. **Écriture.** Copier `${CLAUDE_PLUGIN_ROOT}/skills/strategy/references/strategy-template.md`, remplacer les valeurs sans toucher à la structure, écrire `seo/strategy.md`. `bun ${CLAUDE_PLUGIN_ROOT}/skills/strategy/scripts/lint-strategy.ts seo/strategy.md` doit sortir 0 ; sinon corriger. Résumer en cinq lignes : identité, nombre de pages, mots-clés mesurés contre non mesurables, sameAs, cadence. Romain dit « validée » : passer `Statut : brouillon` à `Statut : validée`. Sinon le fichier reste en brouillon, ce qui n'empêche pas l'audit.

## 2. Ce que la cellule Signaux écrit

Dans l'ordre, chaque élément daté (AAAA-MM-JJ) :
- `Bing FR : <last> / semaine, <total> sur <weeks> semaines (<date>)`, ou `Bing FR : rien, non mesurable gratuitement (<date>)`, ou `Bing non interrogé (clé absente) (<date>)` (statuts émis tels quels par `keywords.ts`) ; ou `Bing non interrogé (endpoint indisponible) (<date>)` : pas un statut émis par le script, à écrire toi-même si `derived/keywords.json` porte `erreur : ...` sur tous les mots-clés et que l'erreur ressemble à une panne de l'endpoint Bing plutôt qu'à un incident ponctuel sur un seul mot-clé.
- `Wikipédia fr : <average> vues / mois sur 12 mois (<date>)` si mesuré.
- `autocomplétion : « … », « … » (relevé manuel <date>)`, ou `autocomplétion : non relevée`.

Les chiffres viennent de `seo/strategy/<date>/derived/keywords.json`, jamais de mémoire. Le lint refuse une cellule sans date.

## 3. Règles d'écriture

Français, phrases courtes, aucun tiret cadratin. Le client lit ce fichier : pas de jargon sans explication. « Ce qu'on ne sait pas » dit noir sur blanc ce que le gratuit ne mesure pas. Ne jamais modifier `seo/strategy/<date>/raw/`.
