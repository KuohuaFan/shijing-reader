import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(projectRoot, "client/src/data/shijing.ts");
const editionPath = path.join(projectRoot, "client/src/data/edition.ts");
const publicDir = path.join(projectRoot, "client/public");
const siteUrl = "https://kuohuafan.github.io/shijing-reader/";

const source = fs.readFileSync(sourcePath, "utf8");
const editionSource = fs.readFileSync(editionPath, "utf8");
const dateModified = editionSource.match(/dateModified: "([^"]+)"/)?.[1];
if (!dateModified) throw new Error("Cannot generate sitemap: missing dateModified.");
const poemIds = [...source.matchAll(/"id": (\d+)/g)].map((match) => Number(match[1]));

if (
  poemIds.length !== 305 ||
  !poemIds.every((id, index) => id === index + 1)
) {
  throw new Error("Cannot generate sitemap: expected sequential poem IDs 1–305.");
}

const urls = [
  { loc: siteUrl, priority: "1.0" },
  ...poemIds.map((id) => ({
    loc: `${siteUrl}poems/${id}/`,
    priority: "0.7",
  })),
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    ({ loc, priority }) => `  <url>
    <loc>${loc}</loc>
    <lastmod>${dateModified}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>
`;

const robots = `User-agent: *
Allow: /

Sitemap: ${siteUrl}sitemap.xml
`;

fs.mkdirSync(publicDir, { recursive: true });
fs.writeFileSync(path.join(publicDir, "sitemap.xml"), sitemap);
fs.writeFileSync(path.join(publicDir, "robots.txt"), robots);

console.log(`Generated sitemap.xml with ${urls.length} URLs and robots.txt.`);
