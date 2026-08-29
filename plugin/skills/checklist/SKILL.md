---
name: checklist
description: Avant et après le déploiement d'un site, tient à jour seo/checklist.md, quinze cases avec leur preuve : audit vert, branche fusionnée, hors build, consoles Google et Bing, prod revérifiée par un audit, redirections d'un ancien site, ping IndexNow et sitemap chez Bing (avec accord), jalons J+1 à J+90. Ne déploie rien. Triggers : '/erom-seo:checklist', 'on déploie, qu'est-ce qui manque', 'checklist de mise en ligne', 'c'est en ligne, et maintenant', 'où en est le suivi SEO'.
argument-hint: "[--mise-en-ligne AAAA-MM-JJ] [--ancien-sitemap <url ou fichier>]"
---

# Checklist SEO/GEO, avant et après le déploiement

Tu tiens à jour `seo/checklist.md`. Tu ne déploies rien et tu ne lances rien : le déploiement est le geste de Romain. Tu ne juges pas la prod toi-même : l'audit juge. Tu n'envoies rien dehors (IndexNow, Bing) sans avoir dit ce qui va partir et attendu le OK.

## 0. Préparer

1. Répertoire courant : le repo du site. `seo/strategy.md` absent : proposer `/erom-seo:strategy` et s'arrêter. `Statut : brouillon` : le dire, continuer.
2. Scripts : `${CLAUDE_PLUGIN_ROOT}/skills/checklist/scripts/`. Si `${CLAUDE_PLUGIN_ROOT}/node_modules` manque : `cd ${CLAUDE_PLUGIN_ROOT} && bun install --frozen-lockfile`.
3. Lire `seo/checklist.md` s'il existe : la date de mise en ligne, les cases cochées. Lire `${CLAUDE_PLUGIN_ROOT}/skills/checklist/references/consoles.md` en entier : c'est de là que viennent les chemins de clics de la restitution.
4. Clé Bing : `[ -n "$BING_WMT_API_KEY" ] && echo présente || echo absente`. Jamais `echo $BING_WMT_API_KEY`, jamais la clé dans une commande affichée. Absente : le dire une fois (« la ligne Bing restera à la main »), continuer.

## 1. Situer

Si le fichier n'existe pas ou porte « Mise en ligne : non », une seule question : « c'est déployé ? ».
- Non : rien d'autre à demander, on remplit la moitié « Avant ».
- Oui : demander la date (défaut : aujourd'hui, format AAAA-MM-JJ) et, si `seo/checklist/ancien-sitemap.xml` n'existe pas, « ancien site à rediriger ? » (réponse : l'URL de son sitemap, un fichier, ou non). Ces réponses deviennent `--mise-en-ligne` et `--ancien-sitemap`.
Le fichier existe avec une date : rien à demander, sauf si Romain passe une nouvelle date (elle remet la moitié « Après » à zéro, actions comprises : le dire).

## 2. Auditer la prod

Si la mise en ligne est posée et qu'aucun `seo/audits/<date>-n0*/report.md` daté d'aujourd'hui n'existe : invoquer la skill `/erom-seo:audit https://<site>` (`<site>` = titre de `seo/strategy.md`). Elle écrit le rapport et le passe au lint. Sans mise en ligne : rien, le dernier audit niveau 2 suffit.

## 3. Écrire

`bun ${CLAUDE_PLUGIN_ROOT}/skills/checklist/scripts/checklist.ts [--mise-en-ligne <date>] [--ancien-sitemap <url ou fichier>]`, sans `--agir`. Première ligne de la sortie : `fichier : seo/checklist.md` ; deuxième : `checklist : n/15 cochées · mise en ligne : … · dû aujourd'hui : …`. Chaque ligne `attention :` de la sortie d'erreur est répétée à Romain telle quelle. Exit 1 : montrer l'erreur, s'arrêter (le fichier n'a pas été réécrit).

## 4. Agir

Lire le fichier écrit. Si « Ping IndexNow » ou « Sitemap soumis à Bing » porte « à faire : relance avec --agir » :
1. Dire exactement ce qui va partir, en une ligne par action : « ping IndexNow : <n> URL du sitemap de <hôte>, clé <clé> » (la clé IndexNow est publique, servie à la racine du site) ; « sitemap <url> soumis à Bing Webmaster Tools pour <site tel que Bing le nomme> ».
2. Attendre le OK de Romain. Refus : ne rien relancer ; noter « refusé par Romain le <date> » dans la restitution (le fichier garde « à faire »).
3. OK : relancer la même commande qu'en 3 avec `--agir` en plus. Relire le fichier : chaque action porte maintenant sa date et sa réponse, ou son code d'erreur. Une action déjà cochée n'est jamais refaite.
« en attente : … » sur une action : ce n'est pas à toi de le lever, c'est une case à la main (Bing pas configuré, aucun audit prod) : le dire en restitution.

## 5. Restituer

Dans l'ordre, une liste par point, jamais un tableau (Romain lit sur mobile) :
1. Le chemin du fichier et la ligne `checklist : …`.
2. Ce qui est dû aujourd'hui (les jalons échus non cochés) : pour chacun, le chemin de clics de `consoles.md`, en trois lignes maximum.
3. Les cases `main` encore vides de la moitié courante, avec leur consigne (et les sous-lignes : hors build avec leur « ou », pages à inspecter).
4. Les cases `auto` vides et leur raison, telle quelle (« aucun audit prod depuis la mise en ligne », « tu es sur seo-build-…, fusionne d'abord », les URL de l'ancien site en défaut).
5. Les actions faites (date, réponse) ou refusées.
6. La suite : « relance `/erom-seo:checklist` le <prochaine date J+n> » ; ou, si tout est coché jusqu'au J+90, « chantier 5 : niveau 1 ». Rappeler que rien n'a été déployé ni poussé par la skill.

## 6. Règles d'écriture

Français, phrases courtes, aucun tiret cadratin. Ne jamais éditer `seo/checklist.md` à la main dans ce flux : tout passe par le script ; pour cocher une case `main` que Romain dit avoir faite, remplacer `- [ ]` par `- [x]` sur cette seule ligne, puis relancer le script. Ne jamais modifier `seo/audits/*/raw/`. Ne jamais afficher `BING_WMT_API_KEY`.
