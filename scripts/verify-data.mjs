import fs from "node:fs";

const source = fs.readFileSync(new URL("../client/src/data/shijing.ts", import.meta.url), "utf8");
const ids = [...source.matchAll(/"id": (\d+)/g)].map((match) => Number(match[1]));
const titles = [...source.matchAll(/"title": "([^"]+)"/g)].map((match) => match[1]);
const counts = Object.fromEntries(
  ["國風", "小雅", "大雅", "周頌", "魯頌", "商頌"].map((chapter) => [
    chapter,
    [...source.matchAll(new RegExp(`"chapter": "${chapter}"`, "g"))].length,
  ]),
);
const expectedCounts = { 國風: 160, 小雅: 74, 大雅: 31, 周頌: 31, 魯頌: 4, 商頌: 5 };
const checks = {
  count: ids.length === 305,
  sequentialIds: ids.every((id, index) => id === index + 1),
  endpoints: titles[0] === "關雎" && titles.at(-1) === "殷武",
  chapterCounts: JSON.stringify(counts) === JSON.stringify(expectedCounts),
};
console.log(JSON.stringify({ poemCount: ids.length, first: titles[0], last: titles.at(-1), counts, checks }, null, 2));
if (Object.values(checks).some((value) => !value)) process.exit(1);
