# API SEO de Next.js 16 (App Router), vérifiée le 2026-08-28

Matière pour le chantier 3 (`/erom-seo:build`). Recherche menée par un sous-agent Context7 (`/vercel/next.js/v16.1.1`) recoupée avec nextjs.org, vercel.com et developers.google.com en direct (docs live = 16.3.3, aucun écart avec 16.1.1 sauf mention explicite au point 6). Chaque point cite sa page. Trois sous-points non trouvés dans la doc sont listés à la fin : ils se tranchent à la main, pas de mémoire.

## 1. `metadata` dans un composant client

Impossible, cité texto : « The `metadata` object and `generateMetadata` function exports are **only supported in Server Components**. You cannot export both the `metadata` object and `generateMetadata` function from the same route segment. »

Pattern recommandé, cité texto (« If you need to use Client Component features, keep your `page.tsx` as a Server Component and move the Client Component logic to a separate file ») :

```tsx
// app/page.tsx (Server Component)
import type { Metadata } from 'next'
import { InteractiveComponent } from './interactive-component'

export const metadata: Metadata = { title: 'My Page' }
export default function Page() { return <InteractiveComponent /> }
```
```tsx
// app/interactive-component.tsx
'use client'
export function InteractiveComponent() { /* hooks, handlers... */ }
```
Fichiers : `app/page.tsx` + `app/interactive-component.tsx`
Doc : https://nextjs.org/docs/app/api-reference/functions/generate-metadata

## 2. `metadataBase` et `alternates.canonical`

```tsx
// app/layout.tsx
export const metadata: Metadata = {
  metadataBase: new URL('https://acme.com'),
  alternates: { canonical: '/' },
}
```
Rend `<link rel="canonical" href="https://acme.com" />`.

- `metadataBase` « typically set in root `app/layout.js` to apply to URL-based metadata fields across all routes » : s'applique au segment courant et aux enfants.
- Canonical auto-référent par page : chaque `page.tsx` définit son propre `alternates.canonical` (chemin relatif), résolu contre le `metadataBase` hérité. Table de résolution citée : `/` donne la base, `payments` donne `base/payments`, une URL absolue externe reste inchangée.
- Apex contre www : non traité par la doc Next.js. Mécanique, pas normatif : `metadataBase` doit pointer vers le domaine réellement servi (apex ou www), sinon le canonical généré n'est pas auto-référent. Le choix apex/www relève de l'hébergeur (point 8).

Fichiers : `app/layout.tsx` (metadataBase global), `app/**/page.tsx` (canonical par page)
Doc : https://nextjs.org/docs/app/api-reference/functions/generate-metadata

## 3. `title` : template, default, absolute

```tsx
// app/layout.tsx
export const metadata: Metadata = { title: { template: '%s | Acme', default: 'Acme' } }
```
```tsx
// app/about/page.tsx
export const metadata: Metadata = { title: 'About' }
// rend <title>About | Acme</title>
```
```tsx
// variante : ignorer le template hérité
export const metadata: Metadata = { title: { absolute: 'About' } }
// rend <title>About</title>
```

Règles citées texto :
- `template` s'applique aux segments enfants seulement, jamais au segment où il est défini
- `default` est requis si `template` est utilisé
- un `template` de `layout.js` ne s'applique pas à un `title` de `page.js` du même segment
- `template` dans `page.js` n'a aucun effet (page = segment terminal)
- `title.absolute` ignore le `title.template` des parents, dans layout.js comme page.js

Fichiers : `app/layout.tsx` (template et default), `app/**/page.tsx` (title simple ou absolute)
Doc : https://nextjs.org/docs/app/api-reference/functions/generate-metadata

## 4. `description`, `robots` par page, héritage d'`openGraph`

```tsx
// app/some-page/page.tsx
export const metadata: Metadata = {
  description: 'The React Framework for the Web',
  robots: {
    index: false, follow: true,
    googleBot: { index: false, follow: true, noimageindex: true },
  },
}
// rend <meta name="robots" content="noindex, follow" />
```

Héritage confirmé texto, avec exemple exact :
- Un champ non redéfini par l'enfant (ex. `openGraph` absent du `page.js`) est hérité tel quel du layout parent.
- Un champ redéfini dans l'enfant remplace entièrement celui du parent (pas de fusion : un `openGraph: { title: 'Blog' }` dans la page écrase tout l'objet `openGraph` du layout, pas seulement `title`).

Fichier : `app/**/page.tsx` ou `layout.tsx`
Doc : https://nextjs.org/docs/app/api-reference/functions/generate-metadata

## 5. `app/sitemap.ts`

```ts
import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: 'https://acme.com', lastModified: new Date(), changeFrequency: 'yearly', priority: 1 },
  ]
}
```
Type exact retourné :
```ts
type Sitemap = Array<{
  url: string
  lastModified?: string | Date
  changeFrequency?: 'always'|'hourly'|'daily'|'weekly'|'monthly'|'yearly'|'never'
  priority?: number
  alternates?: { languages?: Languages<string> }
  images?: string[]
  videos?: Videos[]
}>
```
- `lastModified` accepte Date ou string (ISO ou `YYYY-MM-DD`).
- Plusieurs sitemaps : imbrication (`app/sitemap.xml` + `app/products/sitemap.xml`) ou `generateSitemaps()` avec un `id`. Depuis v16.0.0 (donc vrai en 16.1.1) : l'`id` reçu par `sitemap()` est une `Promise<string>`, plus un `number` synchrone comme en v15.
- Recommandation Google sur `lastmod`, citée texto : « The `<lastmod>` value should reflect the date and time of the last significant update to the page. […] an update to the main content, the structured data, or links on the page is generally considered significant, however an update to the copyright date is not. » Google ne l'utilise que « if it's consistently and verifiably […] accurate ». Un `lastModified: new Date()` à chaque build est donc un signal faux.

Fichier : `app/sitemap.ts` (ou `app/product/sitemap.ts` pour un sitemap imbriqué)
Doc Next : https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
Doc Google : https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap

## 6. `app/robots.ts`

```ts
import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: 'Googlebot', allow: ['/'], disallow: '/private/' },
      { userAgent: ['Applebot', 'Bingbot'], disallow: ['/'] },
    ],
    sitemap: 'https://acme.com/sitemap.xml',
    host: 'https://acme.com',
  }
}
```
Type exact : `rules` (objet unique ou tableau par user-agent), `sitemap?: string | string[]`, `host?: string`.

Le champ `other` (directives non standard type `Request-Rate`, `Clean-param`) n'existe que depuis v16.3.0 : pas disponible en 16.1.1.

Fichier : `app/robots.ts`
Doc : https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots

## 7. JSON-LD

Pattern recommandé, cité texto (« Our current recommendation for JSON-LD is to render structured data as a `<script>` tag in your `layout.js` or `page.js` components ») :

```tsx
// app/products/[id]/page.tsx
export default async function Page({ params }) {
  const { id } = await params
  const product = await getProduct(id)
  const jsonLd = { '@context': 'https://schema.org', '@type': 'Product', name: product.name, image: product.image, description: product.description }

  return (
    <section>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
    </section>
  )
}
```
Échappement de `<` en `<` explicite pour prévenir le XSS (`JSON.stringify` seul ne protège pas). `next/script` est fait pour du JS exécutable, pas pour du JSON-LD : la balise `<script>` native est le bon choix.

Fichier : `app/**/page.tsx` (donnée propre à la route) ou `layout.tsx` (donnée partagée par un groupe de routes)
Doc : https://nextjs.org/docs/app/guides/json-ld

## 8. Redirections permanentes, apex vers www

```ts
// next.config.ts
const nextConfig = {
  redirects() {
    return [{ source: '/about', destination: '/', permanent: true }]
  },
}
```
- `permanent: true` donne 308, `permanent: false` donne 307. Next.js utilise 307/308 (pas 301/302) pour préserver la méthode HTTP (cité texto).
- Condition sur l'hôte, mécanisme documenté sans exemple apex/www officiel :
```ts
{ source: '/:path((?!another-page$).*)', has: [{ type: 'host', value: 'example.com' }], permanent: false, destination: '/another-page' }
```
- Apex vers www : hors `next.config` selon Vercel. Cité texto (vercel.com) : « We recommend using the `www` subdomain as your primary domain, with a redirect from the non-`www` domain to it. […] The DNS spec forbids using CNAME records on apex domains ». Réglage dans Project Settings, Domains, « Redirect to », pas dans le code.

Fichier : `next.config.ts` (redirections applicatives) ; apex/www : tableau de bord Vercel, hors code
Doc Next : https://nextjs.org/docs/app/api-reference/config/next-config-js/redirects
Doc Vercel : https://vercel.com/docs/domains/working-with-domains/deploying-and-redirecting

## 9. Fichier statique `public/<clé>.txt`

Confirmé, cité texto : « Files inside `public` can then be referenced by your code starting from the base URL (`/`). For example, the file `public/avatars/me.png` can be viewed by visiting the `/avatars/me.png` path. » Aucune restriction de type : vaut pour un `.txt` de vérification (IndexNow, Bing, Search Console).

Seule exception documentée : pour `robots.txt` et `favicon.ico` spécifiquement, la doc renvoie aux fichiers spéciaux d'`app/` plutôt qu'à `public/`.

Cache par défaut : `Cache-Control: public, max-age=0`.

Fichier : `public/<clé>.txt`, servi sur `/<clé>.txt`
Doc : https://nextjs.org/docs/app/api-reference/file-conventions/public-folder

## 10. En-tête `Last-Modified`

Non trouvé dans la doc : aucune mention que Next.js émette `Last-Modified` sur une page App Router ni sur `public/`. Le mécanisme documenté est partout `Cache-Control` (pages statiques prérendues : `s-maxage=31536000` ; dynamiques : pas de cache sauf en-tête posé ; `public/` : `public, max-age=0`).

Pour poser un en-tête par route :
```ts
// next.config.ts
module.exports = {
  async headers() {
    return [{ source: '/about', headers: [{ key: 'Last-Modified', value: '...' }] }]
  },
}
```
Matching par paramètre (`/blog/:slug`) possible, mais la valeur est une chaîne statique de config : pas de calcul par requête documenté à cet endroit.

Fichier : `next.config.ts`
Doc : https://nextjs.org/docs/app/api-reference/config/next-config-js/headers

## 11. Next.js 15 vers 16 sur ces API

Le guide de migration officiel (lu en entier) ne mentionne qu'un changement touchant metadata, sitemap, robots ou redirects :
- sitemap : l'`id` passé à `sitemap()` par `generateSitemaps` devient `Promise<string>` (était `number` synchrone en v15). Actif depuis v16.0.0.
- metadata (objet et `generateMetadata`), `robots.ts`, `redirects()` : aucune entrée, aucun changement cassant trouvé. Corroboré par les tables « Version History » de chaque page (`redirects.mdx` s'arrête à v13.3.0, `sitemap.mdx` à v16.0.0 pour ce point).

Hors périmètre mais utile : `middleware.ts` renommé `proxy.ts` (déprécié, avertissement sans erreur tant que `middleware.ts` existe seul).

Doc : https://nextjs.org/docs/app/guides/upgrading/version-16

## À vérifier à la main

1. Émission automatique de `Last-Modified` sur une page App Router : non documenté dans un sens ni dans l'autre. Se tranche par `curl -I` sur une page en prod (chico : `curl -sI https://www.commentchercherbonheur.org/ | grep -i last-modified`).
2. `has: type: host` pour une redirection apex vers www dans `next.config` : mécanisme documenté, aucun exemple officiel pour un domaine entier. À tester si l'hébergement n'est pas Vercel.
3. JSON-LD dans un `layout.tsx` partagé : autorisé en une phrase (« layout.js or page.js »), aucun exemple en layout, déduplication et position dans le head non détaillées. À observer sur le HTML rendu.
