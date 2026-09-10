import fs from "node:fs";

const source = fs.readFileSync(new URL("../client/src/data/shijing.ts", import.meta.url), "utf8");
const topicSource = fs.readFileSync(new URL("../client/src/data/topics.ts", import.meta.url), "utf8");
const commentaryPath = new URL("../client/src/data/commentaries.ts", import.meta.url);
const commentarySource = fs.existsSync(commentaryPath)
  ? fs.readFileSync(commentaryPath, "utf8")
  : "";
const editionSource = fs.readFileSync(new URL("../client/src/data/edition.ts", import.meta.url), "utf8");
const htmlSource = fs.readFileSync(new URL("../client/index.html", import.meta.url), "utf8");
const homeSource = fs.readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");
const ids = [...source.matchAll(/"id": (\d+)/g)].map((match) => Number(match[1]));
const titles = [...source.matchAll(/"title": "([^"]+)"/g)].map((match) => match[1]);
const counts = Object.fromEntries(
  ["國風", "小雅", "大雅", "周頌", "魯頌", "商頌"].map((chapter) => [
    chapter,
    [...source.matchAll(new RegExp(`"chapter": "${chapter}"`, "g"))].length,
  ]),
);
const expectedCounts = { 國風: 160, 小雅: 74, 大雅: 31, 周頌: 31, 魯頌: 4, 商頌: 5 };
const contentTopicKeys = ["love", "farming", "service", "ritual", "feast", "homecoming"];
const topicEntries = Object.fromEntries(
  [...topicSource.matchAll(/key: "(love|farming|service|ritual|feast|homecoming)"[\s\S]*?poemIds: \[([\s\S]*?)\]/g)].map(
    (match) => [
      match[1],
      [...match[2].matchAll(/\d+/g)].map((item) => Number(item[0])),
    ],
  ),
);
const topicCounts = Object.fromEntries(
  contentTopicKeys.map((key) => [key, topicEntries[key]?.length ?? 0]),
);
const seoTitle = htmlSource.match(/<title>([^<]+)<\/title>/)?.[1] ?? "";
const runtimeTitle = homeSource.match(/const SEO_TITLE = "([^"]+)"/)?.[1] ?? "";
const h2Text = homeSource.match(/<h2 className="coverSubtitle">([^<]+)<\/h2>/)?.[1] ?? "";
const keywords = (htmlSource.match(/<meta name="keywords" content="([^"]+)"/)?.[1] ?? "")
  .split(",")
  .map((keyword) => keyword.trim())
  .filter(Boolean);
const charLength = (value) => Array.from(value).length;
const parseArray = (text, marker) => {
  const start = text.indexOf(marker);
  const end = text.indexOf("\n];", start);
  return start >= 0 && end >= 0
    ? JSON.parse(text.slice(start + marker.length, end + 2))
    : [];
};
const poemData = parseArray(source, "export const poems: Poem[] = ");
const commentaryData = parseArray(
  commentarySource,
  "export const commentaries: PoemCommentary[] = ",
);
const commentaryById = new Map(commentaryData.map((item) => [item.poemId, item]));
const normalizeText = (text) => text.replace(/[^\p{L}\p{N}]+/gu, "");
const commentaryValid = poemData.every((poem) => {
  const item = commentaryById.get(poem.id);
  const original = poem.stanzas.join("");
  return (
    item &&
    item.translation.length === poem.stanzas.length &&
    item.translation.every(
      (text, index) =>
        typeof text === "string" &&
        text.trim().length >= 4 &&
        normalizeText(text) !== normalizeText(poem.stanzas[index]),
    ) &&
    item.annotations.length >= 3 &&
    item.annotations.length <= 6 &&
    item.annotations.every(
      (note) => original.includes(note.term) && note.explanation.trim().length > 0,
    ) &&
    item.readingNote.trim().length >= 8
  );
});
const checks = {
  count: ids.length === 305,
  sequentialIds: ids.every((id, index) => id === index + 1),
  endpoints: titles[0] === "關雎" && titles.at(-1) === "殷武",
  chapterCounts: JSON.stringify(counts) === JSON.stringify(expectedCounts),
  contentTopicsPresent: contentTopicKeys.every((key) => (topicEntries[key]?.length ?? 0) > 0),
  topicIdsValid: contentTopicKeys.every((key) =>
    topicEntries[key]?.every((id) => Number.isInteger(id) && id >= 1 && id <= 305),
  ),
  topicIdsUnique: contentTopicKeys.every(
    (key) => new Set(topicEntries[key]).size === topicEntries[key]?.length,
  ),
  seoTitleLength: charLength(seoTitle) >= 30 && charLength(seoTitle) <= 60,
  runtimeTitleMatches: runtimeTitle === seoTitle && homeSource.includes("document.title = pageTitle"),
  h2Length: charLength(h2Text) > 0 && charLength(h2Text) <= 80,
  keywordCount: keywords.length >= 3 && keywords.length <= 8,
  keywordsUnique: new Set(keywords).size === keywords.length,
  commentaryCount: commentaryData.length === 305,
  commentaryIdsUnique: new Set(commentaryData.map((item) => item.poemId)).size === 305,
  commentaryValid,
  commentaryDisclosure:
    commentarySource.includes("commentaryReviewed = false") &&
    homeSource.includes("閱讀輔助初稿") &&
    homeSource.includes("尚待人工逐篇覆核") &&
    commentarySource.includes("gpt-5-mini → gpt-5"),
  expandedKeywordSearch:
    homeSource.includes("commentary?.translation.join") &&
    homeSource.includes("搜尋篇名、詩句、譯文或註詞"),
  localFavorites:
    homeSource.includes('const STAR_KEY = "shijing-reader:stars:v1"') &&
    homeSource.includes("localStorage.setItem(STAR_KEY") &&
    homeSource.includes("加入收藏"),
  gitDerivedEdition:
    editionSource.includes("import.meta.env.VITE_DATE_MODIFIED") &&
    editionSource.includes("import.meta.env.VITE_GIT_COMMIT_SHA"),
};
console.log(JSON.stringify({
  poemCount: ids.length,
  first: titles[0],
  last: titles.at(-1),
  counts,
  topicCounts,
  commentaryCount: commentaryData.length,
  seo: {
    title: seoTitle,
    titleCharacters: charLength(seoTitle),
    h2: h2Text,
    h2Characters: charLength(h2Text),
    keywords,
    keywordCount: keywords.length,
  },
  checks,
}, null, 2));
if (Object.values(checks).some((value) => !value)) process.exit(1);
