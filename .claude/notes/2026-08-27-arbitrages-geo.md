---
title: Arbitrages GEO tranchés sur sources primaires
date: 2026-08-27
status: implemented
project: erom-agence-seo
sources_amont:
  - inspiration/SOURCE-marketingskills.md
  - ~/.claude/erom-store/researchs/2026-08-27-seo-geo-2026-outils-gratuits.md
  - notebook NotebookLM 93303de0-95ea-4450-ad22-e42c0e85af20
---

# Arbitrages GEO tranchés le 2026-08-27

Quatre points sur lesquels le corpus de skills récupéré, la deep research et la doc officielle divergeaient. Tranchés sur source primaire quand elle existe. Chaque entrée porte sa source et sa conséquence opérationnelle.

---

## 1. Google-Extended ne sort pas des AI Overviews

**Tranché : le corpus a tort.**

Source primaire : https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers

> Google-Extended is a standalone product token that web publishers can use to manage whether content Google crawls from their sites may be used for training future generations of Gemini models

> Google-Extended does not impact a site's inclusion in Google Search nor is it used as a ranking signal in Google Search.

Ce n'est pas un crawler. Pas de user-agent HTTP propre, donc jamais visible dans des logs serveur. C'est un token de contrôle robots.txt, rien d'autre.

Source primaire 2 : https://developers.google.com/search/docs/appearance/ai-features

> To be eligible to be shown as a supporting link in AI Overviews or AI Mode, a page must be indexed and eligible to be shown in Google Search with a snippet.

> To limit the information shown from your pages in Search, use `nosnippet`, `data-nosnippet`, `max-snippet`, or `noindex` controls.

**Précision de rigueur.** Google n'écrit jamais littéralement « Google-Extended n'affecte pas les AI Overviews ». La conclusion se déduit en deux pas à partir des deux citations ci-dessus. Solide, mais à présenter comme une déduction sourcée, jamais comme une phrase de Google.

**Conséquences en audit client**
- Bloquer `Google-Extended` protège de l'entraînement Gemini et de rien d'autre. Un client qui croit sortir des AI Overviews par ce biais se trompe de levier.
- Le vrai levier est `nosnippet` / `data-nosnippet` / `max-snippet` / `noindex`.
- **Piège inverse, à chercher systématiquement** : un `max-snippet:0` ou un `nosnippet` posé jadis pour une autre raison exclut la page des AI Overviews sans que personne ne l'ait décidé.

À corriger dans `inspiration/ai-seo/references/platform-ranking-factors.md` ligne 126 quand on dérivera nos propres skills. L'erreur est toujours présente en amont (version 2.4.0, commit `b1aaa36`).

---

## 2. Google Search Console a bien un rapport IA générative

**Tranché : la contradiction interne du rapport de recherche venait d'un décalage de dates.**

- Rapport officiel : **Generative AI performance report (Search)**, déploiement progressif à partir du **3 juin 2026**. Précédé d'un pilote restreint (« AI contribution pilot ») repéré le 13 avril 2026.
- Le passage du rapport de recherche affirmant que Google n'a aucun équivalent provenait d'une source arrêtée au **1er mai 2026**, donc exacte à sa date et périmée un mois plus tard.

**Limite importante, à ne pas vendre au-delà.** Le rapport GSC ne donne que des **impressions**. Pas de clics, pas de CTR dans la version initiale. Des blogs d'agences affirment le contraire en calquant la structure du rapport de performance classique. C'est faux.

**Écart réel Google contre Bing**

| | Google Search Console | Bing Webmaster Tools |
|---|---|---|
| Coût | gratuit | gratuit |
| Depuis | 3 juin 2026 | février 2026, enrichi le 16 juin 2026 |
| Impressions | oui | oui |
| Clics et CTR | **non** | oui |
| Part de citation face aux concurrents | non | oui (Citation Share) |
| Requêtes internes de grounding | non | oui |

Bing donne gratuitement plus que Google sur cette surface. Contre-intuitif, donc facile à placer en réunion client.

---

## 3. llms.txt : Google l'ignore, c'est écrit

**Tranché sur source primaire, et c'est net.**

Source : https://developers.google.com/search/docs/fundamentals/ai-optimization-guide

> You don't need to create new machine readable files, AI text files, markup, or Markdown to appear in Google Search

> Doing so will neither harm nor help your site's visibility or rankings in Google Search, as Google Search ignores them.

La même page décourage explicitement les tactiques « AEO/GEO » au profit du SEO de fond :

> There's no requirement to break your content into tiny pieces for AI to better understand it.

> You don't need to write in a specific way just for generative AI search.

**Ce que dit le corpus élargi**
- John Mueller a comparé publiquement `llms.txt` à la vieille balise meta `keywords`.
- Gary Illyes a confirmé l'absence de support et de projet en ce sens lors d'un Google Search Central Live.
- Décembre 2025 : un `llms.txt` apparu brièvement sur la doc développeur de Google, retiré en moins de 24 h, expliqué comme un comportement automatique de leur CMS.
- Analyse de logs sur plus de 500 millions de visites de bots IA sur 90 jours : **408 requêtes** ont visé `/llms.txt`. Search Engine Land : **8 sites sur 9** n'ont observé aucun changement après implémentation.
- Aucune documentation OpenAI, Anthropic ou Perplexity ne mentionne un traitement de `llms.txt` en production pour la recherche.

**Le seul usage avéré** : les IDE et agents de code (Cursor, Claude Code) et les plateformes de doc (Mintlify, GitBook) lisent réellement `llms.txt` et `llms-full.txt` pour ingérer de la documentation technique.

**Position eRom.** On ne facture pas `llms.txt` comme un levier de visibilité IA. Deux cas seulement :
1. Client SaaS, API ou dev tools qui veut être compris par des agents de code. Là c'est utile et démontrable.
2. Client qui le demande en connaissance de cause. Coût 15 minutes, on l'écrit, on écrit noir sur blanc que Google l'ignore.

Le vendre autrement, c'est facturer ce que Google déconseille par écrit.

---

## 4. Fraîcheur du contenu : pas de contradiction, deux moteurs

**Tranché : les trois chiffres mesurent des choses différentes.**

| Chiffre | Source | Échantillon | Ce qu'il mesure vraiment |
|---|---|---|---|
| ChatGPT cite 3,2× plus le contenu de moins de 30 jours | ConvertMate, relayé par ZipTie.dev, 1er semestre 2026 | 80 M de citations, 10 000+ domaines | pipeline RAG temps réel de ChatGPT sur index Bing |
| Âge médian d'une page citée en AI Overviews : 14 mois | Everything-PR Research, juin 2026 | 6 études croisées + Ahrefs Brand Radar sur 3 M de requêtes | index organique Google, poids de l'autorité installée |
| Déclin de 23 % au-delà de 14 jours | GenOptima, mars 2026, panel propriétaire | monitoring multi-plateforme | requêtes cycliques : comparatifs, prix, listicles |

**L'explication.** Google AI Overviews s'appuie sur l'index organique et l'E-E-A-T, donc préfère une page installée de longue date. ChatGPT et Perplexity font du RAG en direct et décotent le contenu stagnant sur les requêtes commerciales.

Formule retenue : **l'ancienneté donne la crédibilité, la mise à jour donne la citabilité.** Les deux ne s'opposent pas, ils ne visent pas les mêmes requêtes.

**Cadence à recommander, segmentée**
- **Pages d'autorité evergreen, cible Google AIO : trimestriel.** Garder l'ancienneté de l'URL, actualiser les statistiques datées, ajouter un bloc « ce qui change en 2026 », rafraîchir `article:modified_time`.
- **Pages transactionnelles et comparatifs, cible ChatGPT et Perplexity : toutes les 2 à 4 semaines.** Prix, avis, ajout d'un outil.
- **Ne jamais recommander de réécrire tout un site tous les 14 jours.** Cibler le top 20 des pages commerciales volatiles.

**Double signal obligatoire.** Les moteurs recoupent pour détecter le `schema drift`, c'est-à-dire changer une date sans toucher au texte.
1. Signal visible au-dessus du pli : « Mis à jour le X, publié initialement le Y ».
2. Signal machine cohérent : en-tête HTTP `Last-Modified`, `dateModified` en JSON-LD, sitemap XML.

**IndexNow** ferme la boucle : mettre à jour ne sert à rien si le bot repasse trois semaines plus tard. Protocole gratuit, activable en un clic sur Cloudflare. Consommé par Bing, donc par ChatGPT Search et Copilot. **Google ne le supporte pas.**

---

## Deux audits vendables qui sortent de tout ça

**Audit A : robots.txt, séparation entraînement et récupération.**
Chaque moteur a désormais un bot d'entraînement et un ou plusieurs bots de récupération. Les confondre coûte les citations. Étude BuzzStream, janvier 2026 : **71 % des éditeurs qui bloquent un bot d'entraînement bloquent aussi, par accident, au moins un bot de récupération**.

| Moteur | Entraînement | Récupération et recherche |
|---|---|---|
| OpenAI | `GPTBot` | `OAI-SearchBot`, `ChatGPT-User` |
| Anthropic | `ClaudeBot` | `Claude-User`, `Claude-SearchBot` |
| Google | `Google-Extended` (token, pas un bot) | `Googlebot` |

**Audit B : exclusion involontaire des AI Overviews.**
Chercher `nosnippet`, `data-nosnippet`, `max-snippet:0` sur l'ensemble du site. Voir arbitrage 1.

Les deux se mènent en moins d'une heure par site et s'appuient sur de la doc officielle, pas sur du folklore d'agence.

---

## Ce qui reste ouvert

- **Aucune donnée francophone.** Toutes les études du corpus sont US et anglophones, elles le disent elles-mêmes. Angle mort majeur pour une clientèle française. Aucune source trouvée à ce jour.
- **Core Web Vitals** traité partout comme un prérequis binaire, sans corrélation chiffrée avec la probabilité de citation, contrairement à schema.org qui est mesuré à 2,3×.
- **Aucun modèle reliant citation IA et revenu réel.** La chute de CTR organique sur les requêtes à AI Overview est documentée à -61 %, mais rien ne relie une citation à un euro.
- **Applebot-Extended** non documenté dans ce qu'on a rassemblé.
