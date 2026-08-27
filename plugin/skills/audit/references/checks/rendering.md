# Rendu

Contexte pour Claude : `derived/pages.json` → `textChars` (texte visible hors scripts) et `htmlBytes`. Les bots de récupération IA lisent le HTML brut ; Google recommande le rendu serveur parce que tous les bots n'exécutent pas JavaScript.

### REND-01 : contenu principal présent sans JavaScript
Couche     : absolue
Niveau     : 0
Sévérité   : Important
Vérifie    : le HTML brut de chaque page contient son contenu ; une coquille vide remplie par JavaScript est une trouvaille.
Comment    : derived/pages.json → ignorer les pages challenge === true (protection anti-bot : à signaler en Info « collecte bloquée », jamais en REND-01). Sur les autres : textChars < 200 avec htmlBytes > 5000, ou h1 vide et title générique (« App », « Loading ») = trouvaille. Preuve : raw/pages/<slug>.html.
Source     : https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics « server-side or pre-rendering is still a great idea because it makes your website faster for users and crawlers, and not all bots can run JavaScript. »
Étude      : https://vercel.com/blog/the-rise-of-the-ai-crawler « The results consistently show that none of the major AI crawlers currently render JavaScript. » (Vercel, 17 décembre 2024, étude et non documentation officielle)
Correctif  : rendu serveur ou pré-rendu des pages qui doivent être citées.
Effort     : lourd
