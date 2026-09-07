import fs from "node:fs";

const source = fs.readFileSync(new URL("../client/src/data/shijing.ts", import.meta.url), "utf8");
const topicSource = fs.readFileSync(new URL("../client/src/data/topics.ts", import.meta.url), "utf8");
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
};
console.log(JSON.stringify({ poemCount: ids.length, first: titles[0], last: titles.at(-1), counts, topicCounts, checks }, null, 2));
if (Object.values(checks).some((value) => !value)) process.exit(1);
