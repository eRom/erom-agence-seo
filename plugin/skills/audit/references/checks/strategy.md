# Couche stratégique

Contexte pour Claude : `derived/strategy-eval.json`, écrit par `strategy-eval.ts` quand `seo/strategy.md` existe et s'analyse. Sans ce fichier, les cinq vérifications de cette couche (STRAT-01 à STRAT-04, AI-02) vont dans « Ce que je n'ai pas pu voir » avec la raison « pas de seo/strategy.md » ou « seo/strategy.md inanalysable : <défauts> ». La stratégie est un engagement pris avec le client ; ces vérifications disent si le site le tient.

### STRAT-01 : chaque page prévue existe et vise son mot-clé
Couche     : stratégique
Niveau     : 0
Sévérité   : Important
Vérifie    : chaque ligne du tableau « Pages ↔ mots-clés » correspond à une page collectée en 200 dont le title, le h1 et l'ouverture (400 premiers caractères) contiennent le mot-clé principal, selon la règle des mots (minuscules, sans accents, mots vides ignorés).
Comment    : derived/strategy-eval.json → pages[] : found false = trouvaille (page absente ou hors 200), sauf si challenge vrai ; challenge vrai = non vue pour cette page (jamais une trouvaille), même si found est faux ; inTitle, inH1 ou inOpening false = trouvaille, citer lesquels. Un seul bloc STRAT-01 qui liste les pages en défaut, une ligne par page « /chemin : mot-clé « … » absent du title, du h1 » avec la valeur lue. Toutes les pages found et placées = passée.
Source     : https://developers.google.com/search/docs/appearance/title-link « Write descriptive and concise text for your <title> elements. »
Source     : https://developers.google.com/search/docs/appearance/title-link « Consider ensuring that your main heading is distinctive from other text on a page and stands out as being the most prominent on the page (for example, using a larger font, putting the title text in the first visible <h1> element on the page, etc). »
Correctif  : title et h1 qui portent le mot-clé principal, ouverture qui le reprend dans la première phrase ; page manquante : la créer selon la stratégie.
Effort     : moyen

### STRAT-02 : la phrase d'identité est sur la home et dans Organization
Couche     : stratégique
Niveau     : 0
Sévérité   : Important
Vérifie    : la phrase d'identité de strategy.md apparaît dans le texte visible de la home et dans Organization.description ; Organization.name est le Nom de l'entité.
Comment    : derived/strategy-eval.json → identity : onHome false = trouvaille ; organizationPresent false = trouvaille « aucun bloc Organization sur la home, la phrase n'a nulle part où vivre » (SD-02 porte déjà l'absence du bloc, STRAT-02 porte la phrase) ; inOrganization false = trouvaille ; nameMatches false = trouvaille (citer organizationName et expectedName). Tout vrai = passée.
Source     : https://developers.google.com/search/docs/appearance/structured-data/organization « The name of your organization. »
Source     : https://developers.google.com/search/docs/appearance/structured-data/organization « A detailed description of your organization, if applicable. »
Correctif  : la phrase dans le premier bloc de texte de la home ; Organization.name et Organization.description alignés sur strategy.md.
Effort     : rapide

### STRAT-03 : les sameAs prévus sont en place
Couche     : stratégique
Niveau     : 0
Sévérité   : Mineur
Vérifie    : chaque URL sameAs de strategy.md figure dans Organization.sameAs de la home.
Comment    : derived/strategy-eval.json → sameAs[] : une entrée present false = trouvaille, lister les URLs manquantes ; tableau vide (aucun sameAs prévu) = non vue « aucun sameAs prévu dans la stratégie » ; toutes present = passée.
Source     : https://developers.google.com/search/docs/appearance/structured-data/organization « The URL of a page on another website with additional information about your organization, if applicable. For example, a URL to your organization's profile page on a social media or review site. You can provide multiple sameAs URLs. »
Correctif  : ajouter les URLs manquantes à Organization.sameAs sur la home.
Effort     : rapide

### STRAT-04 : la cadence de fraîcheur est respectée par page
Couche     : stratégique
Niveau     : 0
Sévérité   : Mineur
Vérifie    : pour chaque page prévue avec une cadence, la date de mise à jour la plus récente connue (dateModified, Last-Modified, date visible) est plus récente que la cadence promise.
Comment    : derived/strategy-eval.json → pages[] : cadenceRespected false = trouvaille, citer la page, la cadence et lastKnownDate ; toutes null (aucune date exploitable ou cadence « aucune ») = non vue « aucune date exploitable sur les pages prévues » (FRESH-01 porte l'absence de dates) ; le reste = passée. La cadence est l'engagement de la stratégie, pas une règle de Google : la source dit comment Google estime une mise à jour, ce qui rend cet engagement visible.
Source     : https://developers.google.com/search/docs/appearance/publication-dates « That's why our systems look at several factors to determine our best estimate of when a page was published or significantly updated. »
Source     : https://developers.google.com/search/docs/appearance/publication-dates « We recommend that you add a subtype of CreativeWork (such as Article, BlogPosting, or VideoObject), and specify the datePublished and/or dateModified fields. »
Correctif  : mettre à jour le contenu à la cadence promise et propager la date : visible, dateModified en JSON-LD, en-tête Last-Modified.
Effort     : moyen

### STRAT-05 : les requêtes réelles contre le mot-clé visé
Couche     : stratégique
Niveau     : 1
Sévérité   : Important
Vérifie    : chaque page de strategy.md ressort sur le mot-clé qu'elle vise, d'après les requêtes réelles des 90 derniers jours.
Comment    : derived/console.json → google : error ou searchError non nul = non vue, avec la raison (searchError couvre un échec propre à searchAnalytics, quota ou 5xx transitoire, quand la propriété reste par ailleurs accessible). Sinon strategy : par page, hasImpressions, keywordFound et topQueries. keywordFound true = passée. keywordFound false avec hasImpressions true = trouvaille, citer les topQueries. keywordFound null = la page n'a aucune impression sur la période : ce n'est pas un échec de stratégie, le dire comme une information distincte. Toujours donner la date de dernier jour de données (google.lastDataDate) : elle a environ trois jours de retard. Un lastDataDate nul avec searchError renseigné veut dire « données non récupérées », jamais « site sans trafic » : c'est déjà couvert par la garde ci-dessus, mais ne jamais l'écrire comme un lastDataDate normal. Si google.truncated est vrai, Google a coupé ses lignes au plafond de 1000 après tri par clics décroissants : les pages à impressions sans clic tombent en premier, exactement celles que cette vérification doit repérer. Dans ce cas, ne jamais conclure « aucune impression » (keywordFound null) pour une page de la stratégie absente des lignes reçues : la dire non vue, pas passée sans preuve ni trouvaille inventée.
Source     : https://developers.google.com/webmaster-tools/v1/searchanalytics/query « The method returns zero or more rows grouped by the row keys (dimensions) that you define. »
Correctif  : soit la page est réécrite vers le mot visé (title, h1, ouverture, voir STRAT-01), soit la stratégie adopte le mot sur lequel la page ressort déjà, si l'intention correspond.
Effort     : lourd
