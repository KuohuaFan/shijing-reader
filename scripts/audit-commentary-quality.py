#!/usr/bin/env python3
import json
import re
from difflib import SequenceMatcher
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def parse_array(path: Path, marker: str):
    source = path.read_text(encoding="utf-8")
    start = source.index(marker) + len(marker)
    end = source.index("\n];", start) + 2
    return json.loads(source[start:end])


def normalize(text: str):
    return re.sub(r"[\W_]+", "", text)


def main():
    poems = parse_array(ROOT / "client/src/data/shijing.ts", "export const poems: Poem[] = ")
    commentaries = parse_array(
        ROOT / "client/src/data/commentaries.ts",
        "export const commentaries: PoemCommentary[] = ",
    )
    flagged = []
    identical = []
    for poem, commentary in zip(poems, commentaries):
        for index, (original, translation) in enumerate(
            zip(poem["stanzas"], commentary["translation"]), start=1
        ):
            original_n = normalize(original)
            translation_n = normalize(translation)
            ratio = SequenceMatcher(None, original_n, translation_n).ratio()
            if original_n == translation_n:
                identical.append((poem["id"], poem["title"], index, ratio))
            if ratio >= 0.78:
                flagged.append((poem["id"], poem["title"], index, round(ratio, 3)))
    print(json.dumps({
        "identicalCount": len(identical),
        "identical": identical,
        "highSimilarityCount": len(flagged),
        "highSimilarity": flagged,
    }, ensure_ascii=False, indent=2))
    if identical:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
