#!/usr/bin/env python3
import json
import re
from pathlib import Path
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "client/src/data/shijing.ts"
EDITION = ROOT / "client/src/data/edition.ts"
ASSETS = ROOT / "client/public/assets"
OUTPUT = ASSETS / "og"
HERO = ASSETS / "shijing-hero.webp"
WIDTH, HEIGHT = 1200, 630

SERIF_REGULAR = "/usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc"
SERIF_BOLD = "/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc"
SANS_REGULAR = "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"
SANS_MEDIUM = "/usr/share/fonts/opentype/noto/NotoSansCJK-Medium.ttc"

COLORS = {
    "國風": (153, 51, 43),
    "小雅": (89, 91, 77),
    "大雅": (102, 73, 43),
    "周頌": (55, 73, 67),
    "魯頌": (80, 68, 101),
    "商頌": (105, 53, 50),
}


def parse_poems():
    source = SOURCE.read_text(encoding="utf-8")
    marker = "export const poems: Poem[] = "
    start = source.index(marker) + len(marker)
    end = source.index("\n];", start) + 2
    poems = json.loads(source[start:end])
    if len(poems) != 305:
        raise RuntimeError(f"Expected 305 poems, found {len(poems)}")
    return poems


def parse_edition():
    source = EDITION.read_text(encoding="utf-8")
    values = dict(re.findall(r'(editorName|dateModified|version): "([^"]+)"', source))
    required = {"editorName", "dateModified", "version"}
    if set(values) != required:
        raise RuntimeError("Unable to read edition metadata")
    return values


def font(path, size):
    return ImageFont.truetype(path, size, index=2)


def fit_cover(image, size):
    target_ratio = size[0] / size[1]
    source_ratio = image.width / image.height
    if source_ratio > target_ratio:
        crop_width = int(image.height * target_ratio)
        left = (image.width - crop_width) // 2
        image = image.crop((left, 0, left + crop_width, image.height))
    else:
        crop_height = int(image.width / target_ratio)
        top = (image.height - crop_height) // 2
        image = image.crop((0, top, image.width, top + crop_height))
    return image.resize(size, Image.Resampling.LANCZOS)


def chinese_lines(text, max_chars=23, max_lines=2):
    text = text.strip()
    lines = []
    while text and len(lines) < max_lines:
        if len(text) <= max_chars:
            lines.append(text)
            text = ""
            break
        cut = max_chars
        for punctuation in "。；，、！？":
            position = text.rfind(punctuation, 0, max_chars + 1)
            if position >= max_chars // 2:
                cut = position + 1
                break
        lines.append(text[:cut])
        text = text[cut:]
    if text and lines:
        lines[-1] = lines[-1].rstrip("，。、；") + "…"
    return lines


def base_canvas(accent):
    hero = fit_cover(Image.open(HERO).convert("RGB"), (WIDTH, HEIGHT))
    hero = ImageEnhance.Color(hero).enhance(0.55)
    hero = ImageEnhance.Contrast(hero).enhance(0.88)
    hero = hero.filter(ImageFilter.GaussianBlur(0.35))

    paper = Image.new("RGB", (WIDTH, HEIGHT), (244, 239, 225))
    paper.paste(hero, (0, 0))
    veil = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    draw = ImageDraw.Draw(veil)
    draw.rectangle((0, 0, WIDTH, HEIGHT), fill=(246, 241, 227, 74))
    draw.polygon([(0, 0), (785, 0), (610, HEIGHT), (0, HEIGHT)], fill=(247, 242, 228, 234))
    draw.rectangle((0, 0, 15, HEIGHT), fill=(*accent, 255))
    draw.line((92, 104, 190, 104), fill=(*accent, 210), width=3)
    return Image.alpha_composite(paper.convert("RGBA"), veil)


def draw_footer(draw, edition):
    draw.text((92, 555), "詩經 · 線上讀本", font=font(SANS_MEDIUM, 21), fill=(49, 50, 44, 235))
    footer = f"數位校訂：{edition['editorName']}  ·  更新：{edition['dateModified']}"
    draw.text((92, 590), footer, font=font(SANS_REGULAR, 15), fill=(81, 80, 71, 220))


def create_home(edition):
    canvas = base_canvas((153, 51, 43))
    draw = ImageDraw.Draw(canvas)
    draw.text((92, 72), "先秦詩歌總集 · 風雅頌", font=font(SANS_MEDIUM, 20), fill=(83, 81, 70, 230))
    draw.text((86, 150), "詩經", font=font(SERIF_BOLD, 118), fill=(35, 37, 31, 255))
    draw.text((94, 304), "三百零五篇全文 · 主題分類 · 原文朗讀", font=font(SERIF_REGULAR, 31), fill=(153, 51, 43, 245))
    draw.text((94, 374), "詩三百，一言以蔽之，思無邪。", font=font(SERIF_REGULAR, 25), fill=(64, 64, 56, 238))
    draw_footer(draw, edition)
    canvas.convert("RGB").save(ASSETS / "og-home.jpg", "JPEG", quality=84, optimize=True, progressive=True)


def create_poem(poem, edition):
    accent = COLORS.get(poem["chapter"], (153, 51, 43))
    canvas = base_canvas(accent)
    draw = ImageDraw.Draw(canvas)
    number = f"{poem['id']:03d}"
    draw.text((92, 66), f"詩經 · {poem['chapter']} · {poem['section']}", font=font(SANS_MEDIUM, 21), fill=(76, 76, 66, 235))
    draw.text((850, 55), number, font=font(SERIF_BOLD, 116), fill=(*accent, 55))
    draw.text((88, 145), poem["title"], font=font(SERIF_BOLD, 94), fill=(34, 36, 30, 255))

    first_stanza = poem["stanzas"][0]
    lines = chinese_lines(first_stanza)
    y = 308
    for line in lines:
        draw.text((94, y), line, font=font(SERIF_REGULAR, 28), fill=(59, 60, 52, 245))
        y += 53

    draw.rounded_rectangle((92, 475, 294, 516), radius=4, fill=(*accent, 228))
    draw.text((112, 483), f"第 {poem['id']} 篇 · {len(poem['stanzas'])} 章", font=font(SANS_MEDIUM, 17), fill=(249, 246, 235, 255))
    draw_footer(draw, edition)
    output = OUTPUT / f"poem-{poem['id']}.jpg"
    canvas.convert("RGB").save(output, "JPEG", quality=82, optimize=True, progressive=True)


def main():
    poems = parse_poems()
    edition = parse_edition()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    create_home(edition)
    for poem in poems:
        create_poem(poem, edition)
    generated = list(OUTPUT.glob("poem-*.jpg"))
    if len(generated) != 305:
        raise RuntimeError(f"Expected 305 social images, generated {len(generated)}")
    print(f"Generated {len(generated)} poem cards plus og-home.jpg at {WIDTH}x{HEIGHT}.")


if __name__ == "__main__":
    main()
