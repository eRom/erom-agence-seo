# Recette du chantier 7 : soumettre le sitemap et les URL aux moteurs

Cible : `commentchercherbonheur.org` (CHICO). Recette lancée le 2026-09-02.

Le dossier client est ignoré par git : toutes les commandes partent du checkout
principal `/Users/recarnot/dev/erom-agence-seo/clients/commentchercherbonheur.org`
en pointant le script du worktree par chemin absolu.

## Étape 0 : le refus de scope, fenêtre non rejouable

Scope du jeton ADC juste avant la commande, confirmé en lecture seule :

```
email cloud-platform userinfo.email webmasters.readonly openid
```

Commande :

```bash
cd /Users/recarnot/dev/erom-agence-seo/clients/commentchercherbonheur.org && source ~/.zshenv && \
  bun /Users/recarnot/dev/erom-seo-chantier-7/plugin/skills/console/scripts/console.ts update
```

Sortie réelle (code de sortie 1) :

```
site      : https://www.commentchercherbonheur.org (demandé : commentchercherbonheur.org)
sitemap   : https://www.commentchercherbonheur.org/sitemap.xml (10 URL, 1 ramenée(s) sur l'origine servie)
google    : Search Console a refusé, scope insuffisant
  ce jeton n'a pas le droit d'écrire dans Search Console. Relance :
    gcloud auth application-default login --scopes=openid,https://www.googleapis.com/auth/userinfo.email,https://www.googleapis.com/auth/cloud-platform,https://www.googleapis.com/auth/webmasters
  Ce scope couvre aussi toutes les lectures : rien d'autre ne change. Voir references/acces.md, ACC-07.
bing      : sitemap https://www.commentchercherbonheur.org/sitemap.xml soumis pour https://commentchercherbonheur.org/
indexnow  : 200 OK, URL reçues (10 URL)
```

**Verdict : conforme.** Le refus Google nomme la cause et donne la commande complète
qui répare, avec le renvoi à ACC-07. Le code de sortie 1 remonte bien l'échec partiel
alors que deux moteurs sur trois ont abouti.

Observations à porter plus loin :

1. **Bing a accepté un sitemap en `www` pour un site déclaré en apex** sans broncher.
   C'est exactement le cas que la note de reprise voulait voir. La ligne rendue dit
   « soumis », mais `bingSubmitFeed` traite tout HTTP 200 comme un succès sans lire le
   champ `ErrorCode` du corps. **Ce « soumis » n'est donc pas encore une preuve** : le
   corps brut reste à capturer avant de conclure.
2. `indexnow` est parti pour de vrai, 200 OK sur 10 URL.
3. Le rabattage d'origine a touché 1 URL sur 10 (dette connue `urlsOnOrigin`).

## Étape 0 bis : ce que compte vraiment `deplacees: 1`

Les 10 `<loc>` du sitemap de prod sont toutes sur `https://www.commentchercherbonheur.org`.
Aucune URL d'un domaine étranger. La seule URL réécrite est la racine :

```
AVANT: "https://www.commentchercherbonheur.org"
APRES: "https://www.commentchercherbonheur.org/"
```

Cause : `rewriteToOrigin` (plugin/lib/url.ts:33) passe par `new URL(...).toString()`,
qui normalise la racine en ajoutant le slash final. `urlsOnOrigin` compare ensuite
`r !== u` et incrémente `moved`. **Le compteur mélange donc la normalisation et le vrai
rabattage de domaine.** Sur CHICO le rabattage ne se déclenche pas : rien d'inattendu ne part.

La dette nommée dans la note de reprise (une URL d'un domaine étranger serait réécrite en
silence) reste réelle mais n'est pas exercée ici. Reproduction :

```bash
cd /Users/recarnot/dev/erom-seo-chantier-7 && bun -e 'import { urlsOnOrigin } from "./plugin/lib/soumission"; console.log(urlsOnOrigin(["https://www.commentchercherbonheur.org"], "https://www.commentchercherbonheur.org"))'
```

## Étape 1 : élargir le scope Google

À lancer par Romain, ouvre un navigateur. **Non rejouable en arrière.**

```bash
gcloud auth application-default login --scopes=openid,https://www.googleapis.com/auth/userinfo.email,https://www.googleapis.com/auth/cloud-platform,https://www.googleapis.com/auth/webmasters
```

Fait le 2026-09-02. Scope du jeton ADC après relance, vérifié sans jamais afficher le jeton :

```
email cloud-platform userinfo.email webmasters openid
```

`auth/webmasters` sans le suffixe `.readonly`. **Conforme.**

## Étape 2 : dry-run puis envoi réel

Dry-run (`console update --dry-run`), code de sortie 0 :

```
mode      : simulation, aucune écriture ne part
sitemap   : https://www.commentchercherbonheur.org/sitemap.xml (10 URL, 1 ramenée(s) sur l'origine servie)
google    : le sitemap https://www.commentchercherbonheur.org/sitemap.xml partira vers sc-domain:commentchercherbonheur.org
bing      : le sitemap https://www.commentchercherbonheur.org/sitemap.xml partira pour https://commentchercherbonheur.org/
indexnow  : 10 URL partiront vers IndexNow
```

Google vise la propriété domaine `sc-domain:` alors que le sitemap est en `www` : cohérent,
une propriété domaine couvre tous les sous-domaines.

Envoi réel (`console update`, sans drapeau), code de sortie 0, le 2026-09-02 à 17:00 CEST :

```
site      : https://www.commentchercherbonheur.org (demandé : commentchercherbonheur.org)
sitemap   : https://www.commentchercherbonheur.org/sitemap.xml (10 URL, 1 ramenée(s) sur l'origine servie)
google    : sitemap https://www.commentchercherbonheur.org/sitemap.xml soumis à sc-domain:commentchercherbonheur.org
bing      : sitemap https://www.commentchercherbonheur.org/sitemap.xml soumis pour https://commentchercherbonheur.org/
indexnow  : 200 OK, URL reçues (10 URL)
```

## Étape 3 : les trois réponses réelles, désormais observées

### 3.1 Succès du PUT Google : CONFIRMÉ par relecture côté API

Le rendu ne suffit pas comme preuve, donc relecture indépendante de la liste des sitemaps
de la propriété (`GET /webmasters/v3/sites/sc-domain:.../sitemaps`) :

```
path          : https://www.commentchercherbonheur.org/sitemap.xml
lastSubmitted : 2026-09-02T15:00:01.440Z
lastDownloaded: 2026-09-02T15:00:02.227Z
isPending: False | errors: 0 | warnings: 0
contents      : [{'type': 'web', 'submitted': '10', 'indexed': '0'}]
```

Google a téléchargé le sitemap 787 ms après l'avoir reçu, sans erreur ni avertissement.
`indexed: 0` n'est pas un signal : ce champ est déjà consigné comme menteur.

**Piège de recette rencontré.** La relecture à la main échoue en 403 si l'on s'appuie sur le
`quota_project_id` de l'ADC : ce projet-là n'a pas l'API Search Console activée. Le plugin ne
l'utilise pas, il lit `GSC_QUOTA_PROJECT` depuis `~/.zshenv` (`plugin/lib/auth-google.ts:57`).
Toute vérification manuelle doit donc envoyer `x-goog-user-project: $GSC_QUOTA_PROJECT`.

### 3.2 `SubmitFeed` avec un sitemap www sur un site connu en apex : AUCUN PROBLÈME

Les deux formes ont été appelées avec le même `feedUrl` en `www` :

```
siteUrl https://commentchercherbonheur.org/      -> HTTP 200, corps {"d":null}
siteUrl https://www.commentchercherbonheur.org/  -> HTTP 200, corps {"d":null}
```

Et `GetFeeds` renvoie **le même feed unique pour les deux `siteUrl`** :

```
Url       : https://www.commentchercherbonheur.org/sitemap.xml
UrlCount  : 10        FileSize : 2381        Status : Pending
Submitted   : 2026-09-02T15:01:20Z
LastCrawled : 2026-09-02T15:00:02Z
```

Bing unifie donc apex et www sur cette propriété. Le mélange www / apex que la spec redoutait
n'est pas un problème sur cette cible.

### 3.3 Corps brut de la réponse Bing : `{"d":null}`

Le corps d'un succès ne porte **pas** de champ `ErrorCode`. Le raccourci de `bingSubmitFeed`
(`plugin/lib/soumission.ts`, `if (r.status === 200) return ok` sans lire le corps) rend donc
le **bon** verdict sur ce cas.

**Nuance à ne pas arrondir.** Cette observation prouve qu'un succès Bing est bien un succès ;
elle ne prouve pas que Bing ne renvoie jamais un refus dans un corps en 200. Le raccourci
reste une faiblesse théorique non exercée, et aucun refus en 200 n'a été observé au cours de
cette recette. Reproduction du contrôle :

```bash
cd /Users/recarnot/dev/erom-seo-chantier-7 && source ~/.zshenv && bun -e 'const k=process.env.BING_WMT_API_KEY; const r=await fetch(`https://ssl.bing.com/webmaster/api.svc/json/GetFeeds?${new URLSearchParams({apikey:k,siteUrl:"https://commentchercherbonheur.org/"})}`); console.log(r.status, await r.text());'
```

## Bilan

| Contrôle | Verdict |
|---|---|
| Refus de scope lisible et réparable | conforme |
| Élargissement du scope Google | conforme (`auth/webmasters`) |
| Dry-run fidèle à l'envoi réel | conforme |
| PUT sitemap Google | confirmé par relecture API |
| SubmitFeed Bing www / apex | confirmé, aucune ambiguïté |
| IndexNow 10 URL | 200 OK |
| Code de sortie (1 en échec partiel, 0 en succès) | conforme |

**Non vérifié, assumé comme tel :**

- **AC-7** (titre de plus de 65 caractères) : aucune cible réelle du portefeuille ne dépasse
  65 au 02/09, le test ne tourne que sur le site jouet.
- **Rôle Owner par API** : non tranché, aucun client en Full user n'a été appelé.
- **Refus Bing dans un corps HTTP 200** : jamais observé, donc la robustesse de
  `bingSubmitFeed` sur ce cas reste non démontrée.

**Défaut mineur trouvé pendant la recette, hors périmètre :** le compteur `deplacees` de
`urlsOnOrigin` incrémente sur la simple normalisation du slash final, et affichera donc
« 1 ramenée » à chaque lancement sur un sitemap parfaitement sain. Cosmétique, mais
inquiétant à la lecture.
