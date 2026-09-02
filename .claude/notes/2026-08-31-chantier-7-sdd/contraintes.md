# Contraintes qui lient toutes les tâches du chantier 7

Elles viennent de la spec, du plan et du dépôt lui-même. Elles s'appliquent à chaque tâche sans être répétées dans son brief.

## Le dépôt

- **Bun 1.4.0**, TypeScript, `bun:test`. Aucune dépendance ne s'ajoute à `plugin/package.json` : le chantier n'en a pas besoin.
- **Pas de tsconfig, pas de linter.** Bun exécute le TypeScript directement. Le seul garde-fou mécanique est `bun test`, donc il compte double : un import au mauvais nombre de niveaux ne se voit qu'à l'exécution.
- **Toute commande part d'un chemin absolu.** Le répertoire courant d'un shell survit entre deux appels et ce dépôt a un paquet imbriqué (`plugin/`), donc deux racines plausibles. Chaque commande qui écrit, teste ou versionne commence par `cd /Users/recarnot/dev/erom-seo-chantier-7` ou `cd /Users/recarnot/dev/erom-seo-chantier-7/plugin`.
- **Le travail se fait dans le worktree** `/Users/recarnot/dev/erom-seo-chantier-7`, branche `chantier-7-soumission`. Jamais de `git switch`, jamais de `git checkout` d'une autre branche, jamais de commande sur `/Users/recarnot/dev/erom-agence-seo`.
- **Jamais `rm`, `rmdir` ni `unlink`.** Pour supprimer : `trash <chemin>`.

## L'architecture

- **`plugin/lib/` ne dépend d'aucune skill.** Un module du commun qui importe depuis `skills/` est une erreur de conception. Vérifiable : `command grep -rn 'from ".*skills/' plugin/lib/*.ts` ne doit rien rendre (une recherche sur le seul mot `skills/` remonte aussi des commentaires de provenance, qui ne sont pas des imports).
- **Le nombre de niveaux dans les imports relatifs se compte.** Depuis `skills/<nom>/scripts/lib/`, le commun est à `../../../../lib/`. Depuis `skills/<nom>/scripts/`, il est à `../../../lib/`. Le dépôt a déjà payé cette erreur.
- **Les modules purs restent purs.** Le réseau et le disque entrent par un paramètre, jamais par un appel direct depuis une fonction de `lib/`. C'est ce qui rend « aucune requête ne part » testable.

## La langue et la forme

- **Aucun tiret cadratin**, nulle part : code, commentaires, messages, documentation, messages de commit. Le dépôt le refuse et un lint le vérifie sur les rapports.
- **Les commentaires et les messages sont en français**, comme tout le dépôt. Les identifiants métier aussi (`verifierCleServie`) ; l'anglais est gardé pour ce qui reprend un nom d'API (`submitSitemap`, `pingIndexNow`).
- **Un commentaire dit pourquoi, pas quoi.** Le style du dépôt commente les décisions et les pièges, jamais la ligne d'en dessous.
- **Les messages de commit** suivent la convention en place : `type(portee): sujet en minuscules`, puis un corps qui explique la décision. Pas d'accent dans le corps du message de commit, c'est l'usage du dépôt.

## Les secrets

- **Aucun secret affiché.** La clé Bing passe par `redact`, le jeton Google par `assertNoSecret`. La clé IndexNow est publique par construction, servie à la racine du site : elle s'affiche, c'est même tout son mécanisme.
- **Ne jamais lire une clé avec les yeux.** Read comme Bash masquent toute chaîne de 32 caractères hexadécimaux : ce qui s'affiche est `[REDACTED:env_secret]`, et un implémenteur qui recopie ce qu'il voit écrit le masque dans le source. Pour vérifier la présence d'une valeur : `command grep -c -F`.
- **Aucune valeur de test en 32 caractères hexadécimaux.** Utiliser des chaînes reconnaissables : `cle-bing-test`, `jeton-de-test-non-hex`, `clepublique`.

## Les tests

- **Par invariant, jamais par instantané.** Interdits par nom : figer un compte d'entrées de catalogue (« le catalogue contient 36 vérifications »), asserter sur le texte du source (« le fichier contient telle chaîne »), calibrer un mock sur une convention jamais capturée en vrai.
- **Un test assère un comportement.** « Chaque entrée du catalogue a une sévérité » est un invariant ; « il y a 36 entrées » casse à la première addition légitime et ne prouve rien.
- **Aucune assertion existante ne change.** Si un test du dépôt échoue après une modification, c'est la modification qui a dérivé, pas le test. Le corriger, jamais ajuster l'assertion. C'est le critère AC-6 du chantier.
- **La sortie des tests est propre.** Pas d'avertissement résiduel, pas de bruit.

## La discipline d'implémentation

- **Faire exactement ce que la tâche demande.** Pas de fonctionnalité en plus, pas d'abstraction pour un seul usage, pas de configuration spéculative, pas de gestion défensive d'états internes impossibles.
- **Chirurgical.** Ne toucher que ce que la tâche exige. Ne pas refactorer le code voisin. Signaler un problème vu ailleurs dans le rapport, sans le corriger.
- **Suivre les motifs en place.** Ce dépôt a des conventions fortes et lisibles : les lire dans les fichiers voisins avant d'écrire.
