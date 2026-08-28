# Audit SEO/GEO : {{site}}
{{date}} · Niveau {{niveau}} ({{entree}}) · Couche stratégique : {{oui (seo/strategy.md, {{statut}}, {{date_strategie}}) | non}} · {{nb_pages}} pages collectées · {{nb_checks}} vérifications
<!-- nb_checks = vérifications absolues de niveau inférieur ou égal au niveau exécuté (26 au niveau 0 et au niveau 2), plus 5 si la couche stratégique est active. {{entree}} : « URL seule » au niveau 0, « site en local » au niveau 2. -->
Stack détecté : {{stack}} (Info)

## En bref
{{n_critique}} Critique · {{n_important}} Important · {{n_mineur}} Mineur · {{n_info}} Info
Les trois choses à dire en RDV :
1. {{phrase_1}}
2. {{phrase_2}}
3. {{phrase_3}}

## Trouvailles

### [{{severite}}] {{id}} : {{titre}}
Preuve    : {{fichier et lignes dans raw/ ou champ dans derived/}}
Pourquoi  : {{une ou deux phrases, en français, pour un client}}
Source    : {{URL}} « {{citation verbatim}} »
Correctif : {{ce qu'on propose, prêt à coller si possible}}
Effort    : {{rapide | moyen | lourd}}

## Ce que je n'ai pas pu voir
Niveau 1, avec les accès : {{liste id + nom}}
Couche stratégique, avec seo/strategy.md : {{les cinq ids et noms si la couche est inactive, avec la raison « pas de seo/strategy.md » ou « seo/strategy.md inanalysable : … » ; « aucune » si la couche est active}}
{{PERF-01 si clé absente, avec la procédure}}
{{au niveau 2 : PERF-01, IDX-03, IDX-04 non applicable en local, une ligne par id}}
{{si manifest.sitemapUrls.skipped non vide : une ligne Info « N URLs du sitemap ignorées, hors site : … », preuve raw/manifest.json}}
{{vérifications du niveau {{niveau}} non évaluables sur cette collecte précise : une ligne par id, avec sa raison précise, par exemple « SD-03 non applicable, aucune page de contenu auditable derrière la protection anti-bot »}}

## Vérifications passées
{{id}} {{nom}}
…

## Annexe : collecte
| Ressource | URL | Statut | Octets | Fichier |
|---|---|---|---|---|
{{une ligne par entrée de raw/manifest.json : robots, sitemaps, llms, pages, sondes}}
