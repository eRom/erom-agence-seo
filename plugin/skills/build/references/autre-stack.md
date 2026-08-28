# Hors Next.js

Contexte pour Claude : pas de recette dédiée en v1. La cible est le même HTML de sortie que celui décrit dans `nextjs.md` ; seul le chemin pour y arriver change.

1. Trouver où vivent : la balise `<head>` (title, description, canonical, robots meta), le robots.txt, le sitemap, les pages (fichiers ou gabarits), le layout racine (`lang`), les fichiers statiques à la racine (pour la clé IndexNow). Lire le README et les scripts de `package.json` avant de chercher.
2. Appliquer chaque trouvaille dans les mêmes termes que `nextjs.md` : canonical absolu et auto-référent sur l'hôte observé ; title et description propres à chaque page (valeurs validées) ; JSON-LD Organization sur la home avec le bloc du plan ; un h1 par page avec le mot-clé ; `lang` de la stratégie ; clé IndexNow servie à la racine ; robots.txt et sitemap sur l'hôte observé, avec de vraies dates.
3. Un stack qui rend les pages côté client (SPA) ne passe pas REND-01 sans rendu serveur ou prérendu : le dire, ne pas bricoler.
4. Le reste de la procédure (table validée, un commit par trouvaille, audit niveau 2) ne change pas. Le serveur de dev est celui du projet (`bun run dev` ou l'équivalent de son README).

Cas connus : Astro (`src/pages/*.astro`, `<head>` dans un layout, `@astrojs/sitemap`), WordPress (thème enfant, `wp_head`, extension SEO ; le niveau 2 exige un WordPress local), site statique (fichiers HTML, tout à la main).
