# Performance

Contexte pour Claude : `derived/psi.json`. Sans clé PSI_API_KEY, `ok` vaut false et la vérification va dans « Ce que je n'ai pas pu voir » avec la procédure ci-dessous. Clé gratuite : créer un projet sur console.cloud.google.com, activer l'API PageSpeed Insights, créer une clé API, l'exporter dans l'environnement avant de lancer l'audit (`export PSI_API_KEY=...`). Sans clé, l'API répond 429 avec un quota journalier à zéro (échantillon du 2026-08-27).

### PERF-01 : Core Web Vitals sur données de terrain
Couche     : absolue
Niveau     : 0
Sévérité   : Important
Vérifie    : la home passe les seuils CrUX au 75e percentile : LCP 2,5 s, INP 200 ms, CLS 0,1.
Comment    : derived/psi.json → ok false = non vu (expliquer la clé). field absent = Info « pas assez de trafic réel, score labo : lab.performance ». field.overall SLOW = Important ; AVERAGE = Mineur ; FAST = passé. Citer les trois métriques (percentile, category) et field.originFallback.
Source     : https://web.dev/articles/vitals « LCP should occur within 2.5 seconds of when the page first starts loading »
Source     : https://web.dev/articles/vitals « pages should have a INP of 200 milliseconds or less »
Source     : https://web.dev/articles/vitals « pages should maintain a CLS of 0.1. or less »
Source     : https://web.dev/articles/vitals « a good threshold to measure is the 75th percentile of page loads »
Source     : https://developers.google.com/speed/docs/insights/v5/about « PSI will fall back to origin-level granularity »
Correctif  : selon la métrique en cause : images et LCP, scripts tiers et INP, dimensions réservées et CLS.
Effort     : lourd
