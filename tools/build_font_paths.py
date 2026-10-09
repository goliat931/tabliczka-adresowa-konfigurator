#!/usr/bin/env python3
"""Build browser-ready Oswald outline data from installed static TTF fonts.

Usage:
  python tools/build_font_paths.py --regular PATH --medium PATH --bold PATH
"""
import argparse
import json
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.ttLib import TTFont


def compact_number(value):
    return ("%.2f" % value).rstrip("0").rstrip(".")


def font_data(path):
    font = TTFont(str(path))
    glyph_set = font.getGlyphSet()
    cmap = font.getBestCmap()
    metrics = font["hmtx"].metrics
    glyphs = {}
    characters = {}
    for codepoint, glyph_name in cmap.items():
        if codepoint < 32 or codepoint == 127:
            continue
        if glyph_name not in glyphs:
            pen = SVGPathPen(glyph_set, ntos=compact_number)
            glyph_set[glyph_name].draw(pen)
            glyphs[glyph_name] = {
                "advance": metrics[glyph_name][0],
                "path": pen.getCommands(),
            }
        characters[chr(codepoint)] = glyph_name
    return {
        "unitsPerEm": font["head"].unitsPerEm,
        "characters": characters,
        "glyphs": glyphs,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--regular", required=True, type=Path)
    parser.add_argument("--medium", required=True, type=Path)
    parser.add_argument("--bold", required=True, type=Path)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "assets" / "font-paths.json",
    )
    args = parser.parse_args()
    result = {
        "weights": {
            "400": font_data(args.regular),
            "500": font_data(args.medium),
            "700": font_data(args.bold),
        }
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(result, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print("Generated %s (%d bytes)." % (args.output, args.output.stat().st_size))


if __name__ == "__main__":
    main()
