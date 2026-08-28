# Pièges (mis à jour le 2026-08-28)

**Sessions et outillage**
- Checkout partagé : jamais `git switch` ni `checkout` dans `/Users/recarnot/dev/erom-agence-seo` ; une session déléguée qui l'a fait a basculé la session mère sur sa branche (28/08). Délégation = worktree frère.
- Le cwd du shell dérive : après un `cd plugin && bun test`, le `git add` suivant échoue en pathspec depuis `plugin/` (vu deux fois le 28/08). Chemins absolus et `git -C` partout.
- Sous-agent reviewer muet : en subagent-driven, un reviewer peut passer idle sans verdict et bloquer 3 h ; borner l'attente dans le brief (10 min reviewer, 20 min implémenteur), vérifier `git log` de la branche déléguée plutôt que croire « busy ». [candidat 1x - chantier 3, 28/08]
- Les skills se chargent au démarrage : relancer `claude --plugin-dir …` après modification du plugin (« Unknown command » sinon).
- Un test qui importe un `*.test.ts` fait rejouer ses tests par bun : les fixtures vivent dans `fixtures/*.ts`.
- `bun install` n'est jamais fait dans un worktree neuf : premier `bun test` en échec `Cannot find package` (28/08, deux fois).
- Les greps d'em dash ont des faux positifs légitimes : les tests contiennent le caractère en littéral.

**Audit**
- Sitemap listé en apex sur un site en www vidait la collecte en silence : `sameSite` (apex et www confondus, port compris), URLs jamais réécrites au niveau 0 ; `--max-pages N` = N pages (plafond `maxUrls`, pas `N-1`).
- Niveau 2 : un hôte tiers listé dans le sitemap est réécrit comme l'hôte de prod (tradeoff D14, parqué).
- `latestAuditDir` ignore un dossier d'audit sans `report.md` (chico a deux n2 collectés sans rapport) ; tri par date du nom, puis mtime, puis nom numérique (`-9` avant `-10`).
- `el.text` de node-html-parser colle les blocs (« AcmeAcme ») : `structuredText`. Un sigle à points (« C.H.I.C.O. ») se normalise en « chico » par la règle des sigles de `normalizeText`.
- HTML minifié : la preuve « fichier + lignes » ne marche pas, citer le champ `derived/` (parqué, chantier 1). IDX-04 ne dit rien du cas 307 (parqué).
- Lint du rapport : en-tête sur les trois premières lignes (`Niveau n`, `Couche stratégique : oui|non`, `N vérifications` égal au nombre attendu).

**Stratégie et clés**
- `source ~/.zshenv` avant toute commande à clé ; vérifier une clé avec `[ -n "$VAR" ] && echo présente`, jamais l'afficher (fuite du 28/08, clé Bing régénérée par Romain). `keywords.ts` refuse d'écrire un secret sur disque (`assertNoSecret`).
- Bing Webmaster : endpoint JSON `GetKeywordStats` ; SOAP/POX retirés le 31/08/2026, sonde à rejouer le 1er septembre (`docs/recherches/2026-08-27-mots-cles-gratuits.md`). `InvalidApiKey` après régénération = `~/.zshenv` pas à jour.
- Wikimedia Pageviews mensuel : 12 mois pleins, fin = dernier jour du mois précédent.
- Collecter un concurrent depuis le dossier du client : `--strategy-path none`, sinon la stratégie du client pollue la collecte.

**Build et Next.js 16**
- `metadata` ne s'exporte que d'un composant serveur : page « use client » = `layout.tsx` de segment.
- `metadataBase`, sitemap, robots doivent porter l'hôte réellement servi : chico a l'apex dans le code et répond en www (307 apex vers www, réglage Vercel, hors build).
- `alternates.canonical: "/"` dans le layout racine donne le canonical de la home à toutes les pages qui ne le redéfinissent pas.
- Next.js sur Vercel n'émet pas `Last-Modified` (chico, 28/08) : fraîcheur = date visible + `dateModified` JSON-LD.
- `bun run dev --port N` transmet le port à `next dev` (prêt en 1 s sur chico) ; `bun x tsc --noEmit` passe en 2 s.
- Turbopack avertit « multiple lockfiles » à cause d'un `package-lock.json` dans `/Users/recarnot/` ; sans rapport avec le projet. [candidat 1x - chico, 28/08]
- `check-sources.ts` : une citation qui contient un code inline collé à une ponctuation échoue après retrait des balises (« ( /) », « non- www ») ; choisir une autre phrase de la même page, jamais assouplir.
