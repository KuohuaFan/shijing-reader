#!/usr/bin/env python3
import concurrent.futures as cf
import json
import os
import re
import threading
import time
from difflib import SequenceMatcher
from pathlib import Path
from openai import OpenAI

ROOT = Path(__file__).resolve().parents[1]
POEM_SOURCE = ROOT / "client/src/data/shijing.ts"
COMMENTARY_SOURCE = ROOT / "client/src/data/commentaries.ts"
CACHE = ROOT / ".cache/translations-modernized"
MODEL = os.environ.get("SHIJING_MODERNIZE_MODEL", "gpt-5")
GROUP_SIZE = int(os.environ.get("SHIJING_MODERNIZE_GROUP_SIZE", "5"))
MAX_WORKERS = int(os.environ.get("SHIJING_MODERNIZE_WORKERS", "6"))
print_lock = threading.Lock()


def parse_array(path: Path, marker: str):
    source = path.read_text(encoding="utf-8")
    start = source.index(marker) + len(marker)
    end = source.index("\n];", start) + 2
    return json.loads(source[start:end])


def normalize(text):
    return re.sub(r"[\W_]+", "", text)


def validate_translation(poem, item):
    translations = item.get("translation", [])
    if item.get("poemId") != poem["id"] or len(translations) != len(poem["stanzas"]):
        return False
    for original, translation in zip(poem["stanzas"], translations):
        if not isinstance(translation, str) or len(translation.strip()) < 4:
            return False
        if normalize(original) == normalize(translation):
            return False
        if SequenceMatcher(None, normalize(original), normalize(translation)).ratio() >= 0.94:
            return False
    return True


def review_group(group, commentaries, attempt=1):
    first, last = group[0]["id"], group[-1]["id"]
    target = CACHE / f"{first:03d}-{last:03d}.json"
    if target.exists():
        cached = json.loads(target.read_text(encoding="utf-8"))
        if len(cached) == len(group) and all(
            validate_translation(poem, item) for poem, item in zip(group, cached)
        ):
            return cached

    payload = [
        {
            "poemId": poem["id"],
            "title": poem["title"],
            "chapter": poem["chapter"],
            "section": poem["section"],
            "original": poem["stanzas"],
            "currentTranslation": commentaries[poem["id"] - 1]["translation"],
            "annotations": commentaries[poem["id"] - 1]["annotations"],
        }
        for poem in group
    ]
    item_schema = {
        "type": "object",
        "properties": {
            "poemId": {"type": "integer"},
            "translation": {"type": "array", "items": {"type": "string"}},
        },
        "required": ["poemId", "translation"],
        "additionalProperties": False,
    }
    schema = {
        "type": "json_schema",
        "json_schema": {
            "name": f"modern_shijing_{first}_{last}",
            "strict": True,
            "schema": {
                "type": "object",
                "properties": {
                    "items": {
                        "type": "array",
                        "minItems": len(group),
                        "maxItems": len(group),
                        "items": item_schema,
                    }
                },
                "required": ["items"],
                "additionalProperties": False,
            },
        },
    }
    prompt = """請把下列《詩經》逐章譯文真正改寫為現代繁體中文，供一般讀者理解。

嚴格規則：
1. 每篇 translation 必須逐章對應，章數不變；每章都必須有實質白話改寫，不能照抄原文，也不能只換標點。
2. 使用自然完整的現代句子，翻出省略的主語、動作與關係；專名或關鍵古詞可保留，但要在句中說清楚。
3. 忠於原文，不增加原文沒有的確定人名、年代、事件、心理或因果；有歧義時用中性語氣。
4. 保留反覆、呼告、比興與節奏感，但避免堆疊「之、其、焉、矣、維、曰」等古漢語虛詞。
5. currentTranslation 僅供參考；若它仍近似原文或有誤，必須改正。annotations 可協助判斷詞義。
6. 全部使用繁體中文，不使用 Markdown。

資料：
""" + json.dumps(payload, ensure_ascii=False)

    client = OpenAI()
    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {
                "role": "system",
                "content": "你是專精先秦詩歌的繁體中文翻譯編輯，目標是忠實而自然的現代白話。",
            },
            {"role": "user", "content": prompt},
        ],
        response_format=schema,
        max_completion_tokens=10000,
        extra_body={"reasoning": {"effort": "low"}},
    )
    items = json.loads(response.choices[0].message.content)["items"]
    items.sort(key=lambda item: item["poemId"])
    valid = (
        [item["poemId"] for item in items] == [poem["id"] for poem in group]
        and all(validate_translation(poem, item) for poem, item in zip(group, items))
    )
    if not valid:
        if attempt < 3:
            time.sleep(attempt * 2)
            return review_group(group, commentaries, attempt + 1)
        raise RuntimeError(f"Modernization validation failed for {first}-{last}")
    target.write_text(json.dumps(items, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    with print_lock:
        print(f"Modernized {first:03d}-{last:03d}", flush=True)
    return items


def write_typescript(commentaries):
    payload = json.dumps(commentaries, ensure_ascii=False, indent=2)
    content = f'''/**
 * 《詩經》白話翻譯與詞語註釋。
 * 由 gpt-5-mini 生成初稿，再由 gpt-5 依本站原文進行編輯覆核與白話現代化；
 * 仍未經人類學者逐篇核定，不取代權威譯注、歷代箋疏或古籍校勘本。
 */
export type PoemCommentary = {{
  poemId: number;
  translation: string[];
  annotations: Array<{{ term: string; explanation: string }}>;
  readingNote: string;
}};

export const commentaryModel = "gpt-5-mini → gpt-5";
export const commentaryReviewed = false;
export const commentaries: PoemCommentary[] = {payload};
export const commentaryByPoemId = Object.fromEntries(
  commentaries.map((item) => [item.poemId, item]),
) as Record<number, PoemCommentary>;
'''
    COMMENTARY_SOURCE.write_text(content, encoding="utf-8")


def main():
    poems = parse_array(POEM_SOURCE, "export const poems: Poem[] = ")
    commentaries = parse_array(
        COMMENTARY_SOURCE, "export const commentaries: PoemCommentary[] = "
    )
    groups = [poems[index:index + GROUP_SIZE] for index in range(0, len(poems), GROUP_SIZE)]
    CACHE.mkdir(parents=True, exist_ok=True)
    completed = {}
    with cf.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {
            executor.submit(review_group, group, commentaries): group for group in groups
        }
        for future in cf.as_completed(futures):
            group = futures[future]
            try:
                for item in future.result():
                    completed[item["poemId"]] = item["translation"]
            except Exception as exc:
                print(f"FAILED {group[0]['id']}-{group[-1]['id']}: {exc}", flush=True)
    missing = [poem["id"] for poem in poems if poem["id"] not in completed]
    if missing:
        raise RuntimeError(f"Missing modernized translations: {missing}")
    for commentary in commentaries:
        commentary["translation"] = completed[commentary["poemId"]]
    write_typescript(commentaries)
    print(f"Modernized and validated {len(commentaries)} translations with {MODEL}.")


if __name__ == "__main__":
    main()
