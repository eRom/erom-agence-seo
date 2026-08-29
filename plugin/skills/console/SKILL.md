---
name: console
description: Lit l'état des consoles Google Search Console et Bing Webmaster Tools depuis le terminal, sans ouvrir un onglet, et sans rien écrire : quelles propriétés et quels accès, quel sitemap est arrivé et ce qu'il en dit, si une URL est indexée et sous quel canonical Google l'a retenue, ce que Bing voit passer. Triggers : '/erom-seo:console', 'est-ce que cette page est indexée', 'quel canonical Google a retenu', 'j'ai bien accès à la Search Console de ce client', 'mon sitemap est-il arrivé', 'qu'est-ce que Bing voit'.
argument-hint: "[sites | inspect <url> | crawl] [--site <url>] [--json]"
---

# Console : lire Search Console et Bing Webmaster Tools

Le verbe `console` lit, il n'agit pas. Aucune écriture, aucun fichier posé sur disque : ni sitemap soumis, ni URL inspectée en écriture, ni case cochée. Pour agir (soumettre le sitemap chez Bing, pinger IndexNow), c'est `/erom-seo:checklist --agir`. Ce n'est pas non plus un audit : pas de `raw/`, pas de rapport daté sur disque. Pour une preuve datée, c'est `/erom-seo:audit`. `console` sert entre les deux : une lecture immédiate, à l'écran, quand on veut savoir où on en est sans naviguer dans deux consoles web.

## 1. Situer

Trois commandes, jamais plus d'une par appel :

- `console sites` : les propriétés Search Console visibles par le compte, avec leur rôle et leurs sitemaps ; les sites du compte Bing, avec leur vérification et leurs flux.
- `console inspect <url>` : l'état d'indexation de cette URL sur Google (verdict, couverture, canonical) et ce que Bing en sait.
- `console crawl [--site <url>]` : les statistiques et erreurs de crawl Bing pour le site (Google n'expose rien ici par API). Sans `--site`, le site vient de `seo/strategy.md` du répertoire courant.

`--json` sur les trois commandes rend la vue structurée plutôt que le texte.

**Toujours lancer `console sites` en premier quand une autre commande échoue** : c'est elle qui montre les propriétés réellement visibles, leurs noms exacts et les rôles, donc ce qui explique un refus sur `inspect` ou `crawl`.

## 2. Vérifier l'accès

Trois variables d'environnement, aucune obligatoire à elle seule mais Google en réclame une des deux premières :

- `GSC_QUOTA_PROJECT` : projet de quota Google Cloud, utilisé avec un jeton `gcloud auth application-default login`. Sans elle, l'authentification gcloud échoue avant même d'atteindre Search Console.
- `GSC_SA_KEY_FILE` : chemin vers la clé JSON d'un compte de service. Présente, elle prend le pas sur gcloud et rend `GSC_QUOTA_PROJECT` inutile.
- `BING_WMT_API_KEY` : clé API Bing Webmaster Tools. Absente, la moitié Bing de chaque commande répond « non interrogé (clé absente) » et la moitié Google continue seule.

Le détail des clics pour obtenir chacun de ces accès (créer une propriété, ajouter un utilisateur, générer la clé Bing, basculer sur un compte de service) est dans `references/acces.md`.

## 3. Lire

Chaque commande accepte l'échec d'un moteur sans faire échouer l'autre : Google en erreur n'empêche pas Bing de répondre, et réciproquement. Un blanc n'apparaît jamais ; un moteur muet écrit sa raison.

Les codes de sortie, pour qui enchaîne les commandes en script :

- `console sites` sort en 1 si ni Google ni Bing n'ont répondu.
- `console inspect` sort en 1 si aucune propriété Search Console ne couvre l'URL donnée (peu importe ce que Bing a répondu) : sans propriété résolue, l'inspection Google n'est jamais partie.
- `console crawl` sort en 1 si Bing n'a rien pu être lu (aucune donnée de crawl, Google n'en fournit pas par API).

## 4. Restituer

Quand `inspect` montre un `canonical retenu par Google` différent du `canonical déclaré` (attention affichée à l'écran), Google a choisi une autre URL que celle marquée `rel=canonical` sur la page : les deux versions se font concurrence pour le même contenu, et c'est Google qui tranche, pas le site. Voir IDX-04 (une seule version d'hôte servie) dans l'audit : la cause la plus fréquente d'un tel écart est justement une variante d'hôte (www et apex) qui répond toutes les deux en 200 au lieu que l'une redirige vers l'autre.

Pas d'écriture, pas de rapport : tout ce que `console` produit tient dans la sortie du terminal.
