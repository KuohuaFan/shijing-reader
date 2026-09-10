#!/usr/bin/env python3
import concurrent.futures as cf
import json
import os
import re
import threading
import time
from pathlib import Path
from openai import OpenAI

ROOT = Path(__file__).resolve().parents[1]
POEM_SOURCE = ROOT / "client/src/data/shijing.ts"
DRAFT_CACHE = ROOT / ".cache/commentaries"
REVIEW_CACHE = ROOT / ".cache/commentaries-reviewed"
OUTPUT = ROOT / "client/src/data/commentaries.ts"
MODEL = os.environ.get("SHIJING_REVIEW_MODEL", "gpt-5")
GROUP_SIZE = int(os.environ.get("SHIJING_REVIEW_GROUP_SIZE", "5"))
MAX_WORKERS = int(os.environ.get("SHIJING_REVIEW_WORKERS", "6"))
print_lock = threading.Lock()


def parse_poems():
    source = POEM_SOURCE.read_text(encoding="utf-8")
    marker = "export const poems: Poem[] = "
    start = source.index(marker) + len(marker)
    end = source.index("\n];", start) + 2
    return json.loads(source[start:end])


def load_drafts(poems):
    drafts = {}
    for poem in poems:
        path = DRAFT_CACHE / f"{poem['id']:03d}.json"
        if not path.exists():
            raise RuntimeError(f"Missing draft: {poem['id']}")
        drafts[poem["id"]] = json.loads(path.read_text(encoding="utf-8"))
    return drafts


def item_schema():
    return {
        "type": "object",
        "properties": {
            "poemId": {"type": "integer"},
            "translation": {"type": "array", "items": {"type": "string"}},
            "annotations": {
                "type": "array",
                "minItems": 3,
                "maxItems": 6,
                "items": {
                    "type": "object",
                    "properties": {
                        "term": {"type": "string"},
                        "explanation": {"type": "string"},
                    },
                    "required": ["term", "explanation"],
                    "additionalProperties": False,
                },
            },
            "readingNote": {"type": "string"},
        },
        "required": ["poemId", "translation", "annotations", "readingNote"],
        "additionalProperties": False,
    }


def validate(poem, item):
    if item.get("poemId") != poem["id"]:
        return False
    if len(item.get("translation", [])) != len(poem["stanzas"]):
        return False
    original = "".join(poem["stanzas"])
    notes = item.get("annotations", [])
    return (
        all(isinstance(text, str) and len(text.strip()) >= 4 for text in item["translation"])
        and 3 <= len(notes) <= 6
        and all(
            note.get("term", "") in original
            and len(note.get("explanation", "").strip()) > 0
            for note in notes
        )
        and len(item.get("readingNote", "").strip()) >= 8
    )


def review_group(group, drafts, attempt=1):
    first, last = group[0]["id"], group[-1]["id"]
    target = REVIEW_CACHE / f"{first:03d}-{last:03d}.json"
    if target.exists():
        cached = json.loads(target.read_text(encoding="utf-8"))
        if len(cached) == len(group) and all(validate(poem, item) for poem, item in zip(group, cached)):
            return cached

    material = [
        {
            "poemId": poem["id"],
            "title": poem["title"],
            "chapter": poem["chapter"],
            "section": poem["section"],
            "original": poem["stanzas"],
            "draft": drafts[poem["id"]],
        }
        for poem in group
    ]
    schema = {
        "type": "json_schema",
        "json_schema": {
            "name": f"reviewed_shijing_{first}_{last}",
            "strict": True,
            "schema": {
                "type": "object",
                "properties": {
                    "items": {
                        "type": "array",
                        "minItems": len(group),
                        "maxItems": len(group),
                        "items": item_schema(),
                    }
                },
                "required": ["items"],
                "additionalProperties": False,
            },
        },
    }
    prompt = """你是《詩經》數位讀本的資深編輯。請逐篇審訂下列機器生成的白話翻譯與詞語註釋，以原文為最高依據。

必要規則：
1. 保持 poemId 及逐章 translation 順序與章數，修正誤解、過度字面、杜撰的人名史事或不自然現代語句。
2. 註釋 term 必須是原文中連續、逐字存在的文字；每篇選3至6項真正影響理解的古詞，說明應精確但避免把爭議說成定論。
3. readingNote 一至兩句，說明主要情境、意象及必要的詮釋分歧，不宣稱唯一篇旨。
4. 全部使用繁體中文；不使用 Markdown；不要加入來源未支持的細節。
5. 特別留意頌詩、政治詩、祭祀詩中的主語、稱謂、地名與典故，不可望文生義。

待審資料：
""" + json.dumps(material, ensure_ascii=False)

    client = OpenAI()
    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {
                "role": "system",
                "content": "你是謹慎的先秦詩歌編輯，專門修正白話譯注中的望文生義與過度斷言。",
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
        and all(validate(poem, item) for poem, item in zip(group, items))
    )
    if not valid:
        if attempt < 3:
            time.sleep(attempt * 2)
            return review_group(group, drafts, attempt + 1)
        raise RuntimeError(f"Review validation failed for {first}-{last}")
    target.write_text(json.dumps(items, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    with print_lock:
        print(f"Reviewed {first:03d}-{last:03d}", flush=True)
    return items


def write_typescript(items):
    payload = json.dumps(items, ensure_ascii=False, indent=2)
    content = f'''/**
 * 《詩經》白話翻譯與詞語註釋。
 * 由 gpt-5-mini 生成初稿，再由 {MODEL} 依本站原文進行第二階段編輯覆核；
 * 仍未經人類學者逐篇核定，不取代權威譯注、歷代箋疏或古籍校勘本。
 */
export type PoemCommentary = {{
  poemId: number;
  translation: string[];
  annotations: Array<{{ term: string; explanation: string }}>;
  readingNote: string;
}};

export const commentaryModel = "gpt-5-mini → {MODEL}";
export const commentaryReviewed = false;
export const commentaries: PoemCommentary[] = {payload};
export const commentaryByPoemId = Object.fromEntries(
  commentaries.map((item) => [item.poemId, item]),
) as Record<number, PoemCommentary>;
'''
    OUTPUT.write_text(content, encoding="utf-8")


def main():
    poems = parse_poems()
    drafts = load_drafts(poems)
    groups = [poems[index:index + GROUP_SIZE] for index in range(0, len(poems), GROUP_SIZE)]
    REVIEW_CACHE.mkdir(parents=True, exist_ok=True)
    completed = {}
    with cf.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {executor.submit(review_group, group, drafts): group for group in groups}
        for future in cf.as_completed(futures):
            group = futures[future]
            try:
                for item in future.result():
                    completed[item["poemId"]] = item
            except Exception as exc:
                print(f"FAILED {group[0]['id']}-{group[-1]['id']}: {exc}", flush=True)
    missing = [poem["id"] for poem in poems if poem["id"] not in completed]
    if missing:
        raise RuntimeError(f"Missing reviewed commentaries: {missing}")
    write_typescript([completed[poem["id"]] for poem in poems])
    print(f"Reviewed and validated {len(completed)} commentaries with {MODEL}.")


if __name__ == "__main__":
    main()
