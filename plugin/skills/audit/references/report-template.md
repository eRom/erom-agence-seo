# Audit SEO/GEO : {{site}}
{{date}} · Niveau {{niveau}} ({{entree}}) · {{nb_pages}} pages collectées · {{nb_checks}} vérifications
<!-- nb_checks = nombre de vérifications dont le niveau est inférieur ou égal au niveau exécuté (26 au niveau 0), jamais le total de tous les blocs de references/checks/. -->
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
Niveau 2, avec le code et la stratégie : {{liste id + nom}}
{{PERF-01 si clé absente, avec la procédure}}
{{vérifications du niveau {{niveau}} non évaluables sur cette collecte précise : une ligne par id, avec sa raison précise, par exemple « SD-03 non applicable, aucune page de contenu auditable derrière la protection anti-bot »}}

## Vérifications passées
{{id}} {{nom}}
…

## Annexe : collecte
| Ressource | URL | Statut | Octets | Fichier |
|---|---|---|---|---|
{{une ligne par entrée de raw/manifest.json : robots, sitemaps, llms, pages, sondes}}
