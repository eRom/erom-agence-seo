# Accès aux consoles : Search Console et Bing Webmaster Tools

Une entrée par geste nécessaire pour que `console` retrouve un compte, une propriété ou un site. Même forme que les recettes de `build` et de `consoles.md` : `Chemin` (les clics, dans l'ordre), `Piège`, `Source` (URL officielle et citation mot pour mot, retrouvée par `check-sources.ts`). Les pages d'aide de Bing Webmaster Tools sont des applications JavaScript : citées sans `Source:`, à relire à la main. Sources vérifiées le 29/08.

### Google : ajouter un utilisateur à une propriété (ACC-01)
Chemin   : ouvrir la propriété dans Search Console, Paramètres, Utilisateurs et autorisations, Ajouter un utilisateur, saisir l'adresse, choisir le rôle, Enregistrer.
Piège    : le rôle Restreint ne permet pas de soumettre un sitemap.
Source   : https://support.google.com/webmasters/answer/7687615 « Open the Users and permissions page in property settings »
Source   : https://support.google.com/webmasters/answer/7687615 « Owner: Has full control over properties in Search Console. »

### Google : les deux sortes de propriété (ACC-02)
Chemin   : créer une propriété Domaine (vérification par enregistrement TXT chez le registrar, hôte vide ou @) ou une propriété Préfixe d'URL.
Piège    : l'API exige le nom exact rendu par `sites.list`, `sc-domain:exemple.fr` ou `https://exemple.fr/` ; `console` le résout depuis la liste et ne le fabrique jamais (D33).
Source   : https://support.google.com/webmasters/answer/9008080 « For TXT records, a Search Console verification record looks something like »

### Google : autorisation de l'API et scope de lecture (ACC-03)
Chemin   : rien à cliquer, c'est le jeton qui porte le scope ; `console` demande `webmasters.readonly` pour ses trois lectures. La commande `update` a besoin du scope d'écriture, voir ACC-07.
Source   : https://developers.google.com/webmaster-tools/v1/how-tos/authorizing « Your application must use OAuth 2.0 to authorize requests. No other authorization protocols are supported. »

### Google : basculer vers un compte de service (ACC-04)
Chemin   : créer un projet dans Google Cloud, activer l'API Search Console dessus, créer un compte de service, télécharger sa clé JSON, la ranger hors du dépôt, poser `GSC_SA_KEY_FILE` dans `~/.zshenv`, puis faire ajouter l'adresse du compte de service par le client comme utilisateur de sa propriété (ACC-01).
Piège    : `GSC_QUOTA_PROJECT` devient inutile avec un compte de service. Avec gcloud elle est obligatoire : absente, le verbe s'arrête avant tout appel réseau avec la consigne à suivre ; posée sur un projet où l'API Search Console n'est pas activée, Google répond 403 `SERVICE_DISABLED` et nomme le projet fautif.
Source   : https://developers.google.com/identity/protocols/oauth2/service-account « RSA using SHA-256 hashing algorithm. This is expressed as RS256 in the alg field in the JWT header. »
Source   : https://developers.google.com/identity/protocols/oauth2/service-account « a maximum of 1 hour after the issued time »

### Bing : une clé par utilisateur, pas par site (ACC-05)
Chemin   : Bing Webmaster Tools, Settings, API Access, générer la clé, la poser dans `~/.zshenv`.
Piège    : une seule clé existe par compte, en générer une nouvelle tue l'ancienne (incident du 28/08) ; ne jamais demander la clé d'un client, elle ouvre tous ses sites en écriture.
Source   : https://learn.microsoft.com/en-us/bingwebmaster/getting-access « the API key is generated for a user and not a site »

### Bing : déléguer un site en lecture seule au compte de l'agence (ACC-06)
Chemin   : côté client, Bing Webmaster Tools, écran Users, ajouter l'adresse de l'agence en lecture seule (page d'aide : https://www.bing.com/webmasters/help/how-to-add-users-to-your-site-account-d5d00364). Ajouter et vérifier le site en amont, si ce n'est pas déjà fait : https://www.bing.com/webmasters/help/add-and-verify-site-12184f8b.
Piège    : ces deux pages d'aide sont des applications JavaScript ; `check-sources.ts` ne peut vérifier aucune citation dessus, elles apparaissent donc ici en clair, sans ligne `Source:`.
Source   : https://learn.microsoft.com/en-us/dotnet/api/microsoft.bing.webmaster.api.interfaces.iwebmasterapi.addsiteroles « Delegate site access to user »

### Obtenir le droit d'écrire dans Search Console (ACC-07)
Chemin   : le jeton par défaut de `gcloud auth application-default login` ne porte que la lecture. Pour que `console update` puisse soumettre un sitemap, relancer une fois : `gcloud auth application-default login --scopes=openid,https://www.googleapis.com/auth/userinfo.email,https://www.googleapis.com/auth/cloud-platform,https://www.googleapis.com/auth/webmasters`. Le scope `webmasters` couvre `webmasters.readonly` : aucune lecture ne se perd.
Piège    : le scope suffit à parler à l'API, pas forcément à soumettre. Le rôle exigé par `sitemaps.submit` n'est écrit nulle part : la documentation API demande seulement « appropriate access (owner, full, read) », et la page d'aide qui exige Owner parle du rapport Sitemaps de l'interface web, pas de l'API. Sur un site client où l'agence est Full user, tester une fois : si Google refuse, le sitemap se déclare dans robots.txt, ou se soumet par le propriétaire.
Piège    : ce même scope autorise `sitemaps.delete`, `sites.add` et `sites.delete`. Le plugin n'implémente aucune des trois, volontairement (D51). Le pouvoir est dans le jeton, pas dans le code.
Source   : https://developers.google.com/webmaster-tools/v1/sitemaps/submit « Submits a sitemap for a site. »
Source   : https://developers.google.com/webmaster-tools/about « You must have appropriate access (owner, full, read) to any Google Search Console account that you wish to access using the API. »
