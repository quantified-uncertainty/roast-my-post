/**
 * Comprehensive test cases for spelling and grammar analysis
 * Each case includes a chunk with known errors and expected highlights
 */

export interface TestCase {
  id: string;
  description: string;
  chunk: {
    content: string;
    startLineNumber: number;
    lines: string[];
  };
  expectedErrors: {
    lineStart: number;
    lineEnd: number;
    highlightedText: string;
    errorType: "spelling" | "grammar" | "punctuation" | "capitalization";
    expectedFix: string;
  }[];
}

export const spellingGrammarTestCases: TestCase[] = [
  {
    id: "basic-spelling",
    description: "Common spelling mistakes",
    chunk: {
      content: "I will recieve the package tommorow.",
      startLineNumber: 10,
      lines: ["I will recieve the package tommorow."]
    },
    expectedErrors: [
      {
        lineStart: 10,
        lineEnd: 10,
        highlightedText: "recieve",
        errorType: "spelling",
        expectedFix: "receive"
      },
      {
        lineStart: 10,
        lineEnd: 10,
        highlightedText: "tommorow",
        errorType: "spelling",
        expectedFix: "tomorrow"
      }
    ]
  },
  {
    id: "subject-verb-agreement",
    description: "Subject-verb disagreement errors",
    chunk: {
      content: "The team are working hard.\nShe have many friends.\nThey is coming tomorrow.",
      startLineNumber: 45,
      lines: [
        "The team are working hard.",
        "She have many friends.",
        "They is coming tomorrow."
      ]
    },
    expectedErrors: [
      {
        lineStart: 45,
        lineEnd: 45,
        highlightedText: "are",
        errorType: "grammar",
        expectedFix: "is"
      },
      {
        lineStart: 46,
        lineEnd: 46,
        highlightedText: "have",
        errorType: "grammar",
        expectedFix: "has"
      },
      {
        lineStart: 47,
        lineEnd: 47,
        highlightedText: "is",
        errorType: "grammar",
        expectedFix: "are"
      }
    ]
  },
  {
    id: "high-line-numbers",
    description: "Chunk starting at high line number",
    chunk: {
      content: "This happend yesterday.\nIts a beautiful day.",
      startLineNumber: 5234,
      lines: [
        "This happend yesterday.",
        "Its a beautiful day."
      ]
    },
    expectedErrors: [
      {
        lineStart: 5234,
        lineEnd: 5234,
        highlightedText: "happend",
        errorType: "spelling",
        expectedFix: "happened"
      },
      {
        lineStart: 5235,
        lineEnd: 5235,
        highlightedText: "Its",
        errorType: "grammar",
        expectedFix: "It's"
      }
    ]
  },
  {
    id: "commonly-confused-words",
    description: "Their/there/they're and similar confusions",
    chunk: {
      content: "Their going to there house.\nYour the best!\nIts time to loose weight.",
      startLineNumber: 100,
      lines: [
        "Their going to there house.",
        "Your the best!",
        "Its time to loose weight."
      ]
    },
    expectedErrors: [
      {
        lineStart: 100,
        lineEnd: 100,
        highlightedText: "Their",
        errorType: "grammar",
        expectedFix: "They're"
      },
      {
        lineStart: 100,
        lineEnd: 100,
        highlightedText: "there",
        errorType: "grammar",
        expectedFix: "their"
      },
      {
        lineStart: 101,
        lineEnd: 101,
        highlightedText: "Your",
        errorType: "grammar",
        expectedFix: "You're"
      },
      {
        lineStart: 102,
        lineEnd: 102,
        highlightedText: "Its",
        errorType: "grammar",
        expectedFix: "It's"
      },
      {
        lineStart: 102,
        lineEnd: 102,
        highlightedText: "loose",
        errorType: "grammar",
        expectedFix: "lose"
      }
    ]
  },
  {
    id: "punctuation-spacing",
    description: "Missing spaces after punctuation",
    chunk: {
      content: "Hello,world!How are you?I'm fine,thanks.",
      startLineNumber: 250,
      lines: ["Hello,world!How are you?I'm fine,thanks."]
    },
    expectedErrors: [
      {
        lineStart: 250,
        lineEnd: 250,
        highlightedText: "Hello,world",
        errorType: "punctuation",
        expectedFix: "Hello, world"
      },
      {
        lineStart: 250,
        lineEnd: 250,
        highlightedText: "world!How",
        errorType: "punctuation",
        expectedFix: "world! How"
      },
      {
        lineStart: 250,
        lineEnd: 250,
        highlightedText: "you?I'm",
        errorType: "punctuation",
        expectedFix: "you? I'm"
      },
      {
        lineStart: 250,
        lineEnd: 250,
        highlightedText: "fine,thanks",
        errorType: "punctuation",
        expectedFix: "fine, thanks"
      }
    ]
  },
  {
    id: "capitalization-errors",
    description: "Proper nouns and sentence capitalization",
    chunk: {
      content: "i visited the united states last summer.\nthe amazon river is in south america.\njohn and mary went to paris.",
      startLineNumber: 789,
      lines: [
        "i visited the united states last summer.",
        "the amazon river is in south america.",
        "john and mary went to paris."
      ]
    },
    expectedErrors: [
      {
        lineStart: 789,
        lineEnd: 789,
        highlightedText: "i",
        errorType: "capitalization",
        expectedFix: "I"
      },
      {
        lineStart: 789,
        lineEnd: 789,
        highlightedText: "united states",
        errorType: "capitalization",
        expectedFix: "United States"
      },
      {
        lineStart: 790,
        lineEnd: 790,
        highlightedText: "the",
        errorType: "capitalization",
        expectedFix: "The"
      },
      {
        lineStart: 790,
        lineEnd: 790,
        highlightedText: "amazon river",
        errorType: "capitalization",
        expectedFix: "Amazon River"
      },
      {
        lineStart: 790,
        lineEnd: 790,
        highlightedText: "south america",
        errorType: "capitalization",
        expectedFix: "South America"
      },
      {
        lineStart: 791,
        lineEnd: 791,
        highlightedText: "john",
        errorType: "capitalization",
        expectedFix: "John"
      },
      {
        lineStart: 791,
        lineEnd: 791,
        highlightedText: "mary",
        errorType: "capitalization",
        expectedFix: "Mary"
      },
      {
        lineStart: 791,
        lineEnd: 791,
        highlightedText: "paris",
        errorType: "capitalization",
        expectedFix: "Paris"
      }
    ]
  },
  {
    id: "verb-tense-consistency",
    description: "Mixed verb tenses",
    chunk: {
      content: "Yesterday I go to the store and buy milk.\nShe was reading when he comes in.",
      startLineNumber: 1500,
      lines: [
        "Yesterday I go to the store and buy milk.",
        "She was reading when he comes in."
      ]
    },
    expectedErrors: [
      {
        lineStart: 1500,
        lineEnd: 1500,
        highlightedText: "go",
        errorType: "grammar",
        expectedFix: "went"
      },
      {
        lineStart: 1500,
        lineEnd: 1500,
        highlightedText: "buy",
        errorType: "grammar",
        expectedFix: "bought"
      },
      {
        lineStart: 1501,
        lineEnd: 1501,
        highlightedText: "comes",
        errorType: "grammar",
        expectedFix: "came"
      }
    ]
  },
  {
    id: "article-usage",
    description: "Incorrect use of a/an",
    chunk: {
      content: "I saw a elephant at the zoo.\nShe is an university student.\nHe ate a apple for lunch.",
      startLineNumber: 3000,
      lines: [
        "I saw a elephant at the zoo.",
        "She is an university student.",
        "He ate a apple for lunch."
      ]
    },
    expectedErrors: [
      {
        lineStart: 3000,
        lineEnd: 3000,
        highlightedText: "a elephant",
        errorType: "grammar",
        expectedFix: "an elephant"
      },
      {
        lineStart: 3001,
        lineEnd: 3001,
        highlightedText: "an university",
        errorType: "grammar",
        expectedFix: "a university"
      },
      {
        lineStart: 3002,
        lineEnd: 3002,
        highlightedText: "a apple",
        errorType: "grammar",
        expectedFix: "an apple"
      }
    ]
  },
  {
    id: "double-negatives",
    description: "Double negative constructions",
    chunk: {
      content: "I don't need no help.\nShe hasn't got nothing to wear.\nWe didn't see nobody there.",
      startLineNumber: 444,
      lines: [
        "I don't need no help.",
        "She hasn't got nothing to wear.",
        "We didn't see nobody there."
      ]
    },
    expectedErrors: [
      {
        lineStart: 444,
        lineEnd: 444,
        highlightedText: "don't need no",
        errorType: "grammar",
        expectedFix: "don't need any"
      },
      {
        lineStart: 445,
        lineEnd: 445,
        highlightedText: "hasn't got nothing",
        errorType: "grammar",
        expectedFix: "hasn't got anything"
      },
      {
        lineStart: 446,
        lineEnd: 446,
        highlightedText: "didn't see nobody",
        errorType: "grammar",
        expectedFix: "didn't see anybody"
      }
    ]
  },
  {
    id: "preposition-errors",
    description: "Incorrect prepositions",
    chunk: {
      content: "I'm good in math.\nShe's interested on science.\nWe arrived to the airport.",
      startLineNumber: 8901,
      lines: [
        "I'm good in math.",
        "She's interested on science.",
        "We arrived to the airport."
      ]
    },
    expectedErrors: [
      {
        lineStart: 8901,
        lineEnd: 8901,
        highlightedText: "in math",
        errorType: "grammar",
        expectedFix: "at math"
      },
      {
        lineStart: 8902,
        lineEnd: 8902,
        highlightedText: "interested on",
        errorType: "grammar",
        expectedFix: "interested in"
      },
      {
        lineStart: 8903,
        lineEnd: 8903,
        highlightedText: "arrived to",
        errorType: "grammar",
        expectedFix: "arrived at"
      }
    ]
  },
  {
    id: "missing-punctuation",
    description: "Missing periods and commas",
    chunk: {
      content: "This is a sentence without a period\nHowever I disagree with you\nYes I can help you",
      startLineNumber: 666,
      lines: [
        "This is a sentence without a period",
        "However I disagree with you",
        "Yes I can help you"
      ]
    },
    expectedErrors: [
      {
        lineStart: 666,
        lineEnd: 666,
        highlightedText: "period",
        errorType: "punctuation",
        expectedFix: "period."
      },
      {
        lineStart: 667,
        lineEnd: 667,
        highlightedText: "However I",
        errorType: "punctuation",
        expectedFix: "However, I"
      },
      {
        lineStart: 668,
        lineEnd: 668,
        highlightedText: "Yes I",
        errorType: "punctuation",
        expectedFix: "Yes, I"
      }
    ]
  },
  {
    id: "apostrophe-errors",
    description: "Missing or incorrect apostrophes",
    chunk: {
      content: "The dogs bone is buried.\nIts been a long day.\nThe childrens toys are everywhere.",
      startLineNumber: 1234,
      lines: [
        "The dogs bone is buried.",
        "Its been a long day.",
        "The childrens toys are everywhere."
      ]
    },
    expectedErrors: [
      {
        lineStart: 1234,
        lineEnd: 1234,
        highlightedText: "dogs",
        errorType: "punctuation",
        expectedFix: "dog's"
      },
      {
        lineStart: 1235,
        lineEnd: 1235,
        highlightedText: "Its",
        errorType: "grammar",
        expectedFix: "It's"
      },
      {
        lineStart: 1236,
        lineEnd: 1236,
        highlightedText: "childrens",
        errorType: "punctuation",
        expectedFix: "children's"
      }
    ]
  },
  {
    id: "word-order",
    description: "Incorrect word order",
    chunk: {
      content: "Never I have seen such a thing.\nAlways she is late.\nOnly yesterday I realized the truth.",
      startLineNumber: 999,
      lines: [
        "Never I have seen such a thing.",
        "Always she is late.",
        "Only yesterday I realized the truth."
      ]
    },
    expectedErrors: [
      {
        lineStart: 999,
        lineEnd: 999,
        highlightedText: "Never I have",
        errorType: "grammar",
        expectedFix: "I have never"
      },
      {
        lineStart: 1000,
        lineEnd: 1000,
        highlightedText: "Always she is",
        errorType: "grammar",
        expectedFix: "She is always"
      }
      // Note: "Only yesterday I realized" is actually correct emphasis
    ]
  },
  {
    id: "redundancy",
    description: "Redundant words and phrases",
    chunk: {
      content: "The reason why is because I forgot.\nI returned back home.\nPlease repeat again what you said.",
      startLineNumber: 777,
      lines: [
        "The reason why is because I forgot.",
        "I returned back home.",
        "Please repeat again what you said."
      ]
    },
    expectedErrors: [
      {
        lineStart: 777,
        lineEnd: 777,
        highlightedText: "reason why is because",
        errorType: "grammar",
        expectedFix: "reason is that"
      },
      {
        lineStart: 778,
        lineEnd: 778,
        highlightedText: "returned back",
        errorType: "grammar",
        expectedFix: "returned"
      },
      {
        lineStart: 779,
        lineEnd: 779,
        highlightedText: "repeat again",
        errorType: "grammar",
        expectedFix: "repeat"
      }
    ]
  },
  {
    id: "split-infinitives",
    description: "Split infinitives (sometimes acceptable)",
    chunk: {
      content: "I want to quickly run to the store.\nShe needs to carefully consider her options.",
      startLineNumber: 2222,
      lines: [
        "I want to quickly run to the store.",
        "She needs to carefully consider her options."
      ]
    },
    expectedErrors: [
      // Note: Split infinitives are often acceptable in modern English
      // The LLM might or might not flag these
    ]
  },
  {
    id: "comparative-superlative",
    description: "Incorrect comparative and superlative forms",
    chunk: {
      content: "This is more better than that.\nShe is the most prettiest girl.\nHe runs more faster than me.",
      startLineNumber: 4444,
      lines: [
        "This is more better than that.",
        "She is the most prettiest girl.",
        "He runs more faster than me."
      ]
    },
    expectedErrors: [
      {
        lineStart: 4444,
        lineEnd: 4444,
        highlightedText: "more better",
        errorType: "grammar",
        expectedFix: "better"
      },
      {
        lineStart: 4445,
        lineEnd: 4445,
        highlightedText: "most prettiest",
        errorType: "grammar",
        expectedFix: "prettiest"
      },
      {
        lineStart: 4446,
        lineEnd: 4446,
        highlightedText: "more faster",
        errorType: "grammar",
        expectedFix: "faster"
      }
    ]
  },
  {
    id: "sentence-fragments",
    description: "Incomplete sentences",
    chunk: {
      content: "Because I was tired.\nWhen the sun sets.\nAlthough he tried hard.",
      startLineNumber: 6789,
      lines: [
        "Because I was tired.",
        "When the sun sets.",
        "Although he tried hard."
      ]
    },
    expectedErrors: [
      {
        lineStart: 6789,
        lineEnd: 6789,
        highlightedText: "Because I was tired.",
        errorType: "grammar",
        expectedFix: "[needs main clause]"
      },
      {
        lineStart: 6790,
        lineEnd: 6790,
        highlightedText: "When the sun sets.",
        errorType: "grammar",
        expectedFix: "[needs main clause]"
      },
      {
        lineStart: 6791,
        lineEnd: 6791,
        highlightedText: "Although he tried hard.",
        errorType: "grammar",
        expectedFix: "[needs main clause]"
      }
    ]
  },
  {
    id: "number-agreement",
    description: "Number disagreement",
    chunk: {
      content: "There is many problems here.\nHere are the solution.\nThe data are processed.",
      startLineNumber: 3333,
      lines: [
        "There is many problems here.",
        "Here are the solution.",
        "The data are processed."
      ]
    },
    expectedErrors: [
      {
        lineStart: 3333,
        lineEnd: 3333,
        highlightedText: "is many problems",
        errorType: "grammar",
        expectedFix: "are many problems"
      },
      {
        lineStart: 3334,
        lineEnd: 3334,
        highlightedText: "are the solution",
        errorType: "grammar",
        expectedFix: "is the solution"
      }
      // Note: "data are" is technically correct (plural) but often "data is" is accepted
    ]
  },
  {
    id: "mixed-constructions",
    description: "Mixed grammatical constructions",
    chunk: {
      content: "The reason is because of the weather.\nBy working hard is how you succeed.\nThe question is is whether to go.",
      startLineNumber: 5555,
      lines: [
        "The reason is because of the weather.",
        "By working hard is how you succeed.",
        "The question is is whether to go."
      ]
    },
    expectedErrors: [
      {
        lineStart: 5555,
        lineEnd: 5555,
        highlightedText: "is because of",
        errorType: "grammar",
        expectedFix: "is that"
      },
      {
        lineStart: 5556,
        lineEnd: 5556,
        highlightedText: "By working hard is how",
        errorType: "grammar",
        expectedFix: "Working hard is how"
      },
      {
        lineStart: 5557,
        lineEnd: 5557,
        highlightedText: "is is",
        errorType: "grammar",
        expectedFix: "is"
      }
    ]
  },
  {
    id: "complex-multi-line",
    description: "Errors spanning multiple lines",
    chunk: {
      content: "The quick brown\nfox jump over\nthe lazy dogs.",
      startLineNumber: 9999,
      lines: [
        "The quick brown",
        "fox jump over",
        "the lazy dogs."
      ]
    },
    expectedErrors: [
      {
        lineStart: 10000,
        lineEnd: 10000,
        highlightedText: "jump",
        errorType: "grammar",
        expectedFix: "jumps"
      },
      {
        lineStart: 10001,
        lineEnd: 10001,
        highlightedText: "dogs",
        errorType: "grammar",
        expectedFix: "dog"
      }
    ]
  }
];