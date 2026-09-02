## Task 6: La procédure et la référence d'accès

**Files:**
- Modify: `plugin/skills/console/SKILL.md`
- Modify: `plugin/skills/console/references/acces.md`
- Test: `plugin/skills/console/scripts/tests/acces.test.ts` (le test de format existant couvre la nouvelle entrée)

**Interfaces:** aucune, ce sont des documents lus par le modèle.

- [ ] **Step 1: Ajouter ACC-07 à la référence d'accès**

Dans `plugin/skills/console/references/acces.md`, ajouter une entrée au format exact des six autres (`### Titre (ACC-nn)` avec `Chemin`, `Piège`, `Source`) :

```markdown
### Obtenir le droit d'écrire dans Search Console (ACC-07)
Chemin   : le jeton par défaut de `gcloud auth application-default login` ne porte que la lecture. Pour que `console update` puisse soumettre un sitemap, relancer une fois : `gcloud auth application-default login --scopes=openid,https://www.googleapis.com/auth/userinfo.email,https://www.googleapis.com/auth/cloud-platform,https://www.googleapis.com/auth/webmasters`. Le scope `webmasters` couvre `webmasters.readonly` : aucune lecture ne se perd.
Piège    : le scope suffit à parler à l'API, pas forcément à soumettre. Le rôle exigé par `sitemaps.submit` n'est écrit nulle part : la documentation API demande seulement « appropriate access (owner, full, read) », et la page d'aide qui exige Owner parle du rapport Sitemaps de l'interface web, pas de l'API. Sur un site client où l'agence est Full user, tester une fois : si Google refuse, le sitemap se déclare dans robots.txt, ou se soumet par le propriétaire.
Piège    : ce même scope autorise `sitemaps.delete`, `sites.add` et `sites.delete`. Le plugin n'implémente aucune des trois, volontairement (D51). Le pouvoir est dans le jeton, pas dans le code.
Source   : https://developers.google.com/webmaster-tools/v1/sitemaps/submit « Submits a sitemap for a site. »
Source   : https://developers.google.com/webmaster-tools/about « You must have appropriate access (owner, full, read) to any Google Search Console account that you wish to access using the API. »
```

**La citation Owner que le plan portait d'abord était tronquée d'une manière qui la retournait.** La phrase entière de `support.google.com/webmasters/answer/7451001` est : « You must have owner permissions on a property to submit a sitemap **using the Sitemaps report**. If you don't have owner permissions, you can list the sitemap in your robots.txt file instead. » Le fragment « using the Sitemaps report » désigne l'interface web. Couper là transformait une règle d'interface en règle d'API, et `check-sources.ts` l'aurait validée sans broncher puisque le fragment existe bel et bien sur la page. C'est le seul défaut de ce plan qu'aucune commande n'aurait attrapé.

- [ ] **Step 2: Corriger ACC-03, qui dit l'inverse**

`references/acces.md:17` (ACC-03) affirme aujourd'hui : « `console` demande toujours `webmasters.readonly`, donc une soumission de sitemap lui est refusée par construction. » Cette phrase devient fausse à l'instant où ACC-07 existe. La remplacer par : « `console` demande `webmasters.readonly` pour ses trois lectures. La commande `update` a besoin du scope d'écriture, voir ACC-07. »

- [ ] **Step 3: Vérifier que les deux citations sont retrouvées**

```bash
cd /Users/recarnot/dev/erom-seo-chantier-7/plugin && bun skills/audit/scripts/check-sources.ts
```

Attendu : les deux nouvelles citations passent en `OK`, aucun `ÉCHEC` neuf. `support.google.com` répond 404 en HEAD et 200 en GET : le script est déjà en GET, c'est un piège connu du 29/08.

Si la citation `sitemaps/submit` n'est pas retrouvée (la page est rendue en JavaScript), la basculer en `[manuel]` en fin de ligne, comme les deux entrées Bing de `consoles.md` :

```markdown
Source   : https://developers.google.com/webmaster-tools/v1/sitemaps/submit « Submits a sitemap for a site. » [manuel]
```

- [ ] **Step 4: Ajouter le cinquième temps à la skill**

Dans `plugin/skills/console/SKILL.md`, réécrire le paragraphe d'ouverture qui affirme aujourd'hui « Le verbe `console` lit, il n'agit pas », puis ajouter la section. Le paragraphe devient :

```markdown
Le verbe `console` lit, et il agit sur une seule commande, `update`, qui prévient les moteurs qu'un site a bougé. Les trois autres commandes n'écrivent rien : ni fichier posé sur disque, ni requête d'écriture. Ce n'est pas un audit : pas de `raw/`, pas de rapport daté. Pour une preuve datée, c'est `/erom-seo:audit`.
```

Et la section neuve, après le temps 4 :

```markdown
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

Pour signaler une page qui vient de changer sans retoucher les sitemaps : `console update --url https://<site>/la-page`, répétable. C'est le geste courant après le lancement, quand le sitemap ne bouge pas mais qu'une page a été réécrite.

Le premier refus attendu la première fois est le scope : le jeton par défaut de gcloud ne sait que lire. Le message donne la commande exacte à relancer, elle est aussi dans `references/acces.md`, ACC-07.

Ce que `update` ne fait pas : demander l'indexation d'une URL (l'API ne l'expose pas, seule l'interface web le fait, avec un quota quotidien), ajouter une propriété, ni retirer quoi que ce soit.
```

- [ ] **Step 5: Mettre à jour le frontmatter de la skill**

`SKILL.md` lignes 3 et 4 sont la surface de déclenchement de la skill, et aucun test ne les couvre. Après ce chantier, `description` affirme « sans rien écrire », ce qui est faux, et ne porte aucun déclencheur de soumission : « soumets le sitemap », « préviens les moteurs », « on vient de déployer » ne matcheraient rien. `argument-hint` ignore les trois nouveautés alors que la constante `USAGE` du script, elle, a été mise à jour en T4.

```yaml
description: Lit l'état des consoles Google Search Console et Bing Webmaster Tools depuis le terminal, sans ouvrir un onglet, et soumet aux deux moteurs quand on le lui demande : quelles propriétés et quels accès, quel sitemap est arrivé et ce qu'il en dit, si une URL est indexée et sous quel canonical Google l'a retenue, ce que Bing voit passer, et l'envoi du sitemap plus le POST IndexNow après une mise en production. Triggers : '/erom-seo:console', 'est-ce que cette page est indexée', 'quel canonical Google a retenu', 'j'ai bien accès à la Search Console de ce client', 'mon sitemap est-il arrivé', 'qu'est-ce que Bing voit', 'soumets le sitemap', 'préviens les moteurs', 'on vient de déployer', 'signale cette page aux moteurs'.
argument-hint: "[sites | inspect <url> | crawl | update] [--site <url>] [--url <u>] [--dry-run] [--json]"
```

- [ ] **Step 6: Vérifier le format de la référence**

```bash
cd /Users/recarnot/dev/erom-seo-chantier-7/plugin && bun test skills/console/scripts/tests/acces.test.ts
```

Attendu : vert. Le test valide la forme de chaque entrée ; il ne compte pas les entrées.

- [ ] **Step 7: Commit**

```bash
cd /Users/recarnot/dev/erom-seo-chantier-7 && git add plugin/skills/console/SKILL.md plugin/skills/console/references/acces.md
git commit -m "docs(console): le cinquieme temps, soumettre, et ACC-07

La skill impose dry-run, OK de Romain, puis envoi reel. Elle dit aussi que
Google ne participe pas a IndexNow : seul le sitemap le previent."
```

---

