# Reprise du 1er septembre : le chantier 7 attend sa recette

État au 31/08 à 20 h 40. Le code est fini et relu, il ne reste que la recette, et elle ne peut pas se faire sans toi.

## Où est le travail

**Worktree** `/Users/recarnot/dev/erom-seo-chantier-7`, branche `chantier-7-soumission`, 16 commits, **547 tests verts**. Ton `main` n'a pas bougé, rien n'est fusionné, rien n'est poussé.

Le dossier client `clients/commentchercherbonheur.org/` est ignoré par git : il n'existe **que** dans le checkout principal. Toute commande de recette se lance donc depuis là, en pointant le script du worktree par son chemin absolu.

```bash
CLIENT=/Users/recarnot/dev/erom-agence-seo/clients/commentchercherbonheur.org
CONSOLE=/Users/recarnot/dev/erom-seo-chantier-7/plugin/skills/console/scripts/console.ts
```

## Le premier geste, et il ne se rejoue pas

**Tant que ton jeton Google est encore en lecture seule**, une commande à lancer avant tout le reste. C'est la seule fenêtre pour vérifier que le message de refus donne bien la commande qui répare. Elle ne peut rien casser : Google refuse avant tout effet.

```bash
cd /Users/recarnot/dev/erom-agence-seo/clients/commentchercherbonheur.org && source ~/.zshenv && \
  bun /Users/recarnot/dev/erom-seo-chantier-7/plugin/skills/console/scripts/console.ts update ; echo "code $?"
```

Attendu : la ligne `google` porte le refus de scope et la commande `gcloud` complète. Les lignes `bing` et `indexnow`, elles, partent pour de vrai. Coller la sortie dans la recette.

## Puis, dans l'ordre

**1. Élargir le scope Google.** À lancer par toi, ça ouvre un navigateur :

```bash
gcloud auth application-default login --scopes=openid,https://www.googleapis.com/auth/userinfo.email,https://www.googleapis.com/auth/cloud-platform,https://www.googleapis.com/auth/webmasters
```

Vérifier ensuite sans jamais afficher le jeton :

```bash
source ~/.zshenv && T=$(gcloud auth application-default print-access-token) && \
  curl -s "https://oauth2.googleapis.com/tokeninfo?access_token=$T" | python3 -c "import sys,json; print(json.load(sys.stdin).get('scope'))"
```

Attendu : `auth/webmasters` sans le suffixe `.readonly`.

**2. Le dry-run**, montré avant tout envoi. Puis la même commande sans le drapeau, après ton OK.

**3. Les trois réponses réelles à capturer**, aucune n'a jamais été observée : le succès du PUT Google, le comportement de `SubmitFeed` quand Bing connaît le site en apex alors que le sitemap est sur le www, et le corps brut de la réponse Bing (pas seulement la ligne rendue : `bingSubmitFeed` traite tout HTTP 200 comme un succès sans lire le champ `ErrorCode`, alors que Bing sait renvoyer un refus dans un corps en 200).

Le détail complet des huit étapes est la tâche 8 du plan : `docs/superpowers/plans/2026-08-31-erom-seo-chantier-7-soumission.md`.

## Ce qui reste ouvert, et qui n'est pas bloquant

- **AC-7 ne sera pas vérifié sur cible réelle.** Aucun site du portefeuille ne dépasse 65 caractères de titre au 31/08 : CHICO au plus long 58 (`/institut`), `romain-ecarnot.com` 58, `lebonpote` 55. Le test tourne sur le site jouet. À consigner comme non vérifié plutôt qu'à arrondir au vert.
- **La source Bing de TAG-05 a été retirée.** Le dépôt exige une citation de plus de 15 caractères et « Titre trop long » en fait exactement 15. L'incident daté reste dans le champ `Comment`. Le jour où tu copies le libellé complet du Site Scan à l'écran, ça redevient une vraie ligne `Source`.
- **Le rôle Owner par API n'est documenté nulle part.** Google écrit seulement « appropriate access (owner, full, read) ». Chez un client où l'agence est Full user, un appel réel tranchera en une commande.
- **Deux dettes nommées, hors périmètre** : `bingUserSites` existe en deux exemplaires au comportement différent (celui de `lib/bing.ts` lit `ErrorCode` avant le code HTTP, celui de `lib/soumission.ts` non) ; et `urlsOnOrigin` réécrit sur l'origine servie même une URL d'un domaine étranger. Les deux sont antérieures ou intouchables sans casser les 44 tests de `checklist`.

## Après la recette

Mettre à jour `_memory_/architecture.md` et `_memory_/key-files.md`, qui disent encore que `console` est en lecture seule et que `gsc.ts` n'écrira jamais. Puis fusionner.

## Les décisions prises pendant l'exécution

26, chacune avec son coût si elle est fausse, dans `/Users/recarnot/dev/erom-seo-chantier-7/.superpowers/sdd/2026-08-31-erom-seo-chantier-7-soumission/progress.md`. Les trois qui méritent ton regard : deux tâches du plan fusionnées parce que leur ordre cassait trois tests existants, deux tests convertis parce qu'ils figeaient un compte en dur, et la revue de branche avancée avant la recette plutôt qu'après.
