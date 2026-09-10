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
SOURCE = ROOT / "client/src/data/shijing.ts"
CACHE = ROOT / ".cache/commentaries"
OUTPUT = ROOT / "client/src/data/commentaries.ts"
MODEL = os.environ.get("SHIJING_TRANSLATION_MODEL", "gpt-5-mini")
MAX_WORKERS = int(os.environ.get("SHIJING_TRANSLATION_WORKERS", "6"))
print_lock = threading.Lock()


def parse_poems():
    source = SOURCE.read_text(encoding="utf-8")
    marker = "export const poems: Poem[] = "
    start = source.index(marker) + len(marker)
    end = source.index("\n];", start) + 2
    poems = json.loads(source[start:end])
    if len(poems) != 305:
        raise RuntimeError(f"Expected 305 poems, found {len(poems)}")
    return poems


def schema_for(poem):
    return {
        "type": "json_schema",
        "json_schema": {
            "name": f"shijing_commentary_{poem['id']}",
            "strict": True,
            "schema": {
                "type": "object",
                "properties": {
                    "poemId": {"type": "integer", "const": poem["id"]},
                    "translation": {
                        "type": "array",
                        "minItems": len(poem["stanzas"]),
                        "maxItems": len(poem["stanzas"]),
                        "items": {"type": "string"},
                    },
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
            },
        },
    }


def validate(poem, item):
    if item.get("poemId") != poem["id"]:
        return False
    translations = item.get("translation")
    if not isinstance(translations, list) or len(translations) != len(poem["stanzas"]):
        return False
    if any(not isinstance(text, str) or len(text.strip()) < 4 for text in translations):
        return False
    annotations = item.get("annotations")
    if not isinstance(annotations, list) or not 3 <= len(annotations) <= 6:
        return False
    original = "".join(poem["stanzas"])
    for note in annotations:
        term = note.get("term", "").strip()
        explanation = note.get("explanation", "").strip()
        if not term or term not in original or not explanation:
            return False
    return isinstance(item.get("readingNote"), str) and len(item["readingNote"].strip()) >= 8


def generate_one(poem, attempt=1):
    target = CACHE / f"{poem['id']:03d}.json"
    if target.exists():
        cached = json.loads(target.read_text(encoding="utf-8"))
        if validate(poem, cached):
            return cached

    client = OpenAI()
    original = "\n".join(
        f"第{index + 1}章：{stanza}" for index, stanza in enumerate(poem["stanzas"])
    )
    special_term_rule = (
        "本篇不得以篇名『杕杜』作為 term；請只從『湑湑』『踽踽』『同父』『比焉』『佽焉』『箐箐』『睘睘』『同姓』選擇註詞。"
        if poem["id"] == 119
        else ""
    )
    prompt = f"""請為《詩經》單篇製作繁體中文閱讀輔助資料。
篇次：{poem['id']}
篇名：{poem['title']}
分部：{poem['chapter']}・{poem['section']}
原文：
{original}

規則：
1. translation 必須逐章對應，陣列長度與原文章數完全一致；譯成清楚、自然、忠於意象的現代繁體中文，不增添原文沒有的人名、史事或定論。
2. annotations 選 3 至 6 個原文中確實出現、且最影響理解的古詞；term 必須逐字取自原文，explanation 用繁體中文簡潔說明詩中語義。
3. readingNote 用一至兩句提示主要情境、意象或閱讀分歧；不得把有爭議的篇旨說成唯一結論。
4. 不使用 Markdown，不引用未提供的版本，不聲稱已經人工校訂。
{special_term_rule}
"""
    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {
                "role": "system",
                "content": "你是嚴謹的先秦詩歌閱讀輔助編輯。輸出必須是繁體中文且符合 JSON Schema。",
            },
            {"role": "user", "content": prompt},
        ],
        response_format=schema_for(poem),
        max_completion_tokens=1800,
        extra_body={"reasoning": {"effort": "minimal"}},
    )
    item = json.loads(response.choices[0].message.content)
    if not validate(poem, item):
        if attempt < 3:
            time.sleep(attempt)
            return generate_one(poem, attempt + 1)
        raise RuntimeError(f"Validation failed for poem {poem['id']} {poem['title']}")
    target.write_text(
        json.dumps(item, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    with print_lock:
        print(f"[{poem['id']:03d}/305] {poem['title']}", flush=True)
    return item


def write_typescript(items):
    payload = json.dumps(items, ensure_ascii=False, indent=2)
    content = f'''/**
 * 《詩經》白話翻譯與詞語註釋。
 * 由 {MODEL} 依本站原文生成，作為閱讀輔助初稿；尚未經人工逐篇覆核，
 * 不取代權威譯注、歷代箋疏或古籍校勘本。
 */
export type PoemCommentary = {{
  poemId: number;
  translation: string[];
  annotations: Array<{{ term: string; explanation: string }}>;
  readingNote: string;
}};

export const commentaryModel = "{MODEL} → gpt-5";
export const commentaryReviewed = false;
export const commentaries: PoemCommentary[] = {payload};
export const commentaryByPoemId = Object.fromEntries(
  commentaries.map((item) => [item.poemId, item]),
) as Record<number, PoemCommentary>;
'''
    OUTPUT.write_text(content, encoding="utf-8")


def main():
    poems = parse_poems()
    CACHE.mkdir(parents=True, exist_ok=True)
    completed = {}
    with cf.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {executor.submit(generate_one, poem): poem for poem in poems}
        for future in cf.as_completed(futures):
            poem = futures[future]
            try:
                completed[poem["id"]] = future.result()
            except Exception as exc:
                print(f"FAILED {poem['id']} {poem['title']}: {exc}", flush=True)
    missing = [poem["id"] for poem in poems if poem["id"] not in completed]
    if missing:
        raise RuntimeError(f"Missing commentary for poem ids: {missing}")
    items = [completed[poem["id"]] for poem in poems]
    write_typescript(items)
    print(f"Generated and validated {len(items)} commentaries with {MODEL}.")


if __name__ == "__main__":
    main()
