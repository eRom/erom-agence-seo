# Le registre de langue face au client

Ces neuf règles s'appliquent en écrivant `rapport-client.md` (spec, section 5). Certaines sont mécanisées par le lint (l'identifiant invisible, le tiret cadratin) ; les autres sont un jugement, à porter soi-même, exemple par exemple.

## Gloser chaque terme technique à sa première apparition

Fautif  : « Votre canonical pointe vers une autre URL. »
Juste   : « L'adresse canonique, celle que vous désignez à Google comme la version officielle d'une page, pointe aujourd'hui vers une autre adresse. »

## Aucun identifiant de vérification dans le texte visible

Fautif  : « La trouvaille SNIP-01 montre que votre description est trop courte. »
Juste   : « Votre description de page, celle qui apparaît sous le titre bleu dans les résultats Google, est trop courte pour être reprise telle quelle. »

L'identifiant existe, mais uniquement dans le commentaire `<!-- couvre: ... -->` qui précède le paragraphe, jamais dans une phrase que le client lit.

## Pas de mots dramatiques

Les mots de gravité seulement là où ils sont littéralement vrais : un site hors ligne est critique, un title de soixante-cinq caractères ne l'est pas.

Fautif  : « Votre title de soixante-cinq caractères est un désastre pour votre référencement. »
Juste   : « Le titre de cette page dépasse la longueur que Google affiche en entier ; passé ce seuil, la fin est coupée dans les résultats de recherche. »

## Pas d'em dash, pas de construction « Pas X. Y. », pas de point d'exclamation

Fautif  : « Pas de panique, une simple correction suffit ! »
Juste   : « Une simple correction suffit, sans urgence particulière. »

## Deux-points français précédés d'une espace insécable

Le deux-points d'une phrase remise au client porte toujours l'espace insécable qui le précède, comme le design system institut l'impose ailleurs. Un espace normal se justifie à l'écran mais casse au moment le plus mauvais : juste avant une impression, quand le mot finit une ligne et que le deux-points commence la suivante, seul, sur la ligne d'après.

C'est la seule des neuf règles qu'aucun lint ne vérifie : elle repose entièrement sur l'attention en écrivant. L'erreur réelle n'est pas d'oublier l'espace, c'est de taper une espace normale au lieu de l'insécable : les deux se voient exactement pareil, à l'écran comme à l'impression. On ne les distingue pas à l'oeil, seul un examen des octets le fait : une espace normale est le seul octet 0x20, une espace insécable est la séquence UTF-8 C2 A0 (vérifiable par un hexdump du fichier autour du deux-points).

Fautif  : « Constaté : le titre de cette page manque. » (espace normale devant le deux-points, identique à l'oeil à la bonne version)
Juste   : « Constaté : le titre de cette page manque. » (espace insécable, U+00A0, devant le deux-points)

## Toute affirmation vient d'une preuve dans la collecte

Fautif  : « Vos concurrents vous dépassent sur ce point. »
Juste   : « Le titre de cette page mesure quatre-vingt-douze caractères ; Google en affiche généralement une soixantaine, le reste est coupé. »

Le rapport client ne peut rien dire de plus que `report.md` ; il le dit autrement. Une affirmation qu'on ne retrouve pas, mot pour preuve, dans le rapport technique n'a rien à faire dans le rapport client, aussi vraisemblable soit-elle.

## Une donnée absente se dit « non mesuré », jamais « aucun résultat »

Fautif  : « Aucun résultat : votre site n'apparaît nulle part dans Bing. »
Juste   : « La visibilité de ce site chez Bing n'a pas pu être mesurée aujourd'hui, faute d'accès à la console. Ce n'est pas une absence de résultat, c'est une vérification à refaire. »

L'écart entre « Bing n'a pas répondu » et « votre site n'a pas de visibilité » est celui d'un client qui panique pour rien.

## Une mesure prise sur un accès tout neuf se date au lieu de s'affirmer

Ce cas mérite son exemple à lui : il est arrivé le premier jour et se reproduira à chaque nouveau client.

Contexte : la propriété Search Console de ce site a été vérifiée le jour de l'audit.
Le rapport technique classe en Critique une page « inconnue de Google ».

Fautif  : « Une de vos pages est invisible sur Google. »
Juste   : « Une de vos pages n'a pas encore été explorée par Google. La connexion à
           Search Console date d'aujourd'hui, c'est probablement un simple délai.
           À revérifier au prochain point. »

La sévérité du rapport technique est une convention de catalogue, pas une traduction directe en inquiétude client.

## Le client n'est jamais mis en cause

Fautif  : « Votre ancien prestataire a laissé le site sans balises correctes. »
Juste   : « Plusieurs pages n'ont pas encore de description ; les ajouter est la prochaine étape. »

On décrit l'état du site, pas les erreurs de son prestataire précédent.

## Relecture adversariale avant de rendre

Avant d'afficher le chemin du rapport, relire son propre texte en cherchant cinq défauts précis, dans cet ordre.

1. **Un identifiant déclaré dans un `couvre:` dont le texte ne parle pas.** C'est le premier de la liste et le seul qu'aucune commande ne peut voir : la couverture que vérifie le lint est un pointage d'identifiant, pas une correspondance de contenu. Un rapport peut donc déclarer traiter une trouvaille dont il ne dit pas un mot, et le lint sort vert. Pour chaque identifiant déclaré, retrouver la phrase qui le porte. Si elle n'existe pas, l'écrire ; ne jamais retirer l'identifiant pour faire passer le lint, ce serait cacher au client une information qu'il paie.
2. Une affirmation qui va au-delà de la preuve.
3. Un terme technique non glosé.
4. Un passage qui submerge un débutant.
5. Une dramatisation.

Corriger avant de rendre.
