---
name: build
description: Corrige le SEO/GEO d'un site dans son code à partir de seo/strategy.md et du dernier audit : plan des trouvailles, textes validés par Romain, un commit par trouvaille, puis audit niveau 2 en boucle jusqu'à zéro Critique et zéro Important. Next.js App Router d'abord. Triggers : '/erom-seo:build', 'corrige le SEO du site', 'applique la stratégie au code', 'fais passer l'audit au vert', 'implémente les trouvailles de l'audit'.
argument-hint: "[--audit <dossier>]"
---

# Build SEO/GEO

Tu corriges le code du site pour qu'un audit niveau 2 frais n'ait plus ni Critique ni Important. Tu ne juges jamais toi-même : l'audit juge. Tu n'écris jamais un texte visible sans qu'il ait été validé (étape 2). Tu ne pousses jamais.

## 0. Préparer

1. Répertoire courant : le repo du site. `seo/strategy.md` absent : proposer `/erom-seo:strategy` et s'arrêter. `bun ${CLAUDE_PLUGIN_ROOT}/skills/strategy/scripts/lint-strategy.ts seo/strategy.md` non nul : afficher les erreurs et s'arrêter. `Statut : brouillon` : le dire, continuer.
2. `git status --porcelain` non vide : s'arrêter et demander de commiter ou de ranger (build commite par trouvaille, il ne mélange pas). Noter le commit de départ : `git rev-parse --short HEAD`. Branche `main` ou `master` : `git switch -c seo-build-<AAAA-MM-JJ>` ; autre branche : y rester. Jamais de push.
3. Stack : `next` dans `package.json` (dependencies ou devDependencies) : lire `${CLAUDE_PLUGIN_ROOT}/skills/build/references/nextjs.md` en entier ; sinon `references/autre-stack.md`. Le dossier `app/` est `src/app/` si le projet a un dossier `src`.
4. Scripts : `${CLAUDE_PLUGIN_ROOT}/skills/build/scripts/`. Si `${CLAUDE_PLUGIN_ROOT}/node_modules` manque : `cd ${CLAUDE_PLUGIN_ROOT} && bun install --frozen-lockfile`.
5. Aucun `seo/audits/*/report.md` : faire d'abord l'étape 4 (un audit), puis reprendre à l'étape 1. Compteur de passages : 0.

## 1. Planifier

`bun ${CLAUDE_PLUGIN_ROOT}/skills/build/scripts/plan.ts [--audit <dossier>]`. Première ligne : `dossier : <audit>` ; lire `<audit>/derived/build-plan.json` en entier. Chaque ligne `attention :` de la sortie d'erreur est répétée à l'utilisateur telle quelle.

Le plan porte : `findings` (ouvertes, triées Critique puis Important puis Mineur, genre `code`, `texte` ou `hors-build`, `ou` pour les hors build), `pages` (par page prévue : `current`, `missing`, `textes` requis), `organization` (à coller tel quel), `indexnow.file`, `canonicalBase.origin` (l'hôte réellement servi : c'est lui qui va dans metadataBase, robots, sitemap, canonical).

## 2. Valider les textes

Si aucune page n'a de `textes` : passer à l'étape 3. Sinon, pour chaque page dont `textes` n'est pas vide, proposer les quatre champs, les requis marqués, l'actuel en face, une liste par page (jamais un tableau, Romain lit sur mobile) :

```
/telekinesie · mot-clé « télékinésie » · requis : title, h1, ouverture
  title       : Télékinésie : la méthode MindBridge 6Ge
                actuel : L'Institut C.H.I.C.O. | Optimisation Quantique de l'Ego
  description : …
                actuel : …
  h1          : …
                actuel : MINDBRIDGE 6Ge
  ouverture   : …
                actuel : …
```

Règles : mot-clé principal au début du title (la marque vient du `template` du layout racine, ne pas la répéter) ; title et description uniques par page ; description qui reprend le mot-clé et une secondaire ; h1 unique avec le mot-clé, dans le ton du site ; première phrase qui reprend le mot-clé. Guides, pas limites : ~60 caractères pour le title, ~155 pour la description. Aucune modification de fichier avant le OK. Romain répond OK ou amende (par page, par champ) ; boucler jusqu'au OK. Second passage : ne présenter que les pages non encore validées.

## 3. Appliquer

Dans l'ordre de `findings`. Trouvaille `hors-build` : rien, gardée pour l'étape 6. Pour chaque `code` ou `texte` :

1. Lire le bloc de la référence qui porte son id, puis les fichiers visés. Déjà conforme : noter « déjà conforme », passer.
2. Modifier. Règle texte : le h1 et la première phrase sont remplacés par les valeurs validées ; l'ancien h1 et l'ancienne phrase disparaissent. Rien d'autre n'est touché ni supprimé : pas un autre paragraphe, un lien, une image, une classe. Bloc Organization : `organization` du plan, tel quel. Hôte : `canonicalBase.origin`, partout.
3. `bun x tsc --noEmit` si `tsconfig.json` existe. Échec : corriger avant de commiter.
4. Commit : `git add <fichiers>` puis `git commit -m "seo(IDX-02): canonical absolu et auto-référent sur chaque page"`. Une modification qui règle plusieurs ids porte tous les ids : `seo(SD-02, STRAT-02, STRAT-03): bloc Organization sur la home`. Le commit des textes : `seo(TAG-01, TAG-02, TAG-03, STRAT-01): title, description, h1 et ouverture, textes validés par Romain le <date>`.

Après la dernière : `bun run build`. Échec : montrer l'erreur ; corriger si elle vient d'une modification de build, sinon s'arrêter (commits gardés, rien n'est défait).

## 4. Vérifier

1. Serveur. `curl -s --max-time 5 http://localhost:3000/robots.txt` : s'il répond avec une ligne `Sitemap:` sur l'hôte de la stratégie (apex et www confondus), c'est le serveur de dev de Romain sur ce repo : l'utiliser, port 3000, ne pas l'éteindre. Sinon : premier port libre entre 3456 et 3466 (`lsof -i :<port>` vide), puis en arrière-plan `bun run dev --port <port> > "$TMPDIR/erom-seo-dev.log" 2>&1 &` en notant le pid (`echo $!`). Attendre : `curl --retry 30 --retry-delay 2 --retry-connrefused --retry-all-errors -s -o /dev/null -w '%{http_code}' --max-time 120 http://localhost:<port>/robots.txt`, puis la même commande sur `/`. Pas de 200 : éteindre ce qu'on a lancé, dire « je ne peux pas lancer le serveur : lance `bun run dev`, puis `/erom-seo:audit http://localhost:3000` », donner le chemin du journal, passer à l'étape 6.
2. Audit : invoquer la skill `/erom-seo:audit http://localhost:<port>`. Elle écrit `seo/audits/<date>-n2*/report.md` et le passe au lint.
3. Éteindre le serveur lancé par build (`kill <pid>`), jamais celui de Romain.

## 5. Boucler

Passages + 1. `bun ${CLAUDE_PLUGIN_ROOT}/skills/build/scripts/plan.ts` (sans `--audit` : le dernier audit, celui qui vient d'être écrit) ; la ligne `plan :` donne les comptes. Critique + Important > 0 et passages < 2 : retour à l'étape 1 avec ce plan. Sinon : étape 6.

## 6. Restituer

Dans l'ordre : chemin du dernier rapport et sa ligne « En bref » ; les commits (`git log --oneline <commit de départ>..HEAD`) ; les « déjà conforme » ; les hors build, chacun avec son `ou` (ceux du premier plan aussi, même si l'audit local les a marqués non applicables) ; les textes refusés ; ce qui reste en Critique ou Important après deux passages. Proposer la suite : régler les hors build, puis `/erom-seo:checklist`. Dire la branche, et que rien n'est poussé.

## 7. Règles d'écriture

Français, phrases courtes, aucun tiret cadratin dans ce qui va dans le code (title, description, JSON-LD) ni dans les commits. Aucun texte visible inventé hors de la table validée. Ne jamais modifier `seo/audits/*/raw/`.
