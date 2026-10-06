// Parses the Project Gutenberg plain text into parts and chapters.
//
// Returned shape:
//   {
//     title, author, words,
//     parts:    [{ name, years, chapters: [chapter, ...] }],
//     chapters: [chapter, ...]   // every chapter in reading order
//   }
//   chapter = { numeral, lines, partIndex, indexInPart, index, words, wordsBefore }

const PART_HEADING = /^(BOOK [A-Z]+|FIRST EPILOGUE|SECOND EPILOGUE)(?::\s*(.*?))?\s*$/;
const CHAPTER_HEADING = /^CHAPTER ([IVXLC]+|\d+)\s*$/;
const GUTENBERG_FOOTER = /^End of (the )?Project Gutenberg|^\*\*\* ?END OF/i;

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

function titleCase(s) {
  return s.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

function countWords(lines) {
  return lines.join(' ').split(/\s+/).filter(Boolean).length;
}

// Drops the Project Gutenberg license text at the end, if present.
function stripFooter(lines) {
  const end = lines.findIndex((line) => GUTENBERG_FOOTER.test(line));
  return end === -1 ? lines : lines.slice(0, end);
}

// Groups lines into parts and chapters. Anything before the first chapter
// heading (the front matter) is skipped.
function splitParts(lines) {
  const parts = [];
  let part = null;
  let chapter = null;

  for (const line of lines) {
    const partMatch = line.match(PART_HEADING);
    if (partMatch) {
      part = {
        name: titleCase(partMatch[1]),
        years: (partMatch[2] || '').replace(/\s*-\s*/g, '–'),
        chapters: [],
      };
      parts.push(part);
      chapter = null;
      continue;
    }

    const chapterMatch = part && line.match(CHAPTER_HEADING);
    if (chapterMatch) {
      const label = chapterMatch[1];
      chapter = { numeral: /^\d+$/.test(label) ? toRoman(Number(label)) : label, lines: [] };
      part.chapters.push(chapter);
      continue;
    }

    if (chapter) chapter.lines.push(line);
  }

  return parts;
}

export function parseBook(text) {
  const lines = stripFooter(text.replace(/\r\n?/g, '\n').split('\n'));
  const [title, byline] = lines.filter((line) => line.trim()).slice(0, 2);
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

  return {
    title: title || 'War and Peace',
    author: (byline || '').replace(/^By\s+/i, ''),
    parts,
    chapters,
    words,
  };
}
