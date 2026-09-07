import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(projectRoot, "dist/public");
const siteUrl = "https://kuohuafan.github.io/shijing-reader/";

const read = (relativePath) =>
  fs.readFileSync(path.join(distDir, relativePath), "utf8");
const extractJsonLd = (html) => {
  const content = html.match(
    /<script id="structured-data" type="application\/ld\+json">([\s\S]*?)<\/script>/,
  )?.[1];
  if (!content) throw new Error("Structured data script not found.");
  return JSON.parse(content);
};

const homepage = read("index.html");
const sitemap = read("sitemap.xml");
const robots = read("robots.txt");
const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
  (match) => match[1],
);
const homeSchema = extractJsonLd(homepage);
const homeTypes = homeSchema["@graph"].map((item) => item["@type"]);

let poemPagesValid = true;
let poemTitlesValid = true;
const poemCanonicals = [];
for (let id = 1; id <= 305; id += 1) {
  try {
    const html = read(`poems/${id}/index.html`);
    const canonical = `${siteUrl}poems/${id}/`;
    const schema = extractJsonLd(html);
    const types = schema["@graph"].map((item) => item["@type"]);
    const pageTitle = html.match(/<title>([^<]+)<\/title>/)?.[1] ?? "";
    poemCanonicals.push(canonical);
    poemTitlesValid &&= Array.from(pageTitle).length >= 30 && Array.from(pageTitle).length <= 60;
    if (
      !html.includes(`<link rel="canonical" href="${canonical}" />`) ||
      !html.includes(`<h1>`) ||
      !types.includes("CreativeWork") ||
      !types.includes("BreadcrumbList")
    ) {
      poemPagesValid = false;
      break;
    }
  } catch {
    poemPagesValid = false;
    break;
  }
}

const checks = {
  sitemapUrlCount: locations.length === 306,
  sitemapUrlsUnique: new Set(locations).size === locations.length,
  sitemapHomepage: locations[0] === siteUrl,
  sitemapPoemEndpoints:
    locations[1] === `${siteUrl}poems/1/` &&
    locations.at(-1) === `${siteUrl}poems/305/`,
  robotsAllowsCrawling: robots.includes("User-agent: *") && robots.includes("Allow: /"),
  robotsLinksSitemap: robots.includes(`Sitemap: ${siteUrl}sitemap.xml`),
  homepageSchema:
    homeTypes.includes("WebSite") &&
    homeTypes.includes("CollectionPage") &&
    homeTypes.includes("Book"),
  poemPagesValid,
  poemTitlesValid,
  poemCanonicalsUnique: new Set(poemCanonicals).size === 305,
};

console.log(
  JSON.stringify(
    {
      sitemapUrlCount: locations.length,
      homepageSchemaTypes: homeTypes,
      poemPagesChecked: 305,
      checks,
    },
    null,
    2,
  ),
);

if (Object.values(checks).some((value) => !value)) process.exit(1);
