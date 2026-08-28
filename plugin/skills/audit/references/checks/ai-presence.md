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
Couche     : stratégique
Niveau     : 0
Sévérité   : Mineur
Vérifie    : la clé IndexNow déclarée dans strategy.md est servie à la racine du site, avec la clé pour contenu.
Comment    : derived/strategy-eval.json → indexnow : declared null (« IndexNow : non » dans la stratégie) = trouvaille « aucune clé prévue » ; declared présent et contentMatches true = passée ; sinon trouvaille, citer status et le contenu de raw/indexnow.txt s'il existe. Sans strategy.md : non vue.
Source     : https://www.indexnow.org/documentation « You must host a UTF-8 encoded text key file {your-key}.txt listing the key in the file at the root directory of your website. »
Correctif  : générer une clé (8 à 128 caractères, lettres, chiffres, tirets), la déclarer dans strategy.md, la servir en /<clé>.txt, la soumettre à Bing.
Effort     : rapide
