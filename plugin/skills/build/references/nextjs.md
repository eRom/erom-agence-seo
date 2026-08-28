# Recettes Next.js 16, App Router

Contexte pour Claude : une recette par famille de trouvailles, les ids entre parenthèses dans le titre. Lire le bloc de l'id à corriger, puis le fichier visé, avant de modifier ; déjà conforme = on passe. Les valeurs (title, description, h1, ouverture) viennent de la table validée par Romain ; le bloc Organization vient de `derived/build-plan.json`, collé tel quel. Vérifié contre la doc Next.js 16.1.1 le 2026-08-28 (`docs/recherches/2026-08-28-nextjs-16-seo-api.md`). Le dossier `app/` est `src/app/` quand le projet a un dossier `src`.

## Pièges transverses

- `metadata` et `generateMetadata` ne s'exportent que d'un composant serveur. Une page « use client » : créer `layout.tsx` dans son segment (qui rend `children`) et y exporter `metadata`, ou faire de la page un composant serveur qui rend le composant client.
- `metadataBase` doit être l'hôte réellement servi (`canonicalBase.origin` du plan), pas celui qu'on croit : sinon canonical, sitemap et Open Graph pointent vers une variante qui redirige.
- Un champ objet (`openGraph`, `robots`, `alternates`) redéfini dans une page remplace tout l'objet du layout, il ne fusionne pas.
- `title.template` du layout racine ne s'applique pas au `title` de la page du même segment : la home garde `title.default`, ou un `title.absolute` dans `app/page.tsx`.
- `lastModified: new Date()` dans le sitemap est un signal faux : Google ignore un lastmod qu'il ne peut pas vérifier. Une vraie date, ou rien.
- `Last-Modified` n'est pas émis par Next.js sur Vercel (vérifié sur chico le 28/08 : etag et cache-control seulement) : le double signal de fraîcheur est la date visible plus `dateModified` en JSON-LD.
- `robots.other` (directives non standard) exige Next.js 16.3 ; en 16.1, s'en passer.
- Après chaque modification : `bun x tsc --noEmit` ; avant l'audit : `bun run build`.

### robots.ts (ROBOTS-01, ROBOTS-02, ROBOTS-03, ROBOTS-04, ROBOTS-05, ROBOTS-06)
Fichiers : app/robots.ts ; jamais un public/robots.txt en parallèle
Recette  : un seul fichier, l'hôte observé dans la ligne Sitemap.
```ts
import type { MetadataRoute } from "next";

const BASE = "https://www.acme.fr"; // canonicalBase.origin du plan

export default function robots(): MetadataRoute.Robots {
  // RFC 9309 : un bot n'obéit qu'au groupe le plus spécifique qui le nomme ; un groupe nommé n'hérite pas de « * ».
  const disallow = ["/dashboard/", "/checkout/"];
  return {
    rules: [{ userAgent: "*", allow: "/", disallow }],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
```
Piège    : ROBOTS-02 et ROBOTS-03 : ne jamais nommer un bot de récupération (OAI-SearchBot, ChatGPT-User, Claude-User, Claude-SearchBot, PerplexityBot, Perplexity-User) ni Googlebot ou bingbot dans un groupe qui les bloque ; retirer le groupe, ne pas ajouter un allow à côté. Bloquer l'entraînement (GPTBot, ClaudeBot, CCBot) reste un choix du client, sans effet sur la visibilité.
Piège    : ROBOTS-04 : Google-Extended est un jeton d'entraînement sans effet sur les AI Overviews ; le laisser ou le retirer selon le client, mais ne jamais présenter son retrait comme un gain de visibilité.
Piège    : ROBOTS-05 : la ligne Sitemap porte l'hôte observé (www si le site répond en www), pas l'apex du code de départ.
Piège    : ROBOTS-06 : un robots.txt en 5xx vient de l'hébergeur ou d'une route qui plante, pas de ce fichier : vérifier `bun run build`, puis l'hébergeur.
Source   : https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots « Add or generate a robots.txt file that matches the Robots Exclusion Standard in the root of app directory to tell search engine crawlers which URLs they can access on your site. »

### Directives robots par page (SNIP-01, SNIP-02, SNIP-03)
Fichiers : layout.tsx du segment à exclure (app/checkout/layout.tsx), ou page.tsx si elle est un composant serveur
Recette  : un noindex voulu vit dans le layout de son segment ; une page prévue par la stratégie n'en porte jamais.
```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
```
Piège    : SNIP-01 et SNIP-02 : retirer tout nosnippet et tout max-snippet bas sur une page prévue ; l'absence suffit, pas besoin de `max-snippet: -1`.
Piège    : SNIP-03 : un noindex posé dans le layout racine s'applique à tout le site ; le layout racine ne porte jamais `index: false`.
Source   : https://nextjs.org/docs/app/api-reference/functions/generate-metadata « This means metadata with nested fields such as openGraph and robots that are defined in an earlier segment are overwritten by the last segment to define them. »

### sitemap.ts (IDX-01)
Fichiers : app/sitemap.ts
Recette  : une entrée par page indexable, l'hôte observé, une vraie date ; les pages en noindex n'y figurent pas.
```ts
import type { MetadataRoute } from "next";

const BASE = "https://www.acme.fr"; // canonicalBase.origin du plan

// Dernière modification réelle de chaque page : date git du fichier de la page, relevée au build
// (git log -1 --format=%cI -- src/app/methode/page.tsx), écrite ici et mise à jour à chaque build.
const PAGES: { path: string; lastModified: string }[] = [
  { path: "/", lastModified: "2026-08-28" },
  { path: "/methode", lastModified: "2026-08-28" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map((p) => ({ url: p.path === "/" ? BASE : `${BASE}${p.path}`, lastModified: p.lastModified }));
}
```
Piège    : `changeFrequency` et `priority` n'apportent rien à Google ; les garder ne gêne pas, les inventer ne sert à rien.
Piège    : une URL du sitemap qui répond autre chose que 200 (redirection, 404) reste une trouvaille IDX-01 : retirer l'entrée ou corriger la page, jamais lister une URL qui redirige.
Source   : https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap « The <lastmod> value should reflect the date and time of the last significant update to the page. »
Source   : https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap « is a special file that matches the Sitemaps XML format to help search engine crawlers index your site more efficiently. »

### Canonical (IDX-02)
Fichiers : app/layout.tsx (metadataBase), puis chaque page.tsx prévue ou son layout.tsx de segment (alternates.canonical)
Recette  : metadataBase à la racine, un canonical relatif par page, résolu par Next.js.
```tsx
// app/layout.tsx
export const metadata: Metadata = {
  metadataBase: new URL("https://www.acme.fr"), // canonicalBase.origin du plan
};

// app/page.tsx (la home, composant serveur)
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

// app/methode/page.tsx (composant serveur) ou app/methode/layout.tsx
export const metadata: Metadata = {
  alternates: { canonical: "/methode" },
};
```
Piège    : ne pas poser `alternates.canonical: "/"` dans le layout racine : toute page qui ne le redéfinit pas hériterait du canonical de la home, ce qui est pire que rien. Chaque page prévue reçoit le sien.
Piège    : `metadataBase` en apex quand le site répond en www (ou l'inverse) rend un canonical qui redirige : c'est la trouvaille IDX-02, pas une correction.
Source   : https://nextjs.org/docs/app/api-reference/functions/generate-metadata « metadataBase is a convenience option to set a base URL prefix for metadata fields that require a fully qualified URL. »

### Vraie 404 (IDX-05)
Fichiers : app/not-found.tsx ; les routes dynamiques qui rendent une page « introuvable » en 200
Recette  : une page 404 dédiée, et `notFound()` dès qu'une donnée manque.
```tsx
// app/not-found.tsx
export default function NotFound() {
  return (
    <main>
      <h1>Page introuvable</h1>
      <p>Cette page n'existe pas ou n'existe plus.</p>
    </main>
  );
}

// app/articles/[slug]/page.tsx : une donnée absente déclenche la vraie 404
import { notFound } from "next/navigation";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) notFound();
  return <Article article={article} />;
}
```
Piège    : un segment fourre-tout (`[...slug]`) qui rend un gabarit pour n'importe quel chemin est la cause classique du soft 404 ; il doit appeler `notFound()` quand rien ne correspond.
Piège    : une réponse en flux (streaming, `loading.tsx` ou Suspense au-dessus) rend 200 même pour not-found ; une page 404 rendue d'un bloc rend le vrai code. La sonde de l'audit (`/erom-seo-probe-…`) lit ce code.
Source   : https://nextjs.org/docs/app/api-reference/file-conventions/not-found « The not-found file is used to render UI when the notFound function is thrown within a route segment. »
Source   : https://nextjs.org/docs/app/api-reference/file-conventions/not-found « Along with serving a custom UI, Next.js will return a 200 HTTP status code for streamed responses, and 404 for non-streamed responses »

### JSON-LD Organization sur la home (SD-02, STRAT-02, STRAT-03)
Fichiers : src/components/seo/JsonLd.tsx (nouveau, composant serveur), app/page.tsx (la home)
Recette  : le bloc est `organization` de derived/build-plan.json, collé tel quel (nom, url, description = la phrase d'identité, sameAs de la stratégie).
```tsx
// src/components/seo/JsonLd.tsx
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

// app/page.tsx
import { JsonLd } from "@/components/seo/JsonLd"; // adapter l'import au projet

const ORGANIZATION = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "L'Institut C.H.I.C.O.",
  url: "https://www.commentchercherbonheur.org/",
  description: "L'Institut C.H.I.C.O. est un site satirique qui …",
  sameAs: ["https://fr.tipeee.com/…", "https://x.com/…"],
};

export default function Home() {
  return (
    <>
      <JsonLd data={ORGANIZATION} />
      {/* le reste de la page */}
    </>
  );
}
```
Piège    : `<script>` natif, pas `next/script` (fait pour du JavaScript exécutable). `JSON.stringify` seul ne protège pas d'une injection : garder le `replace`.
Piège    : STRAT-02 se joue aussi dans le texte visible : la phrase d'identité doit être dans le premier bloc de texte de la home (valeur de la table validée) ; le bloc Organization seul ne la fait pas passer.
Piège    : STRAT-03 : `sameAs` contient exactement les URLs de la stratégie, ni plus (pas de profil vide) ni moins.
Source   : https://nextjs.org/docs/app/guides/json-ld « Our current recommendation for JSON-LD is to render structured data as a <script> tag in your layout.js or page.js components »
Source   : https://nextjs.org/docs/app/guides/json-ld « The following snippet uses JSON.stringify, which does not sanitize malicious strings used in XSS injection. »
Source   : https://developers.google.com/search/docs/appearance/structured-data/organization « The URL of a page on another website with additional information about your organization, if applicable. For example, a URL to your organization's profile page on a social media or review site. You can provide multiple sameAs URLs. »

### JSON-LD par page (SD-01, SD-03, FRESH-01, FRESH-02)
Fichiers : chaque page.tsx prévue (composant serveur), ou le layout.tsx de son segment
Recette  : WebPage par défaut, Article pour une page éditoriale ; dates depuis git ; une date visible qui dit la même chose.
```tsx
// app/methode/page.tsx (composant serveur)
import { JsonLd } from "@/components/seo/JsonLd";

// dates git du fichier, relevées au build :
//   datePublished : git log --diff-filter=A --follow --format=%cI -- src/app/methode/page.tsx | tail -1
//   dateModified  : git log -1 --format=%cI -- src/app/methode/page.tsx
const ARTICLE = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "La Méthode Quantique Chico", // le h1 validé
  description: "…", // la description validée
  datePublished: "2026-05-02",
  dateModified: "2026-08-28",
  author: { "@type": "Organization", name: "L'Institut C.H.I.C.O." },
  publisher: { "@type": "Organization", name: "L'Institut C.H.I.C.O." },
  mainEntityOfPage: "https://www.commentchercherbonheur.org/methode",
};

export default function MethodePage() {
  return (
    <>
      <JsonLd data={ARTICLE} />
      <main>
        {/* h1, ouverture, contenu */}
        <p>Mis à jour le <time dateTime="2026-08-28">28 août 2026</time></p>
      </main>
    </>
  );
}
```
Piège    : FRESH-02 : la date visible et `dateModified` disent le même jour ; Next.js sur Vercel n'émet pas Last-Modified, il reste deux signaux à aligner, pas trois.
Piège    : SD-03 : pas d'Article sur une page de service ou de tunnel (audit, newsletter, mentions légales) : `WebPage` suffit ; un type qui promet un contenu que la page n'a pas est pire que rien.
Piège    : une page « use client » peut rendre `<JsonLd>` mais pas exporter `metadata` ; le mieux reste de la découper (pièges transverses).
Source   : https://developers.google.com/search/docs/appearance/publication-dates « We recommend that you add a subtype of CreativeWork (such as Article, BlogPosting, or VideoObject), and specify the datePublished and/or dateModified fields. »
Source   : https://nextjs.org/docs/app/guides/json-ld « Our current recommendation for JSON-LD is to render structured data as a <script> tag in your layout.js or page.js components »

### Title et description (TAG-01, TAG-02)
Fichiers : app/layout.tsx (title.template, title.default, description de la home), puis chaque page.tsx prévue ou son layout.tsx de segment
Recette  : les valeurs viennent de la table validée, le template du layout racine ajoute la marque, la page ne donne que sa partie.
```tsx
// app/layout.tsx
export const metadata: Metadata = {
  metadataBase: new URL("https://www.acme.fr"),
  title: { template: "%s | Institut C.H.I.C.O.", default: "L'Institut C.H.I.C.O. : optimisation quantique de l'ego" },
  description: "…", // la description validée de la home
};

// app/telekinesie/page.tsx (composant serveur), sinon app/telekinesie/layout.tsx
export const metadata: Metadata = {
  title: "Télékinésie : la méthode MindBridge 6Ge", // rendu : « Télékinésie : la méthode MindBridge 6Ge | Institut C.H.I.C.O. »
  description: "…",
  alternates: { canonical: "/telekinesie" },
};
```
Piège    : une page « use client » (hooks, animations au niveau de la page) : créer `layout.tsx` dans son dossier, qui exporte `metadata` et rend `children` ; ne pas retirer « use client » de la page sans comprendre pourquoi il est là.
Piège    : la home ne reçoit pas le template : son title vient de `title.default`, ou d'un `title.absolute` dans app/page.tsx.
Source   : https://nextjs.org/docs/app/api-reference/functions/generate-metadata « The metadata object and generateMetadata function exports are only supported in Server Components. »
Source   : https://nextjs.org/docs/app/api-reference/functions/generate-metadata « title.template can be used to add a prefix or a suffix to titles defined in child route segments. »
Source   : https://nextjs.org/docs/app/api-reference/functions/generate-metadata « If you need to use Client Component features, keep your page.tsx as a Server Component and move the Client Component logic to a separate file »

### h1 et ouverture (TAG-03, STRAT-01)
Fichiers : le JSX de la page (page.tsx, ou le composant de section qu'elle rend en premier, par exemple Hero.tsx)
Recette  : remplacer le texte du h1 et la première phrase du premier paragraphe par les valeurs validées, sans toucher aux classes, aux balises, aux liens ni aux images. Une page sans h1 (TAG-03) en reçoit un, placé avant le premier paragraphe, dans le style des autres pages du site.
```tsx
<h1 className="text-5xl font-black uppercase">
  Télékinésie <span className="text-primary">pour débutants</span>
</h1>
<p className="text-gray-400">
  La télékinésie n'a jamais été démontrée, et c'est exactement pour ça que l'Institut la vend. Nos protocoles …
</p>
```
Piège    : le mot-clé doit apparaître avec chacun de ses mots entiers (règle des mots de l'audit : minuscules, sans accents, mots vides ignorés) ; un mot dans un `<span>` à l'intérieur du h1 compte, le texte est lu balises retirées.
Piège    : l'ouverture évaluée par l'audit = les 400 premiers caractères de `<main>` (sinon de `<body>`), en texte visible : un bandeau, une nav ou un ticker placés avant le h1 dans `<main>` mangent ce budget ; le mot-clé doit tenir dedans.
Piège    : un h1 par page ; un second h1 dans une section devient une trouvaille TAG-03 : le passer en h2.
Source   : https://developers.google.com/search/docs/appearance/title-link « Consider ensuring that your main heading is distinctive from other text on a page and stands out as being the most prominent on the page (for example, using a larger font, putting the title text in the first visible <h1> element on the page, etc). »

### Langue (TAG-04)
Fichiers : app/layout.tsx
Recette  : la langue de la stratégie (Cibles, Langue) sur la balise html.
```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
```
Piège    : `lang="en"` est la valeur du gabarit create-next-app, pas un choix ; la remplacer par celle de la stratégie.
Source   : https://nextjs.org/docs/app/api-reference/file-conventions/layout « A root layout is the top-most layout in the root app directory. It is used to define the <html> and <body> tags and other globally shared UI. »

### Contenu sans JavaScript (REND-01)
Fichiers : la page et les composants qui portent le texte principal
Recette  : le texte principal (h1, ouverture, corps) vit dans le JSX rendu au serveur, pas dans un état chargé après coup. Un composant « use client » est rendu au serveur une première fois : son JSX statique compte ; ce qui n'existe pas au premier rendu n'existe pas pour un bot.
```tsx
// Mauvais : le texte n'arrive qu'après l'effet
"use client";
export function Intro() {
  const [text, setText] = useState("");
  useEffect(() => { fetch("/api/intro").then((r) => r.json()).then((j) => setText(j.text)); }, []);
  return <p>{text}</p>;
}

// Bon : composant serveur, le texte est dans le HTML
export async function Intro() {
  const j = await getIntro();
  return <p>{j.text}</p>;
}
```
Piège    : une animation d'apparition (framer-motion, `initial={{ opacity: 0 }}`) laisse le texte dans le HTML : ce n'est pas un problème REND-01. Un effet machine à écrire qui construit le texte caractère par caractère en est un.
Piège    : l'audit lit le HTML tel que servi, sans exécuter JavaScript ; `textChars` de `derived/pages.json` dit ce qu'un bot voit.
Source   : https://nextjs.org/docs/app/getting-started/server-and-client-components « By default, layouts and pages are Server Components, which lets you fetch data and render parts of your UI on the server, optionally cache the result, and stream it to the client. »

### IndexNow (AI-02)
Fichiers : public/<clé>.txt (le chemin exact est `indexnow.file` du plan)
Recette  : un fichier texte dont le contenu est la clé, sans retour à la ligne final.
```bash
printf '%s' 'bf498d4959b94b88aa7bb3902433735f' > public/bf498d4959b94b88aa7bb3902433735f.txt
```
Piège    : la clé vient de `seo/strategy.md` (Cadence de fraîcheur, IndexNow) ; ne jamais en générer une autre ici, sinon l'audit (AI-02) compare deux clés différentes.
Piège    : soumettre les URLs à IndexNow après la mise en ligne est une étape de `launch`, pas de `build`.
Source   : https://www.indexnow.org/documentation « You must host a UTF-8 encoded text key file {your-key}.txt listing the key in the file at the root directory of your website. »
Source   : https://nextjs.org/docs/app/api-reference/file-conventions/public-folder « For example, the file public/avatars/me.png can be viewed by visiting the /avatars/me.png path. »

### Hors build (IDX-03, IDX-04, PERF-01, STRAT-04)
Fichiers : aucun
Recette  : rien à coder ; `build` liste ces trouvailles à la fin avec l'endroit où agir (`ou` du plan).
Piège    : IDX-04 : la redirection apex vers www (ou l'inverse) se règle dans Vercel, Project Settings, Domains, « Redirect to » ; un `redirects()` de next.config avec une condition sur l'hôte n'est pas le mécanisme prévu par l'hébergeur, et un 307 émis par la plateforme reste un 307.
Piège    : IDX-03 : le certificat et la redirection HTTP vers HTTPS sont automatiques sur Vercel ; ailleurs, c'est l'hébergeur.
Piège    : STRAT-04 : la cadence est un engagement éditorial ; `build` ne réécrit pas un contenu pour le rajeunir.
Source   : https://vercel.com/docs/domains/working-with-domains/deploying-and-redirecting « This allows the Vercel CDN more control over incoming traffic for improved reliability, speed, and security. »
Source   : https://vercel.com/docs/domains/working-with-domains/deploying-and-redirecting « Use the Redirect to dropdown to select the domain you want to redirect to »
Source   : https://nextjs.org/docs/app/api-reference/config/next-config-js/redirects « permanent true or false - if true will use the 308 status code which instructs clients/search engines to cache the redirect forever, if false will use the 307 status code which is temporary and is not cached. »
