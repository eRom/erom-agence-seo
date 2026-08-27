# Présence IA

Contexte pour Claude : `raw/manifest.json` → `llms.status`. Google écrit qu'il ignore les fichiers IA type llms.txt : leur présence n'est ni une faute ni un mérite, c'est du contexte.

### AI-01 : llms.txt, présent ou absent, sans effet sur Google
Couche     : absolue
Niveau     : 0
Sévérité   : Info
Vérifie    : signaler si /llms.txt existe, et rappeler qu'il n'a d'usage avéré que pour les agents de code et les plateformes de documentation.
Comment    : raw/manifest.json → llms.status === 200 : Info « présent » ; sinon Info « absent ». Jamais une trouvaille.
Source     : https://developers.google.com/search/docs/fundamentals/ai-optimization-guide « Doing so will neither harm nor help your site's visibility or rankings in Google Search, as Google Search ignores them. »
Correctif  : aucun. Pour un site à destination des développeurs, un llms.txt reste utile aux outils de code.
Effort     : rapide

### AI-02 : clé IndexNow déposée
Couche     : absolue
Niveau     : 2
Sévérité   : Mineur
Vérifie    : un fichier clé IndexNow est servi à la racine et son contenu correspond à la clé connue du projet.
Comment    : niveau 2 seulement : la clé est lue dans le repo, puis GET https://<hôte>/<clé>.txt doit répondre 200 avec la clé en contenu. Au niveau 0 : non vérifiable, le nom du fichier est la clé elle-même.
Source     : https://www.indexnow.org/documentation « You must host a UTF-8 encoded text key file {your-key}.txt listing the key in the file at the root directory of your website. »
Correctif  : générer une clé (8 à 128 caractères), la servir en /<clé>.txt, la soumettre à Bing.
Effort     : rapide
