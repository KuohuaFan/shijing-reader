import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getEditionMetadata } from "./edition-meta.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(projectRoot, "dist/public");
const siteUrl = "https://kuohuafan.github.io/shijing-reader/";
const { editorName, dateModified, commitSha } = getEditionMetadata();

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
const homeBook = homeSchema["@graph"].find((item) => item["@type"] === "Book");
const homeCollection = homeSchema["@graph"].find(
  (item) => item["@type"] === "CollectionPage",
);

let poemPagesValid = true;
let poemTitlesValid = true;
let socialImagesValid = true;
let socialMetaValid = true;
let editionMetadataValid = true;
const poemCanonicals = [];
for (let id = 1; id <= 305; id += 1) {
  try {
    const html = read(`poems/${id}/index.html`);
    const canonical = `${siteUrl}poems/${id}/`;
    const schema = extractJsonLd(html);
    const types = schema["@graph"].map((item) => item["@type"]);
    const pageTitle = html.match(/<title>([^<]+)<\/title>/)?.[1] ?? "";
    const creativeWork = schema["@graph"].find((item) => item["@type"] === "CreativeWork");
    const imageUrl = `${siteUrl}assets/og/poem-${id}.jpg?v=${commitSha}`;
    const imagePath = path.join(distDir, "assets/og", `poem-${id}.jpg`);
    poemCanonicals.push(canonical);
    poemTitlesValid &&= Array.from(pageTitle).length >= 30 && Array.from(pageTitle).length <= 60;
    socialImagesValid &&= fs.existsSync(imagePath) && fs.statSync(imagePath).size > 20_000;
    socialMetaValid &&=
      html.includes(`<meta property="og:image" content="${imageUrl}"`) &&
      html.includes(`<meta name="twitter:card" content="summary_large_image"`) &&
      html.includes(`<meta name="twitter:image" content="${imageUrl}"`);
    editionMetadataValid &&=
      creativeWork?.dateModified === dateModified &&
      creativeWork?.editor?.name === editorName &&
      creativeWork?.image?.url === imageUrl &&
      creativeWork?.image?.width === 1200 &&
      creativeWork?.image?.height === 630;
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
  sitemapLastModified:
    Boolean(dateModified) &&
    [...sitemap.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].length === 306 &&
    !sitemap.includes(`<lastmod></lastmod>`),
  robotsAllowsCrawling: robots.includes("User-agent: *") && robots.includes("Allow: /"),
  robotsLinksSitemap: robots.includes(`Sitemap: ${siteUrl}sitemap.xml`),
  homepageSchema:
    homeTypes.includes("WebSite") &&
    homeTypes.includes("CollectionPage") &&
    homeTypes.includes("Book"),
  homepageEditionMetadata:
    homeBook?.dateModified === dateModified &&
    homeBook?.editor?.name === editorName &&
    homeCollection?.dateModified === dateModified &&
    homeCollection?.editor?.name === editorName,
  poemPagesValid,
  poemTitlesValid,
  poemCanonicalsUnique: new Set(poemCanonicals).size === 305,
  socialImagesValid,
  socialMetaValid,
  editionMetadataValid,
  homepageSocialImage:
    homepage.includes(`${siteUrl}assets/og-home.jpg?v=${commitSha}`) &&
    fs.existsSync(path.join(distDir, "assets/og-home.jpg")),
};

console.log(
  JSON.stringify(
    {
      sitemapUrlCount: locations.length,
      homepageSchemaTypes: homeTypes,
      poemPagesChecked: 305,
      socialImagesChecked: 305,
      editorName,
      dateModified,
      commitSha,
      checks,
    },
    null,
    2,
  ),
);

if (Object.values(checks).some((value) => !value)) process.exit(1);
