import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getEditionMetadata } from "./edition-meta.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(projectRoot, "client/src/data/shijing.ts");
const distDir = path.join(projectRoot, "dist/public");
const indexPath = path.join(distDir, "index.html");
const siteUrl = "https://kuohuafan.github.io/shijing-reader/";

const source = fs.readFileSync(sourcePath, "utf8");
const marker = "export const poems: Poem[] = ";
const start = source.indexOf(marker);
const end = source.indexOf("\n];", start);
if (start < 0 || end < 0) throw new Error("Unable to locate poems array.");
const poems = JSON.parse(source.slice(start + marker.length, end + 2));
const edition = getEditionMetadata();
const template = fs.readFileSync(indexPath, "utf8");

const escapeHtml = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const replaceMeta = (html, selector, value) => {
  const pattern = new RegExp(`(<meta ${selector} content=")[^"]*("\\s*/?>)`);
  return html.replace(pattern, `$1${escapeHtml(value)}$2`);
};

for (const poem of poems) {
  const canonicalUrl = `${siteUrl}poems/${poem.id}/`;
  const title = `〈${poem.title}〉全文、朗讀與主題導讀｜詩經${poem.chapter}・${poem.section}第${poem.id}篇｜詩經線上讀本`;
  const description = `《詩經》${poem.chapter}・${poem.section}第${poem.id}篇〈${poem.title}〉全文，共${poem.stanzas.length}章，提供白話譯註、關鍵字搜尋、朗讀、收藏與札記。`;
  const socialImage = `${siteUrl}assets/og/poem-${poem.id}.jpg?v=${edition.commitSha}`;
  const socialImageAlt = `《詩經》${poem.chapter}・${poem.section}〈${poem.title}〉社群分享圖`;
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CreativeWork",
        "@id": `${canonicalUrl}#poem`,
        url: canonicalUrl,
        name: poem.title,
        headline: `詩經${poem.chapter}・${poem.section}〈${poem.title}〉`,
        description,
        text: poem.stanzas.join("\n\n"),
        position: poem.id,
        genre: "中國古典詩歌",
        inLanguage: "zh-Hant",
        isAccessibleForFree: true,
        dateModified: edition.dateModified,
        editor: {
          "@type": "Person",
          name: edition.editorName,
          url: edition.editorUrl,
        },
        image: {
          "@type": "ImageObject",
          url: socialImage,
          width: 1200,
          height: 630,
          caption: socialImageAlt,
        },
        isPartOf: {
          "@type": "Book",
          "@id": `${siteUrl}#book`,
          name: "詩經",
          url: siteUrl,
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "詩經線上讀本",
            item: siteUrl,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: `${poem.chapter}・${poem.section}・${poem.title}`,
            item: canonicalUrl,
          },
        ],
      },
    ],
  }).replaceAll("<", "\\u003c");
  const staticArticle = `<div id="root"><article lang="zh-Hant" style="max-width:760px;margin:48px auto;padding:32px;font-family:serif;line-height:2;color:#24251f"><p>${escapeHtml(poem.chapter)}・${escapeHtml(poem.section)}・第 ${poem.id} 篇</p><h1>${escapeHtml(poem.title)}</h1>${poem.stanzas.map((stanza) => `<p>${escapeHtml(stanza)}</p>`).join("")}<p><a href="${siteUrl}">返回詩經線上讀本</a></p></article></div>`;

  let html = template
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`)
    .replace(
      /<link rel="canonical" href="[^"]*"\s*\/>/,
      `<link rel="canonical" href="${canonicalUrl}" />`,
    )
    .replace(
      /<script id="structured-data" type="application\/ld\+json">[\s\S]*?<\/script>/,
      `<script id="structured-data" type="application/ld+json">${jsonLd}</script>`,
    )
    .replace('<div id="root"></div>', staticArticle);
  html = replaceMeta(html, 'name="description"', description);
  html = replaceMeta(html, 'property="og:title"', title);
  html = replaceMeta(html, 'property="og:description"', description);
  html = replaceMeta(html, 'property="og:type"', "article");
  html = replaceMeta(html, 'property="og:url"', canonicalUrl);
  html = replaceMeta(html, 'property="og:image"', socialImage);
  html = replaceMeta(html, 'property="og:image:secure_url"', socialImage);
  html = replaceMeta(html, 'property="og:image:alt"', socialImageAlt);
  html = replaceMeta(html, 'name="twitter:title"', title);
  html = replaceMeta(html, 'name="twitter:description"', description);
  html = replaceMeta(html, 'name="twitter:image"', socialImage);
  html = replaceMeta(html, 'name="twitter:image:alt"', socialImageAlt);

  const outputDir = path.join(distDir, "poems", String(poem.id));
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "index.html"), html);
}

console.log(`Generated ${poems.length} static poem pages.`);
