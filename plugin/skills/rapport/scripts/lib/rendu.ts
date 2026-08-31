// Rendu du rapport client en HTML autonome. Pur : aucun accès disque ni réseau, le thème arrive en paramètre.
// Règles du design system institut : light uniquement, Spectral partout, filets plutôt qu'ombres,
// angles à 0, rien ne bouge au survol, la couleur porte du sens.
import type { RapportClient, SectionClient } from "./contrat";
import type { Theme } from "./theme";

// Défense en profondeur (D46/D49bis) : même si un couvre: mal placé a échappé au lint, aucun
// commentaire HTML résiduel ne doit atteindre l'écran du client. Dernière porte, retirée avant
// l'échappement pour ne laisser aucune trace, même caviardée, du contenu qu'il portait.
const echapper = (s: string): string =>
  s.replace(/<!--[\s\S]*?-->/g, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Un corps de section : paragraphes séparés par une ligne vide, listes numérotées reconnues. */
function corpsHtml(corps: string): string {
  const blocs = corps.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return blocs.map((bloc) => {
    const lignes = bloc.split("\n");
    if (lignes.every((l) => /^\d+\.\s/.test(l))) {
      return `<ol>${lignes.map((l) => `<li>${echapper(l.replace(/^\d+\.\s/, ""))}</li>`).join("")}</ol>`;
    }
    return `<p>${lignes.map(echapper).join("<br>")}</p>`;
  }).join("\n");
}

function sectionHtml(s: SectionClient): string {
  return `<article class="trouvaille">\n<h3>${echapper(s.titre)}</h3>\n${corpsHtml(s.corps)}\n</article>`;
}

function groupeHtml(titre: string, sections: SectionClient[], classe: string): string {
  if (sections.length === 0) return "";
  return `<section class="${classe}">\n<h2>${echapper(titre)}</h2>\n${sections.map(sectionHtml).join("\n")}\n</section>`;
}

function fontFaces(theme: Theme): string {
  return theme.fontes.map((f) => `@font-face{font-family:'${f.nom}';font-style:${f.style};font-weight:${f.poids};font-display:swap;src:url(data:font/woff2;base64,${f.base64}) format('woff2');}`).join("\n");
}

// Le document embarque les fontes en base64 : il redistribue donc le logiciel de police,
// et l'OFL 1.1 veut que chaque copie porte l'avis de copyright et renvoie à la licence.
// Deux lignes de commentaire suffisent et n'atteignent jamais l'écran du client.
const AVIS_FONTES = `<!--
Police Spectral, Copyright 2017 The Spectral Project Authors (https://github.com/productiontype/Spectral)
Distribuee sous SIL Open Font License 1.1 : https://scripts.sil.org/OFL
-->`;

const FEUILLE = `
*{box-sizing:border-box}
html{background:var(--papier-fond)}
body{background:var(--papier-fond);color:var(--encre);font-family:var(--serif);font-size:15px;line-height:1.65;margin:0;padding:var(--esp-64) var(--esp-24)}
.page{max-width:44rem;margin:0 auto}
h1{font-size:2rem;font-weight:600;line-height:1.2;margin:0}
.date{color:var(--encre-muted);margin:var(--esp-4) 0 var(--esp-24)}
.synthese{font-size:1.05rem;color:var(--encre-2);margin:0 0 var(--esp-48);padding-bottom:var(--esp-32);border-bottom:3px double var(--filet)}
h2{font-size:0.78rem;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:var(--encre-muted);margin:var(--esp-48) 0 var(--esp-16);padding-bottom:var(--esp-8);border-bottom:1px solid var(--filet)}
h3{font-size:1.15rem;font-weight:600;margin:0 0 var(--esp-8)}
p,ol,ul{margin:0 0 var(--esp-12)}
ol,ul{padding-left:var(--esp-24)}
.trouvaille{margin-bottom:var(--esp-32)}
.action{background:var(--bleu-50);border-left:3px solid var(--bleu-700);border-radius:var(--rayon-champ);padding:var(--esp-24);margin-bottom:var(--esp-32)}
.action h2{color:var(--bleu-700);border-bottom-color:var(--bleu-200);margin-top:0}
.action h3{color:var(--bleu-800)}
.bloque .trouvaille{border-left:3px solid var(--garance-500);padding-left:var(--esp-16)}
.bloque h2{color:var(--garance-700);border-bottom-color:var(--garance-200)}
.marche{background:var(--vert-fond);border-radius:var(--rayon-champ);padding:var(--esp-16) var(--esp-24);margin-top:var(--esp-32)}
.marche h2{color:var(--vert-texte);border-bottom-color:transparent;margin:0 0 var(--esp-8)}
.marche ul{margin:0;list-style:none;padding:0}
.marche li{padding-left:var(--esp-16);position:relative}
.marche li::before{content:"·";position:absolute;left:0;color:var(--vert)}
.methode{margin-top:var(--esp-48);padding-top:var(--esp-16);border-top:1px solid var(--filet);color:var(--encre-muted);font-size:0.9rem}
@media print{
  @page{margin:18mm}
  body{padding:0;print-color-adjust:exact;-webkit-print-color-adjust:exact}
  p{orphans:3;widows:3}
  .entete,.trouvaille,.action,.methode,.marche{break-inside:avoid;page-break-inside:avoid}
  h2,h3{break-after:avoid;page-break-after:avoid}
}
`.trim();

export function rendre(rapport: RapportClient, theme: Theme): string {
  const action = `<section class="action">\n<h2>À faire cette semaine</h2>\n<h3>${echapper(rapport.action.titre)}</h3>\n${corpsHtml(rapport.action.corps)}\n</section>`;
  const marche = rapport.marche.length === 0 ? "" :
    `<section class="marche">\n<h2>Ce qui marche déjà</h2>\n<ul>${rapport.marche.map((l) => `<li>${echapper(l)}</li>`).join("")}</ul>\n</section>`;
  return `<!doctype html>
${AVIS_FONTES}
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${echapper(rapport.site)}</title>
<style>
${fontFaces(theme)}
${theme.tokens}
${FEUILLE}
</style>
</head>
<body>
<main class="page">
<header class="entete">
<h1>${echapper(rapport.site)}</h1>
<p class="date">Revue du ${echapper(rapport.date)}</p>
<p class="synthese">${echapper(rapport.synthese)}</p>
</header>
${action}
${groupeHtml("Ce qui bloque", rapport.bloque, "bloque")}
${groupeHtml("Ce qui freine", rapport.freine, "freine")}
${marche}
<section class="methode">
<h2>Méthode</h2>
${corpsHtml(rapport.methode)}
</section>
</main>
</body>
</html>
`;
}
