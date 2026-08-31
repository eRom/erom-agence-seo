---
name: console
description: Lit l'état des consoles Google Search Console et Bing Webmaster Tools depuis le terminal, sans ouvrir un onglet, et soumet aux deux moteurs quand on le lui demande : quelles propriétés et quels accès, quel sitemap est arrivé et ce qu'il en dit, si une URL est indexée et sous quel canonical Google l'a retenue, ce que Bing voit passer, et l'envoi du sitemap plus le POST IndexNow après une mise en production. Triggers : '/erom-seo:console', 'est-ce que cette page est indexée', 'quel canonical Google a retenu', 'j'ai bien accès à la Search Console de ce client', 'mon sitemap est-il arrivé', 'qu'est-ce que Bing voit', 'soumets le sitemap', 'préviens les moteurs', 'on vient de déployer', 'signale cette page aux moteurs'.
argument-hint: "[sites | inspect <url> | crawl | update] [--site <url>] [--url <u>]... [--dry-run] [--json]"
---

# Console : lire Search Console et Bing Webmaster Tools

Le verbe `console` lit, et il agit sur une seule commande, `update`, qui prévient les moteurs qu'un site a bougé. Les trois autres commandes n'écrivent rien : ni fichier posé sur disque, ni requête d'écriture. Ce n'est pas un audit : pas de `raw/`, pas de rapport daté. Pour une preuve datée, c'est `/erom-seo:audit`.

`/erom-seo:checklist --agir` est le rituel de mise en ligne, joué une fois, qui coche des cases dans `seo/checklist.md`. `console update` est le geste répétable d'après chaque publication suivante, sans état à tenir à jour. Les deux passent par le même code de soumission, `plugin/lib/soumission.ts`.

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
- `console inspect` sort en 1 si aucune propriété Search Console ne couvre l'URL donnée, ou si une propriété a été résolue mais que ni Google ni Bing n'ont répondu (jeton refusé et clé Bing absente, par exemple).
- `console crawl` sort en 1 si Bing n'a rien pu être lu (aucune donnée de crawl, Google n'en fournit pas par API).

## 4. Restituer

Quand `inspect` montre un `canonical retenu par Google` différent du `canonical déclaré` (attention affichée à l'écran), Google a choisi une autre URL que celle marquée `rel=canonical` sur la page : les deux versions se font concurrence pour le même contenu, et c'est Google qui tranche, pas le site. Voir IDX-04 (une seule version d'hôte servie) dans l'audit : la cause la plus fréquente d'un tel écart est justement une variante d'hôte (www et apex) qui répond toutes les deux en 200 au lieu que l'une redirige vers l'autre.

Pas d'écriture, pas de rapport : tout ce que `console` produit tient dans la sortie du terminal.

## 5. Soumettre

`console update` fait partir trois choses, chacune indépendante de l'échec des deux autres :

- le sitemap chez Google (`sitemaps.submit`), sur la propriété qui couvre le site, résolue et jamais fabriquée ;
- le sitemap chez Bing (`SubmitFeed`), sur le site tel que le compte Bing le nomme ;
- les URL du sitemap chez IndexNow, qui les relaie aux six autres moteurs participants. **Google n'en fait pas partie** : aucun POST IndexNow ne le prévient, seul le sitemap le fait.

**Toujours dans cet ordre, sans exception :**

1. Lancer `console update --dry-run` et montrer la sortie à Romain.
2. Attendre son OK explicite.
3. Relancer sans `--dry-run`.

Le dry-run joue toutes les lectures, y compris le contrôle de la clé IndexNow servie, et n'émet aucune écriture. Sauter cette étape parce que « ça a marché la dernière fois » est exactement le geste que cette consigne interdit.

Pour signaler une page qui vient de changer sans retoucher les sitemaps : `console update --url https://<site>/la-page`, répétable. C'est le geste courant après le lancement, quand le sitemap ne bouge pas mais qu'une page a été réécrite. Le même ordre s'y applique : dry-run d'abord, OK de Romain ensuite, envoi enfin.

Le premier refus attendu la première fois est le scope : le jeton par défaut de gcloud ne sait que lire. Le message donne la commande exacte à relancer, elle est aussi dans `references/acces.md`, ACC-07.

Ce que `update` ne fait pas : demander l'indexation d'une URL (l'API ne l'expose pas, seule l'interface web le fait, avec un quota quotidien), ajouter une propriété, ni retirer quoi que ce soit.
