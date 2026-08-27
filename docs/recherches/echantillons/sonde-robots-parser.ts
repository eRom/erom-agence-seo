import robotsParser from "robots-parser";
const S = "/Users/recarnot/dev/erom-agence-seo/docs/recherches/echantillons/robots";
const bots = ["OAI-SearchBot","ChatGPT-User","Claude-User","Claude-SearchBot","PerplexityBot","GPTBot","ClaudeBot","Googlebot","bingbot","Google-Extended"];
for (const host of ["www.lemonde.fr","www.lefigaro.fr","www.leboncoin.fr","www.nytimes.com"]) {
  const txt = await Bun.file(`${S}/${host}.txt`).text();
  const r = robotsParser(`https://${host}/robots.txt`, txt);
  const row = bots.map(b => {
    const root = r.isAllowed(`https://${host}/`, b);
    const deep = r.isAllowed(`https://${host}/voyages/paris`, b);
    return `${b}:${root === undefined ? "?" : root ? "A" : "D"}${deep === undefined ? "?" : deep ? "A" : "D"}`;
  }).join(" ");
  console.log(host.padEnd(18), row);
  console.log("   sitemaps:", r.getSitemaps().length);
}
