// Parses 1984.txt into parts and chapters.
//
// The text marks each part with a "* Chapter One *" heading and separates the
// chapters inside a part with "x x x" lines. The appendix is its own part.
//
// Returned shape:
//   {
//     title, author, words,
//     parts:    [{ name, years, chapters: [chapter, ...] }],
//     chapters: [chapter, ...]   // every chapter in reading order
//   }
//   chapter = { numeral, lines, partIndex, indexInPart, index, words, wordsBefore }
//
// `years` is the part's subtitle (only the appendix has one).

import { BOOK_AUTHOR, BOOK_TITLE } from './config.js';

const PART_HEADING = /^\* Chapter (One|Two|Three) \*$/;
const APPENDIX_HEADING = /^\* APPENDIX\. (.+?) \*$/;
const CHAPTER_BREAK = /^x x x$/;

const ROMAN_NUMERALS = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
  [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
  [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
];

function toRoman(n) {
  let result = '';
  for (const [value, numeral] of ROMAN_NUMERALS) {
    while (n >= value) {
      result += numeral;
      n -= value;
    }
  }
  return result;
}

function countWords(lines) {
  return lines.join(' ').split(/\s+/).filter(Boolean).length;
}

// Groups lines into parts and chapters. Anything before the first part
// heading (the front matter) is skipped.
function splitParts(lines) {
  const parts = [];
  let part = null;
  let chapter = null;

  function startPart(name, years = '') {
    part = { name, years, chapters: [] };
    parts.push(part);
    startChapter();
  }

  function startChapter() {
    chapter = { numeral: toRoman(part.chapters.length + 1), lines: [] };
    part.chapters.push(chapter);
  }

  for (const line of lines) {
    const text = line.trim();

    const partMatch = text.match(PART_HEADING);
    if (partMatch) {
      startPart(`Part ${partMatch[1]}`);
      continue;
    }

    const appendixMatch = text.match(APPENDIX_HEADING);
    if (appendixMatch) {
      startPart('Appendix', appendixMatch[1]);
      continue;
    }

    if (part && CHAPTER_BREAK.test(text)) {
      // A break right after a part heading would otherwise open an empty chapter.
      if (chapter.lines.some((l) => l.trim())) startChapter();
      continue;
    }

    if (chapter) chapter.lines.push(line);
  }

  return parts;
}

export function parseBook(text) {
  const lines = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n').split('\n');
  const parts = splitParts(lines);

  // Flatten into reading order and record where each chapter sits.
  const chapters = [];
  let words = 0;
  parts.forEach((part, partIndex) => {
    part.chapters.forEach((chapter, indexInPart) => {
      chapter.partIndex = partIndex;
      chapter.indexInPart = indexInPart;
      chapter.index = chapters.length;
      chapter.words = countWords(chapter.lines);
      chapter.wordsBefore = words;
      words += chapter.words;
      chapters.push(chapter);
    });
  });

  return { title: BOOK_TITLE, author: BOOK_AUTHOR, parts, chapters, words };
}
