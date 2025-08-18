import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
// jest globals are available by default

import { exactSearch } from "../exactSearch";
import { llmSearch } from "../llmSearch";
import { uFuzzySearch } from "../uFuzzySearch";
import { markdownAwareFuzzySearch } from "../markdownAwareFuzzySearch";

interface ComprehensiveTestCase {
  name: string;
  document: string;
  query: string;
  expectedText: string; // What we expect to find in the document
  searchesThatShouldPass: ("ufuzzy" | "llm")[];
  note?: string;
}

// Long document samples for realistic testing
const LONG_MARKDOWN_DOC = `# Introduction to Machine Learning

Machine learning is a subset of artificial intelligence (AI) that provides systems the ability to automatically learn and improve from experience without being explicitly programmed. Machine learning focuses on the development of computer programs that can access data and use it to learn for themselves.

## Types of Machine Learning

### Supervised Learning
Supervised learning is the machine learning task of learning a function that maps an input to an output based on example input-output pairs. It infers a function from labeled training data consisting of a set of training examples.

### Unsupervised Learning
Unsupervised learning is a type of machine learning that looks for previously undetected patterns in a data set with no pre-existing labels and with a minimum of human supervision. In contrast to supervised learning that usually makes use of human-labeled data, unsupervised learning, also known as self-organization allows for modeling of probability densities over inputs.

### Reinforcement Learning
Reinforcement learning is an area of machine learning concerned with how intelligent agents ought to take actions in an environment in order to maximize the notion of cumulative reward. Reinforcement learning is one of three basic machine learning paradigms, alongside supervised learning and unsupervised learning.

## Applications

Machine learning has a wide variety of applications, including:
- Natural language processing
- Computer vision
- Speech recognition
- Email filtering
- Medical diagnosis
- Stock market trading

## Conclusion

As we continue to generate more data, machine learning will become increasingly vital for solving problems and discovering new insights.`;

const LONG_TECHNICAL_DOC = `The implementation of distributed systems requires careful consideration of various architectural patterns and design principles. One of the most fundamental challenges in distributed computing is achieving consensus among multiple nodes in the presence of failures.

The CAP theorem, also known as Brewer's theorem, states that it is impossible for a distributed data store to simultaneously provide more than two out of the following three guarantees: Consistency, Availability, and Partition tolerance. This theorem has profound implications for system design and has led to various approaches for handling distributed state.

Byzantine fault tolerance (BFT) is another critical concept in distributed systems. Named after the Byzantine Generals Problem, it refers to the challenge of reaching agreement in a distributed system where some components may fail in arbitrary ways, including sending conflicting information to different parts of the system. Practical Byzantine Fault Tolerance (PBFT) was one of the first algorithms to provide a practical solution to this problem with reasonable performance characteristics.

Modern distributed systems often employ consensus algorithms like Raft or Paxos to maintain consistency across replicas. Raft, designed to be more understandable than Paxos, uses a leader-follower model where one node acts as the leader and coordinates all changes to the replicated state. The algorithm ensures safety (never returning an incorrect result) under all non-Byzantine conditions, including network delays, partitions, and packet loss, duplication, and reordering.

When implementing microservices architectures, service discovery becomes a crucial component. Tools like Consul, Etcd, or ZooKeeper provide distributed key-value stores that can be used for service registration and discovery. These systems themselves are distributed and must handle the same challenges they help other systems solve.

Load balancing in distributed systems can be achieved through various strategies: round-robin, least connections, weighted distribution, or more sophisticated approaches like consistent hashing. The choice of load balancing strategy can significantly impact system performance and reliability.`;

// Comprehensive test cases covering various edge cases and scenarios
const testCases: ComprehensiveTestCase[] = [
  // Basic typos and variations
  {
    name: "Simple typo - single character substitution",
    document: "The quick brown fox jumps over the lazy dog.",
    query: "quick browm fox",

    expectedText: "quick brown fox",
    searchesThatShouldPass: ["ufuzzy", "llm"],
    note: "Single character typo should be found by both",
  },
  {
    name: "Transposition typo",
    document: "Please remember to check your email regularly.",
    query: "remmeber to check",

    expectedText: "remember to check",
    searchesThatShouldPass: ["ufuzzy", "llm"],
  },
  {
    name: "Missing character",
    document: "The implementation is complete and tested.",
    query: "implementaton is complete",

    expectedText: "implementation is complete",
    searchesThatShouldPass: ["ufuzzy", "llm"],
  },
  {
    name: "Extra character",
    document: "We need to analyze the data carefully.",
    query: "analyize the data",

    expectedText: "analyze the data",
    searchesThatShouldPass: ["ufuzzy", "llm"],
  },

  // Whitespace variations
  {
    name: "Multiple spaces collapsed",
    document: "The   quick    brown   fox jumps.",
    query: "The quick brown fox",

    expectedText: "The   quick    brown   fox",
    searchesThatShouldPass: ["ufuzzy", "llm"],
  },
  {
    name: "Line breaks as spaces",
    document: "The quick\nbrown fox\njumps over the lazy dog.",
    query: "quick brown fox jumps",

    expectedText: "quick\nbrown fox\njumps",
    searchesThatShouldPass: ["llm"],
    note: "uFuzzy may struggle with line breaks",
  },
  {
    name: "Non-breaking spaces",
    document: "Price: $50\u00A0USD per unit",
    query: "Price: $50 USD",

    expectedText: "Price: $50\u00A0USD",
    searchesThatShouldPass: ["ufuzzy", "llm"],
    note: "uFuzzy may not normalize Unicode spaces",
  },

  // Punctuation variations
  {
    name: "Smart quotes vs straight quotes",
    document: 'She said, "Hello world!" and smiled.',
    query: 'She said, "Hello world!"',

    expectedText: 'She said, "Hello world!"',
    searchesThatShouldPass: ["ufuzzy", "llm"],
    note: "Quote normalization needed",
  },
  {
    name: "Em dash vs hyphen",
    document: "The result—unexpected as it was—changed everything.",
    query: "result--unexpected",

    expectedText: "result—unexpected",
    searchesThatShouldPass: ["ufuzzy", "llm"],
  },
  {
    name: "Ellipsis variations",
    document: "The journey continues... but where will it lead?",
    query: "continues… but",

    expectedText: "continues... but",
    searchesThatShouldPass: ["ufuzzy", "llm"],
  },

  // Case variations
  {
    name: "Different capitalization",
    document: "The United States Of America Is A Country.",
    query: "united states of america",

    expectedText: "United States Of America",
    searchesThatShouldPass: ["ufuzzy", "llm"],
  },
  {
    name: "Mixed case with typo",
    document: "JavaScript is a Programming Language.",
    query: "javascript is a programing",

    expectedText: "JavaScript is a Programming",
    searchesThatShouldPass: ["ufuzzy", "llm"],
  },

  // Complex scenarios
  {
    name: "Multiple typos in phrase",
    document: "The comprehensive analysis revealed interesting patterns.",
    query: "comprehansive analisis revealed",

    expectedText: "comprehensive analysis revealed",
    searchesThatShouldPass: ["ufuzzy", "llm"],
    note: "Multiple errors might challenge uFuzzy",
  },
  {
    name: "Partial word matching",
    document: "The implementation details are documented thoroughly.",
    query: "implement details are doc",

    expectedText: "implementation details are documented",
    searchesThatShouldPass: ["llm"],
  },
  {
    name: "Reordered words",
    document: "The red big house on the hill.",
    query: "big red house",

    expectedText: "red big house",
    searchesThatShouldPass: ["llm"],
    note: "Word order matters for exact matching",
  },

  // Unicode and special characters
  {
    name: "Unicode characters",
    document: "The café serves excellent résumé workshops.",
    query: "cafe serves excellent resume",

    expectedText: "café serves excellent résumé",
    searchesThatShouldPass: ["llm"],
    note: "Unicode normalization requires semantic understanding",
  },
  {
    name: "Emojis in text",
    document: "Great job! 🎉 Keep up the good work! 👍",
    query: "Great job! Keep up",

    expectedText: "Great job! 🎉 Keep up",
    searchesThatShouldPass: ["ufuzzy", "llm"],
  },

  // Edge cases
  {
    name: "Query at document start",
    document: "Hello world! This is a test document.",
    query: "Hello world!",

    expectedText: "Hello world!",
    searchesThatShouldPass: ["ufuzzy", "llm"],
  },
  {
    name: "Query at document end",
    document: "This is a test document. Goodbye!",
    query: "Goodbye!",

    expectedText: "Goodbye!",
    searchesThatShouldPass: ["ufuzzy", "llm"],
  },
  {
    name: "Very short query",
    document: "The IP address is 192.168.1.1",
    query: "IP",

    expectedText: "IP",
    searchesThatShouldPass: ["ufuzzy", "llm"],
  },

  // Very short queries - challenging cases
  {
    name: "Single character query - uncommon letter",
    document: "Find the X in this sentence.",
    query: "X",

    expectedText: "X",
    searchesThatShouldPass: ["ufuzzy", "llm"],
  },
  {
    name: "Two character abbreviation",
    document: "The AI system uses ML algorithms.",
    query: "ML",

    expectedText: "ML",
    searchesThatShouldPass: ["ufuzzy", "llm"],
  },
  // Very long queries
  {
    name: "Long query with exact match",
    document:
      "The comprehensive analysis of the quantum mechanical properties of subatomic particles reveals fascinating insights into the fundamental nature of reality as we understand it through modern physics.",
    query:
      "comprehensive analysis of the quantum mechanical properties of subatomic particles reveals fascinating insights",

    expectedText:
      "comprehensive analysis of the quantum mechanical properties of subatomic particles reveals fascinating insights",
    searchesThatShouldPass: ["ufuzzy", "llm"],
  },
  {
    name: "Long query with typos throughout",
    document:
      "The implementation of distributed systems requires careful consideration of network latency, fault tolerance, and data consistency across multiple nodes in the cluster.",
    query:
      "implementaton of distribted systems requres careful consideraton of network latancy",

    expectedText:
      "implementation of distributed systems requires careful consideration of network latency",
    searchesThatShouldPass: ["llm"],
    note: "Multiple typos in long query",
  },
  {
    name: "Very long query spanning multiple sentences",
    document:
      "Machine learning has revolutionized many fields. It enables computers to learn from data without explicit programming. This technology powers everything from recommendation systems to autonomous vehicles.",
    query:
      "Machine learning has revolutionized many fields. It enables computers to learn from data",

    expectedText:
      "Machine learning has revolutionized many fields. It enables computers to learn from data",
    searchesThatShouldPass: ["ufuzzy", "llm"],
  },

  // Difficult punctuation and formatting
  {
    name: "Code snippet with special characters",
    document:
      "The function signature is: async function getData(id: string): Promise<Data | null> { ... }",
    query: "getData(id: string): Promise<Data",

    expectedText: "getData(id: string): Promise<Data",
    searchesThatShouldPass: ["ufuzzy", "llm"],
  },
  {
    name: "Mathematical expression",
    document:
      "The equation E = mc² demonstrates the relationship between energy and mass.",
    query: "E = mc2",

    expectedText: "E = mc²",
    searchesThatShouldPass: ["ufuzzy", "llm"],
    note: "Superscript vs regular 2",
  },
  {
    name: "URL with query parameters",
    document:
      "Visit https://example.com/search?q=test&page=1&limit=10 for more information.",
    query: "example.com/search?q=test&page=1",

    expectedText: "example.com/search?q=test&page=1",
    searchesThatShouldPass: ["ufuzzy", "llm"],
  },
  {
    name: "Email address",
    document: "Contact us at support@company.co.uk for assistance.",
    query: "support@company.co.uk",

    expectedText: "support@company.co.uk",
    searchesThatShouldPass: ["ufuzzy", "llm"],
  },

  // Difficult whitespace and formatting
  {
    name: "Query with tabs and spaces mixed",
    document: "Column1\t\tColumn2\t\tColumn3\nData1\t\tData2\t\tData3",
    query: "Column1  Column2  Column3",

    expectedText: "Column1\t\tColumn2\t\tColumn3",
    searchesThatShouldPass: ["ufuzzy", "llm"],
  },
  {
    name: "Markdown formatting",
    document: "This is **bold text** and this is *italic text* in markdown.",
    query: "bold text and this is italic text",

    expectedText: "**bold text** and this is *italic text*",
    searchesThatShouldPass: ["ufuzzy", "llm"],
  },
  {
    name: "HTML entities",
    document: "The price is &lt;$100&gt; which is a good deal.",
    query: "price is <$100>",

    expectedText: "price is &lt;$100&gt;",
    searchesThatShouldPass: ["ufuzzy", "llm"],
  },

  // Challenging word boundaries
  {
    name: "Partial word at boundaries",
    document: "The preprocessing step is important.",
    query: "reprocessing step",

    expectedText: "preprocessing step",
    searchesThatShouldPass: ["ufuzzy", "llm"],
  },
  {
    name: "Compound words vs separated",
    document: "The database contains usernames and passwords.",
    query: "data base contains user names",

    expectedText: "database contains usernames",
    searchesThatShouldPass: ["llm"],
    note: "Compound word variations require semantic understanding",
  },
  {
    name: "Hyphenated words",
    document: "This is a state-of-the-art solution.",
    query: "state of the art solution",

    expectedText: "state-of-the-art solution",
    searchesThatShouldPass: ["ufuzzy", "llm"],
  },

  // Numeric variations
  {
    name: "Numbers written as words",
    document: "There are 5 apples and twenty oranges.",
    query: "five apples and 20 oranges",

    expectedText: "5 apples and twenty oranges",
    searchesThatShouldPass: ["llm"],
    note: "Number format conversion requires semantic understanding",
  },
  {
    name: "Roman numerals",
    document: "Chapter III discusses the topic in detail.",
    query: "Chapter 3 discusses",

    expectedText: "Chapter III discusses",
    searchesThatShouldPass: ["llm"],
    note: "Roman numeral conversion requires semantic understanding",
  },
  {
    name: "Scientific notation",
    document: "The value is 1.23e-4 in scientific notation.",
    query: "value is 0.000123",

    expectedText: "value is 1.23e-4",
    searchesThatShouldPass: ["llm"],
    note: "Scientific notation conversion requires semantic understanding",
  },

  // Multiple languages and scripts
  {
    name: "Mixed English and Spanish",
    document: "The biblioteca is the library in Spanish.",
    query: "library is the biblioteca",

    expectedText: "biblioteca is the library",
    searchesThatShouldPass: ["llm"],
    note: "Cross-language matching and word reordering requires semantic understanding",
  },
  {
    name: "Greek letters in math",
    document: "The angle θ (theta) is measured in radians.",
    query: "angle theta is measured",

    expectedText: "angle θ (theta) is measured",
    searchesThatShouldPass: ["ufuzzy", "llm"],
  },

  // Ambiguous queries
  {
    name: "Query that appears multiple times - should find first",
    document: "Test this. Another test here. Final test done.",
    query: "test",

    expectedText: "Test",
    searchesThatShouldPass: ["ufuzzy", "llm"],
    note: "Should find first occurrence",
  },
  {
    name: "Overlapping possible matches",
    document: "The theme of the theater is theatrical.",
    query: "the",

    expectedText: "The",
    searchesThatShouldPass: ["ufuzzy", "llm"],
    note: "Should find first occurrence of ambiguous pattern",
  },

  // Context-dependent searches
  {
    name: "Abbreviation expansion",
    document: "The USA (United States of America) is a country.",
    query: "United States of America is a country",

    expectedText: "United States of America) is a country",
    searchesThatShouldPass: ["ufuzzy", "llm"],
  },

  // Extreme edge cases
  {
    name: "Query is entire document",
    document: "Short document.",
    query: "Short document.",

    expectedText: "Short document.",
    searchesThatShouldPass: ["ufuzzy", "llm"],
  },
  {
    name: "Repeated characters",
    document: "Wooooow! That's amaaaaaazing!",
    query: "Wow! That's amazing!",

    expectedText: "Wooooow! That's amaaaaaazing!",
    searchesThatShouldPass: ["ufuzzy", "llm"],
  },
  {
    name: "Emoji variations",
    document: "I love pizza 🍕 so much!",
    query: "I love pizza :pizza: so much!",

    expectedText: "I love pizza 🍕 so much!",
    searchesThatShouldPass: ["ufuzzy", "llm"],
    note: "Emoji format conversion requires semantic understanding",
  },

  // Real-world difficult cases
  {
    name: "Academic citation",
    document:
      "As noted by Smith et al. (2023), the results indicate significant improvements.",
    query: "Smith and colleagues 2023 results indicate",

    expectedText: "Smith et al. (2023), the results indicate",
    searchesThatShouldPass: ["ufuzzy", "llm"],
    note: "Academic terminology expansion requires semantic understanding",
  },
  {
    name: "Technical jargon with typos",
    document: "Implement the OAuth2 authentication flow with PKCE extension.",
    query: "Implement OAuth 2.0 autentication flow with PKSE",

    expectedText: "Implement the OAuth2 authentication flow with PKCE",
    searchesThatShouldPass: ["ufuzzy", "llm"],
    note: "Technical terminology variations with typos require semantic understanding",
  },
  {
    name: "Medical terminology",
    document: "The patient presented with dyspnea and tachycardia.",
    query: "patient had present with dyspnea",

    expectedText: "patient presented with dyspnea",
    searchesThatShouldPass: ["ufuzzy", "llm"],
    note: "Medical terminology requires semantic understanding",
  },

  // Nested structures
  {
    name: "JSON structure",
    document: '{"user": {"name": "John", "age": 30}, "active": true}',
    query: '"name": "John", "age": 30',

    expectedText: '"name": "John", "age": 30',
    searchesThatShouldPass: ["ufuzzy", "llm"],
  },
  {
    name: "Nested parentheses",
    document: "The formula (a + (b * (c - d))) is complex.",
    query: "formula (a + (b * (c - d)))",

    expectedText: "formula (a + (b * (c - d)))",
    searchesThatShouldPass: ["ufuzzy", "llm"],
  },

  // Boundary testing
  {
    name: "Single word with internal typo",
    document: "This is a test of misspelling detection.",
    query: "mispelling",

    expectedText: "misspelling",
    searchesThatShouldPass: ["ufuzzy", "llm"],
  },
  {
    name: "Query spans entire document with typos",
    document: "Hello world!",
    query: "Helo wurld!",

    expectedText: "Hello world!",
    searchesThatShouldPass: ["ufuzzy", "llm"],
  },

  // Long document tests
  {
    name: "Find exact phrase in long markdown document",
    document: LONG_MARKDOWN_DOC,
    query: "machine learning paradigms",

    expectedText: "machine learning paradigms",
    searchesThatShouldPass: ["ufuzzy", "llm"],
  },
  {
    name: "Find phrase with typos in long markdown document",
    document: LONG_MARKDOWN_DOC,
    query: "mashine learning paradims",

    expectedText: "machine learning paradigms",
    searchesThatShouldPass: ["llm"],
  },
  {
    name: "Find markdown heading in long document",
    document: LONG_MARKDOWN_DOC,
    query: "## Types of Machine Learning",

    expectedText: "## Types of Machine Learning",
    searchesThatShouldPass: ["ufuzzy", "llm"],
  },
  {
    name: "Find list item in markdown",
    document: LONG_MARKDOWN_DOC,
    query: "- Computer vision",

    expectedText: "- Computer vision",
    searchesThatShouldPass: ["ufuzzy", "llm"],
  },
  {
    name: "Cross-paragraph search in long document",
    document: LONG_MARKDOWN_DOC,
    query: "human supervision. In contrast to supervised learning",

    expectedText: "human supervision. In contrast to supervised learning",
    searchesThatShouldPass: ["ufuzzy", "llm"],
  },
  {
    name: "Paraphrased content in long technical document",
    document: LONG_TECHNICAL_DOC,
    query: "distributed systems need to carefully think about architecture",

    expectedText:
      "implementation of distributed systems requires careful consideration of various architectural patterns",
    searchesThatShouldPass: ["llm"],
    note: "Paraphrasing requires semantic understanding",
  },
  {
    name: "Technical acronym in context",
    document: LONG_TECHNICAL_DOC,
    query: "Byzantine Fault Tolerance PBFT algorithm",

    expectedText:
      "Practical Byzantine Fault Tolerance (PBFT) was one of the first algorithms",
    searchesThatShouldPass: ["ufuzzy", "llm"],
  },
  {
    name: "Find technical term with variations",
    document: LONG_TECHNICAL_DOC,
    query: "Cap theorem (Brewers theorem)",

    expectedText: "CAP theorem, also known as Brewer's theorem",
    searchesThatShouldPass: ["ufuzzy", "llm"],
  },
  {
    name: "Complex technical phrase with typos",
    document: LONG_TECHNICAL_DOC,
    query: "leder-folower model where one node act as the leder",

    expectedText: "leader-follower model where one node acts as the leader",
    searchesThatShouldPass: ["ufuzzy", "llm"],
  },
  {
    name: "Very long query from technical document",
    document: LONG_TECHNICAL_DOC,
    query:
      "Byzantine fault tolerance (BFT) is another critical concept in distributed systems. Named after the Byzantine Generals Problem, it refers to the challenge",

    expectedText:
      "Byzantine fault tolerance (BFT) is another critical concept in distributed systems. Named after the Byzantine Generals Problem, it refers to the challenge",
    searchesThatShouldPass: ["ufuzzy", "llm"],
  },
  {
    name: "Find parenthetical content",
    document: LONG_TECHNICAL_DOC,
    query: "(never returning an incorrect result)",

    expectedText: "(never returning an incorrect result)",
    searchesThatShouldPass: ["ufuzzy", "llm"],
  },
  {
    name: "Multi-line search in technical document",
    document: LONG_TECHNICAL_DOC,
    query:
      "packet loss, duplication, and reordering.\n\nWhen implementing microservices",

    expectedText:
      "packet loss, duplication, and reordering.\n\nWhen implementing microservices",
    searchesThatShouldPass: ["ufuzzy", "llm"],
  },
  {
    name: "Search across markdown sections",
    document: LONG_MARKDOWN_DOC,
    query: "Stock market trading\n\n## Conclusion",

    expectedText: "Stock market trading\n\n## Conclusion",
    searchesThatShouldPass: ["ufuzzy", "llm"],
  },
  {
    name: "Semantic search in long document",
    document: LONG_MARKDOWN_DOC,
    query: "ML helps computers learn without programming",

    expectedText:
      "Machine learning is a subset of artificial intelligence (AI) that provides systems the ability to automatically learn and improve from experience without being explicitly programmed",
    searchesThatShouldPass: ["llm"],
    note: "Semantic expansion requires understanding",
  },
  {
    name: "Find technical tools mentioned",
    document: LONG_TECHNICAL_DOC,
    query: "service discovery tools like Consul or Etcd",

    expectedText: "Tools like Consul, Etcd, or ZooKeeper",
    searchesThatShouldPass: ["ufuzzy", "llm"],
  },
  {
    name: "Partial sentence from middle of paragraph",
    document: LONG_TECHNICAL_DOC,
    query: "reasonable performance characteristics. Modern distributed",

    expectedText:
      "reasonable performance characteristics.\n\nModern distributed",
    searchesThatShouldPass: ["ufuzzy", "llm"],
  },
  {
    name: "Find load balancing strategies description",
    document: LONG_TECHNICAL_DOC,
    query: "round robin, least connections, weighted",

    expectedText: "round-robin, least connections, weighted distribution",
    searchesThatShouldPass: ["ufuzzy", "llm"],
  },
  {
    name: "Long query with markdown formatting",
    document: LONG_MARKDOWN_DOC,
    query:
      "### Supervised Learning\nSupervised learning is the machine learning task",

    expectedText:
      "### Supervised Learning\nSupervised learning is the machine learning task",
    searchesThatShouldPass: ["ufuzzy", "llm"],
  },
  {
    name: "Find conclusion section with context",
    document: LONG_MARKDOWN_DOC,
    query: "As we generate more data, ML becomes vital",

    expectedText:
      "As we continue to generate more data, machine learning will become increasingly vital",
    searchesThatShouldPass: ["llm"],
    note: "Paraphrasing and abbreviation expansion requires semantic understanding",
  },
];

describe("Comprehensive Text Location Search Tests", () => {
  console.log(`Running ${testCases.length} comprehensive test cases`);
  
  // Show LLM test status
  if (process.env.RUN_LLM_TESTS !== 'true') {
    console.log('\n📌 LLM tests SKIPPED (set RUN_LLM_TESTS=true to run)\n');
  } else {
    console.log('\n✅ LLM tests ENABLED\n');
  }

  // Count expectations
  const ufuzzyExpected = testCases.filter((tc) =>
    tc.searchesThatShouldPass.includes("ufuzzy")
  ).length;
  const llmExpected = testCases.filter((tc) =>
    tc.searchesThatShouldPass.includes("llm")
  ).length;
  console.log(
    `uFuzzy should pass: ${ufuzzyExpected}/${testCases.length} tests`
  );
  console.log(`LLM should pass: ${llmExpected}/${testCases.length} tests`);

  // Test the tests - validate that expectedText can be found with exactSearch
  describe("Test Case Validation", () => {
    it("should be able to find expectedText using exactSearch for all test cases", () => {
      const invalidCases: {
        name: string;
        expectedText: string;
        reason: string;
      }[] = [];

      for (const testCase of testCases) {
        const { document, expectedText, name } = testCase;
        const exactResult = exactSearch(expectedText, document);

        if (!exactResult) {
          invalidCases.push({
            name,
            expectedText,
            reason: `expectedText "${expectedText}" not found in document with exactSearch`,
          });
        }
      }

      if (invalidCases.length > 0) {
        const errorMessage = invalidCases
          .map(({ name, expectedText, reason }) => {
            const testCase = testCases.find((tc) => tc.name === name);
            return `${name}:\n  ${reason}\n  Document: "${testCase?.document.slice(0, 100)}..."`;
          })
          .join("\n\n");

        throw new Error(
          `Found ${invalidCases.length} test cases where expectedText cannot be found:\n\n${errorMessage}`
        );
      }

      expect(invalidCases).toHaveLength(0);
    });
  });

  // Generate tests for uFuzzy
  describe("uFuzzy Search", () => {
    testCases.slice(0, 1).forEach((testCase) => {
      const shouldPass = testCase.searchesThatShouldPass.includes("ufuzzy");

      if (shouldPass) {
        const result = uFuzzySearch(testCase.query, testCase.document);
        it(`${shouldPass ? "should find" : "should not find"}: ${testCase.name}`, () => {
          expect(result).toBeTruthy();
          if (result) {
            // Use exactSearch to get the expected position dynamically
            const expectedLocation = exactSearch(
              testCase.expectedText,
              testCase.document
            );
            expect(expectedLocation).toBeTruthy(); // Should always find expectedText

            if (expectedLocation) {
              expect(result.startOffset).toBe(expectedLocation.startOffset);
              expect(result.endOffset).toBe(expectedLocation.endOffset);
              expect(result.quotedText).toBe(testCase.expectedText);
            }
          }
        });
      }
    });
  });

  // Generate tests for LLM Search
  describe("LLM Search", () => {
    // Only run if LLM API key is available AND RUN_LLM_TESTS is set
    const hasLLMKey =
      process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY;
    const shouldRunLLMTests = process.env.RUN_LLM_TESTS === 'true';

    if (!hasLLMKey) {
      it.skip("LLM tests skipped - no API key available", () => {});
      return;
    }

    if (!shouldRunLLMTests) {
      it.skip("LLM tests skipped - set RUN_LLM_TESTS=true to run", () => {});
      return;
    }

    // Define the failed test names
    const failedTestNames = [
      "URL with query parameters",
      "Technical jargon with typos",
      "Medical terminology",
    ];

    // Filter to only failed tests
    const failedTests = testCases.filter(
      (tc) =>
        failedTestNames.includes(tc.name) &&
        tc.searchesThatShouldPass.includes("llm")
    );

    testCases.forEach((testCase) => {
      const shouldPass = testCase.searchesThatShouldPass.includes("llm");

      if (shouldPass) {
        it(`should find: ${testCase.name}`, async () => {
          const result = await llmSearch(testCase.query, testCase.document, {
            pluginName: "test",
          });

          expect(result).toBeTruthy();
          if (result) {
            // Use exactSearch to get the expected position dynamically
            const expectedLocation = exactSearch(
              testCase.expectedText,
              testCase.document
            );
            expect(expectedLocation).toBeTruthy(); // Should always find expectedText

            if (expectedLocation) {
              expect(result.startOffset).toBe(expectedLocation.startOffset);
              expect(result.endOffset).toBe(expectedLocation.endOffset);
              expect(result.quotedText).toBe(testCase.expectedText);
              expect(result.strategy).toBe("llm");
            }
          }
        }, 10000); // 10 second timeout for LLM calls
      }
    });
  });

  // Comparison tests
  describe("Strategy Comparison", () => {
    it("should show uFuzzy handles simple typos better than exact match", () => {
      const doc = "The quick brown fox";
      const query = "quikc brown";

      const fuzzyResult = uFuzzySearch(query, doc);
      expect(fuzzyResult).toBeTruthy();
      expect(fuzzyResult?.quotedText).toContain("quick brown");
    });

    it("should show LLM handles paraphrasing that uFuzzy cannot", async () => {
      if (!process.env.ANTHROPIC_API_KEY || process.env.RUN_LLM_TESTS !== 'true') {
        return;
      }

      const doc = "The vehicle accelerated rapidly down the highway.";
      const query = "car quickly accelerated very rapidly";

      const fuzzyResult = uFuzzySearch(query, doc);
      expect(fuzzyResult).toBeFalsy();

      const llmResult = await llmSearch(query, doc);
      expect(llmResult).toBeTruthy();
      expect(llmResult?.quotedText).toContain("vehicle accelerated rapidly");
    }, 10000);
  });

  // Performance characteristics
  describe("Performance Characteristics", () => {
    it("uFuzzy should be fast for long documents", () => {
      const longDoc =
        "Lorem ipsum ".repeat(1000) +
        "target phrase here" +
        " more text".repeat(1000);
      const query = "target pharse here"; // typo

      const start = Date.now();
      const result = uFuzzySearch(query, longDoc);
      const duration = Date.now() - start;

      expect(result).toBeTruthy();
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });
  });

  // Markdown-aware search tests
  describe("Markdown-Aware Fuzzy Search", () => {
    it("should find text inside markdown links", () => {
      const doc = "Check out [This 2016 study](https://example.com/study) for more details.";
      const query = "This 2016 study";

      // Test that markdown-aware search works
      const markdownResult = markdownAwareFuzzySearch(query, doc);
      expect(markdownResult).toBeTruthy();
      expect(markdownResult?.strategy).toBe('markdown-aware-fuzzy');
      expect(markdownResult?.quotedText).toBe('This 2016 study');
      
      // Verify position mapping worked - should point to the link text, not the brackets
      const actualText = doc.slice(markdownResult!.startOffset, markdownResult!.endOffset);
      expect(actualText).toBe('This 2016 study');
    });

    it("should handle multiple markdown links", () => {
      const doc = "The [first study](url1) and [second study](url2) both found results.";
      const query = "second study";

      const result = markdownAwareFuzzySearch(query, doc);
      expect(result).toBeTruthy();
      expect(result?.quotedText).toBe('second study');
    });

    it("should handle text spanning across markdown boundaries", () => {
      const doc = "Research shows [important findings](url) are crucial for understanding.";
      const query = "important findings are crucial";

      const result = markdownAwareFuzzySearch(query, doc);
      expect(result).toBeTruthy();
      // When text spans markdown boundaries, we should get the full markdown text
      expect(result?.quotedText).toBe('[important findings](url) are crucial');
    });

    it("should handle complex markdown with nested parentheses in URLs", () => {
      const doc = "See [this article](https://example.com/path?param=(value)) for details.";
      const query = "this article";

      const result = markdownAwareFuzzySearch(query, doc);
      expect(result).toBeTruthy();
      expect(result?.quotedText).toBe('this article');
    });

    it("should return null for documents without markdown links", () => {
      const doc = "This is just plain text without any links.";
      const query = "plain text";

      const result = markdownAwareFuzzySearch(query, doc);
      expect(result).toBeFalsy(); // Should skip processing
    });

    it("should return null if text is not found even after stripping markdown", () => {
      const doc = "Check out [Some study](url) for details.";
      const query = "nonexistent text";

      const result = markdownAwareFuzzySearch(query, doc);
      expect(result).toBeFalsy();
    });

    it("should handle the exact problematic case from the investigation", () => {
      // Simulating the exact scenario from our investigation
      const doc = `Some earlier content...
[This 2016 study](https://example.com/bitstreams/6a4499f3-93b2-4eb6-967b-ebf318afec64/content) found that vegan diets could have significant benefits.
More content follows...`;
      
      const query = "This 2016 study";

      // Markdown-aware should succeed
      const result = markdownAwareFuzzySearch(query, doc);
      expect(result).toBeTruthy();
      expect(result?.quotedText).toBe('This 2016 study');
      
      // Verify position mapping worked correctly
      const actualText = doc.slice(result!.startOffset, result!.endOffset);
      expect(actualText).toBe('This 2016 study');
    });

    it("should handle fuzzy matching within markdown-stripped text", () => {
      const doc = "Read [The 2016 study](url) about climate change.";
      const query = "2016 study about"; // Query that should match across markdown boundaries
      
      const result = markdownAwareFuzzySearch(query, doc);
      expect(result).toBeTruthy();
      expect(result?.strategy).toBe('markdown-aware-fuzzy');
      // The actual quoted text should span the link and following text
      expect(result?.quotedText).toContain('2016 study');
      expect(result?.quotedText).toContain('about');
    });

    it("should handle cases where regular fuzzy search fails due to markdown disruption", () => {
      // Create a case where the link URL is very long and might disrupt fuzzy matching
      const longUrl = "https://example.com/very/long/path/that/might/interfere/with/fuzzy/matching/algorithms/study.pdf";
      const doc = `Research on [machine learning algorithms](${longUrl}) shows promising results.`;
      const query = "machine learning algorithms shows";

      // Markdown-aware should handle this by stripping the disruptive URL
      const result = markdownAwareFuzzySearch(query, doc);
      expect(result).toBeTruthy();
      expect(result?.quotedText).toContain('machine learning algorithms');
    });

    it("should maintain reasonable confidence scores", () => {
      const doc = "Check [exact match](url) here.";
      const query = "exact match";

      const result = markdownAwareFuzzySearch(query, doc);
      expect(result).toBeTruthy();
      expect(result?.confidence).toBeGreaterThan(0.6);
      expect(result?.confidence).toBeLessThan(1.0); // Should be lower than exact match due to mapping
    });
  });
});
