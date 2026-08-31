# Gabarit de rapport-client.md

- Une section dont la liste est vide s'omet entièrement, titre compris. Un rapport sans trouvaille Critique n'a donc pas de section « Ce qui bloque » : c'est le cas nominal d'un site sain, pas une anomalie.
- Le commentaire `<!-- couvre: ID, ID -->` est la seule trace des identifiants. Il est retiré au rendu et n'atteint jamais le client, pas même dans la source du HTML.
- Le compte de la section Méthode vaut Mineur plus Info, pas Mineur seul.

```markdown
# {{nom du site tel que le client l'appelle}}
Revue du {{date en toutes lettres}}

{{deux ou trois phrases : l'état général, le manque principal, ce que couvre ce document}}

## À faire cette semaine
### {{l'action, en une phrase qui commence par un verbe}}
<!-- couvre: IDX-01, IDX-03 -->
{{pourquoi ça compte pour son activité, une ou deux phrases sans jargon}}

{{le geste exact, numéroté si plusieurs étapes, avec le texte prêt à coller si possible}}

## Ce qui bloque
### {{titre en clair}}
<!-- couvre: SNIP-01 -->
Constaté : {{la preuve, en français lisible, avec la valeur vue}}
Effet : {{ce que ça coûte au client, concret}}
À faire : {{le correctif, sans nous}}

## Ce qui freine
{{même forme}}

## Ce qui marche déjà
- {{une ligne par point fort, tiré des vérifications passées}}

## Méthode
{{ce qui a été regardé, à quelle date, avec quoi}}
{{N}} points mineurs figurent dans le rapport technique complet, disponible sur demande.
```
