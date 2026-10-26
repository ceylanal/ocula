/**
 * Calculates the Optimal Recognition Point (ORP) for a single word or chunk.
 * For single words, highlights the slightly-left-of-center character where the human eye naturally fixates.
 */
export interface ORPParts {
  prefix: string;
  orpChar: string;
  suffix: string;
}

export function getORPParts(text: string): ORPParts {
  const clean = text.trim();
  if (!clean) {
    return { prefix: "", orpChar: "", suffix: "" };
  }

  const len = clean.length;
  let orpIndex = 0;

  if (len <= 1) {
    orpIndex = 0;
  } else if (len >= 2 && len <= 5) {
    orpIndex = 1;
  } else if (len >= 6 && len <= 9) {
    orpIndex = 2;
  } else if (len >= 10 && len <= 13) {
    orpIndex = 3;
  } else {
    orpIndex = Math.floor(len * 0.3);
  }

  return {
    prefix: clean.slice(0, orpIndex),
    orpChar: clean.charAt(orpIndex),
    suffix: clean.slice(orpIndex + 1),
  };
}

/**
 * Splits an array of paragraphs into flat words and paragraph metadata
 * so that RSVP and Magic Pacer modes can share the exact same word index.
 */
export interface TokenizedWord {
  word: string;
  globalIndex: number;
  paragraphIndex: number;
  wordIndexInParagraph: number;
}

export function tokenizeParagraphs(paragraphs: string[]): {
  words: TokenizedWord[];
  paragraphsOfWords: TokenizedWord[][];
} {
  const words: TokenizedWord[] = [];
  const paragraphsOfWords: TokenizedWord[][] = [];
  let globalIndex = 0;

  paragraphs.forEach((para, pIdx) => {
    const rawWords = para
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0);
    const pTokens: TokenizedWord[] = [];

    rawWords.forEach((w, wIdx) => {
      const token: TokenizedWord = {
        word: w,
        globalIndex,
        paragraphIndex: pIdx,
        wordIndexInParagraph: wIdx,
      };
      words.push(token);
      pTokens.push(token);
      globalIndex++;
    });

    if (pTokens.length > 0) {
      paragraphsOfWords.push(pTokens);
    }
  });

  return { words, paragraphsOfWords };
}

/**
 * Computes delay multiplier for RSVP chunk based on punctuation
 * to give the brain natural micro-pauses at commas and sentence ends.
 */
export function getPunctuationDelayMultiplier(chunkText: string): number {
  const trimmed = chunkText.trim();
  if (/[.!?…:;]$/.test(trimmed)) {
    return 1.65;
  }
  if (/[,—–-]$/.test(trimmed)) {
    return 1.3;
  }
  if (trimmed.length > 12) {
    return 1.15;
  }
  return 1.0;
}

export function countWordsInParagraphs(paragraphs: string[]): number {
  return paragraphs.reduce((acc, p) => {
    const count = p
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
    return acc + count;
  }, 0);
}
