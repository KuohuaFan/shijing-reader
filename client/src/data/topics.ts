import type { Poem } from "./shijing";

/**
 * 閱讀導覽用的主題索引。
 *
 * 「風／雅／頌」依《詩經》傳統體例映射；「愛情」等內容主題是本站依
 * 篇章主要意象與常見解讀建立的非排他編輯索引，不代表唯一篇旨或定論。
 * 一篇詩可以同時屬於多個內容主題。
 */
export type TopicKey =
  | "feng"
  | "ya"
  | "song"
  | "love"
  | "farming"
  | "service"
  | "ritual"
  | "feast"
  | "homecoming";

export type TopicGroupKey = "form" | "content";

export type TopicDefinition = {
  key: TopicKey;
  label: string;
  group: TopicGroupKey;
  description: string;
  chapters?: readonly Poem["chapter"][];
  poemIds?: readonly number[];
};

export const topicGroups: Array<{
  key: TopicGroupKey;
  label: string;
  description: string;
}> = [
  {
    key: "form",
    label: "體例",
    description: "依傳統的風、雅、頌三類編次",
  },
  {
    key: "content",
    label: "內容",
    description: "依主要意象與常見解讀建立，可交叉複選",
  },
];

export const topicDefinitions: TopicDefinition[] = [
  {
    key: "feng",
    label: "風",
    group: "form",
    description: "十五國風，反映各地歌謠與人情風俗",
    chapters: ["國風"],
  },
  {
    key: "ya",
    label: "雅",
    group: "form",
    description: "小雅與大雅，多見朝會、宴享與政教之詩",
    chapters: ["小雅", "大雅"],
  },
  {
    key: "song",
    label: "頌",
    group: "form",
    description: "周頌、魯頌與商頌，多用於宗廟祭祀與頌讚",
    chapters: ["周頌", "魯頌", "商頌"],
  },
  {
    key: "love",
    label: "愛情",
    group: "content",
    description: "男女相悅、婚戀、思慕、離合與婚姻處境",
    poemIds: [
      1, 3, 9, 14, 20, 22, 23, 34, 42, 45, 48, 58, 62, 63, 64, 66, 69,
      72, 73, 76, 81, 82, 83, 84, 86, 87, 88, 89, 90, 91, 93, 94, 95,
      124, 129, 136, 137, 139, 140, 143, 144, 145,
    ],
  },
  {
    key: "farming",
    label: "農事",
    group: "content",
    description: "採集、耕作、牧養、農時與田野勞動",
    poemIds: [
      2, 8, 13, 15, 50, 112, 113, 154, 190, 209, 210, 211, 212, 226,
      227, 279, 290, 291,
    ],
  },
  {
    key: "service",
    label: "征役",
    group: "content",
    description: "出征、戍守、行役、勞役及其造成的離別",
    poemIds: [
      10, 19, 31, 40, 62, 66, 68, 79, 121, 128, 133, 154, 156, 157,
      167, 168, 169, 177, 178, 179, 185, 191, 194, 203, 204, 205, 206,
      207, 232, 234, 259, 260, 261, 262, 263, 264, 265,
    ],
  },
  {
    key: "ritual",
    label: "祭祀",
    group: "content",
    description: "宗廟、祈年、獻享、祭祖與神靈頌讚",
    poemIds: [
      13, 15, 166, 209, 210, 211, 212, 245, 246, 247, 248, 266, 267, 268,
      269, 270, 271, 272, 273, 274, 275, 276, 277, 278, 279, 280, 281,
      282, 283, 284, 285, 286, 287, 288, 289, 290, 291, 292, 293, 294,
      295, 296, 297, 298, 299, 300, 301, 302, 303, 304, 305,
    ],
  },
  {
    key: "feast",
    label: "宴飲",
    group: "content",
    description: "燕禮、賓客、饗食、飲酒與群體歡會",
    poemIds: [
      161, 164, 165, 166, 171, 172, 173, 174, 175, 179, 180, 208, 214,
      215, 216, 217, 220, 221, 222, 246, 247, 248, 249, 251, 252, 298,
    ],
  },
  {
    key: "homecoming",
    label: "思歸",
    group: "content",
    description: "懷人、懷鄉、久役思歸與遠行離愁",
    poemIds: [
      3, 10, 14, 19, 31, 33, 39, 54, 59, 61, 62, 66, 68, 124, 134,
      149, 156, 167, 168, 169, 188, 204, 207, 226, 232, 234,
    ],
  },
];

export const topicByKey = Object.fromEntries(
  topicDefinitions.map((topic) => [topic.key, topic]),
) as Record<TopicKey, TopicDefinition>;

export function poemMatchesTopic(poem: Poem, topicKey: TopicKey) {
  const topic = topicByKey[topicKey];
  return Boolean(
    topic.chapters?.includes(poem.chapter) || topic.poemIds?.includes(poem.id),
  );
}

export function topicsForPoem(poem: Poem) {
  return topicDefinitions.filter((topic) => poemMatchesTopic(poem, topic.key));
}

export function contentTopicsForPoem(poem: Poem) {
  return topicsForPoem(poem).filter((topic) => topic.group === "content");
}

export function topicCount(topicKey: TopicKey, poems: Poem[]) {
  return poems.filter((poem) => poemMatchesTopic(poem, topicKey)).length;
}

export const topicMethodNote =
  "內容主題為本站建立的非排他閱讀索引，方便探索篇章，不取代《毛詩序》、歷代箋疏或其他學術分類。";
