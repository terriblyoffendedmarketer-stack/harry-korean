#!/usr/bin/env python3
# extract_epub.py — Extracts chapter text from the Korean HP EPUB and saves per-chapter files
# Usage: python3 scripts/extract_epub.py
# Requires: python3
#
# Gotchas:
# - EPUB sections are NOT in chapter order (e.g., Ch4 is in Section0022)
# - Must match by chapter title prefix ("1 장", "2 장", etc.)
# - Section0026 is a continuation of Ch16 (no chapter header)
# - Section0033 is Ch1 of book 2 — skip it
# - Some chapters are split across videos (Ch5, Ch6 have 2 parts each)
# - Ch7+Ch8 are combined in one video

import zipfile
import re
import os
from html.parser import HTMLParser
from pathlib import Path

PROJ = Path("/Users/apple/Documents/Claude Code/harry korean")
EPUB_PATH = PROJ / "[해리 포터 시리즈 01 - 해리 포터 시리즈 01] 해리 포터와 마법사의 돌{J.K. Rowling}(2020, Pottermore Publishing){112606106} libgen.li.epub"
OUT = PROJ / "chapters"
OUT.mkdir(exist_ok=True)


class TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.paragraphs = []
        self.current = []
        self.in_body = False
        self.skip = False
        self.in_p = False

    def handle_starttag(self, tag, attrs):
        if tag == 'body':
            self.in_body = True
        if tag in ('script', 'style'):
            self.skip = True
        if tag in ('p', 'h1', 'h2', 'h3', 'h4', 'div') and self.in_body:
            self.in_p = True
            self.current = []

    def handle_endtag(self, tag):
        if tag == 'body':
            self.in_body = False
        if tag in ('script', 'style'):
            self.skip = False
        if tag in ('p', 'h1', 'h2', 'h3', 'h4', 'div') and self.in_p:
            self.in_p = False
            text = ''.join(self.current).strip()
            if text:
                self.paragraphs.append(text)

    def handle_data(self, data):
        if self.in_body and not self.skip:
            if self.in_p:
                self.current.append(data)
            elif data.strip():
                self.paragraphs.append(data.strip())


def extract_sections(epub_path):
    """Extract text from each EPUB section."""
    sections = {}
    with zipfile.ZipFile(epub_path) as z:
        xhtml_files = sorted([n for n in z.namelist() if 'Section' in n and n.endswith('.xhtml')])
        for path in xhtml_files:
            content = z.read(path).decode('utf-8')
            parser = TextExtractor()
            parser.feed(content)
            if parser.paragraphs:
                full_text = '\n'.join(parser.paragraphs)
                sections[path] = {
                    'paragraphs': parser.paragraphs,
                    'full_text': full_text
                }
    return sections


def identify_chapter(text):
    """Identify which chapter a section belongs to by its opening."""
    m = re.match(r'(\d+)\s*장', text)
    if m:
        return int(m.group(1))
    return None


def main():
    print("Extracting chapters from EPUB...")
    sections = extract_sections(EPUB_PATH)

    chapter_texts = {}
    continuation_section = None

    for path, data in sections.items():
        text = data['full_text']
        ch = identify_chapter(text)

        if ch is not None and ch <= 17:
            chapter_texts[ch] = data['paragraphs']
            print(f"  Chapter {ch}: {len(data['paragraphs'])} paragraphs, {len(text)} chars")
        elif 'Section0026' in path:
            # This is a continuation — likely end of Ch16 or start of Ch17 area
            continuation_section = data['paragraphs']
            print(f"  Continuation section (Section0026): {len(data['paragraphs'])} paragraphs")

    # Append continuation to Ch16 if it exists
    if continuation_section and 16 in chapter_texts:
        chapter_texts[16].extend(continuation_section)
        print(f"  Appended continuation to Chapter 16")

    # Save each chapter
    for ch_num in sorted(chapter_texts.keys()):
        paras = chapter_texts[ch_num]
        outfile = OUT / f"ch{ch_num:02d}.txt"
        with open(outfile, 'w', encoding='utf-8') as f:
            for p in paras:
                f.write(p + '\n')
        print(f"  Saved: {outfile.name} ({len(paras)} paragraphs)")

    # Now create the video-aligned chapter files
    # These match the video structure (some chapters split, some combined)
    print("\nCreating video-aligned chapter files...")

    video_chapter_map = {
        '01_ch01_살아남은아이': [1],
        '02_ch02_사라진유리창': [2],
        '03_ch03_발신자없는편지들': [3],
        '04_ch04_숲지기': [4],
        '05_ch05a_다이애건앨리': [5, 'first_half'],
        '06_ch05b_다이애건앨리2': [5, 'second_half'],
        '07_ch06a_정거장': [6, 'first_half'],
        '08_ch06b_정거장2': [6, 'second_half'],
        '09_ch07-08_기숙사배정_마법약교수': [7, 8],
        '10_ch09_한밤의결투': [9],
        '11_ch10_핼러윈': [10],
        '12_ch11_퀴디치': [11],
        '13_ch12_이레지드거울': [12],
        '14_ch13_니콜라플라멜': [13],
    }

    aligned_dir = PROJ / "chapters_aligned"
    aligned_dir.mkdir(exist_ok=True)

    for video_name, chapters in video_chapter_map.items():
        outfile = aligned_dir / f"{video_name}.txt"
        with open(outfile, 'w', encoding='utf-8') as f:
            if len(chapters) == 2 and chapters[1] == 'first_half':
                ch = chapters[0]
                if ch in chapter_texts:
                    paras = chapter_texts[ch]
                    half = len(paras) // 2
                    for p in paras[:half]:
                        f.write(p + '\n')
            elif len(chapters) == 2 and chapters[1] == 'second_half':
                ch = chapters[0]
                if ch in chapter_texts:
                    paras = chapter_texts[ch]
                    half = len(paras) // 2
                    for p in paras[half:]:
                        f.write(p + '\n')
            else:
                for ch in chapters:
                    if ch in chapter_texts:
                        for p in chapter_texts[ch]:
                            f.write(p + '\n')

        size = outfile.stat().st_size
        print(f"  {video_name}.txt ({size} bytes)")

    print("\nDone! Chapter files ready for alignment.")


if __name__ == '__main__':
    main()
