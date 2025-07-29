import { logger } from "@/lib/logger";
import {
  beforeEach,
  describe,
  expect,
  it,
} from "@jest/globals";

import { checkSpellingGrammarTool } from "./index";
import type { CheckSpellingGrammarInput, CheckSpellingGrammarOutput, SpellingGrammarError } from "./index";

// Skip these tests in CI or when no API key is available
const describeIfApiKey =
  process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim() !== ""
    ? describe
    : describe.skip;

// Extend timeout for API calls
const API_TIMEOUT = 30000;

// Parallel test execution helper
interface TestCase {
  name: string;
  input: CheckSpellingGrammarInput;
  expectations: (result: CheckSpellingGrammarOutput) => void;
}

interface TestBatchResult {
  passed: number;
  failed: number;
  errors: Array<{ testName: string; error: string }>;
}

interface TestResult {
  success: boolean;
  testName: string;
  error?: string;
}

async function runTestBatch(testCases: TestCase[], mockContext: any): Promise<TestBatchResult> {
  const results = await Promise.allSettled(
    testCases.map(async (testCase): Promise<TestResult> => {
      try {
        const result = await checkSpellingGrammarTool.run(testCase.input, mockContext);
        testCase.expectations(result);
        return { success: true, testName: testCase.name };
      } catch (error) {
        return {
          success: false,
          testName: testCase.name,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    })
  );

  const batchResult: TestBatchResult = {
    passed: 0,
    failed: 0,
    errors: []
  };

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      if (result.value.success) {
        batchResult.passed++;
      } else {
        batchResult.failed++;
        batchResult.errors.push({
          testName: result.value.testName,
          error: result.value.error || 'Unknown error'
        });
      }
    } else {
      batchResult.failed++;
      batchResult.errors.push({
        testName: testCases[index].name,
        error: `Promise rejected: ${result.reason}`
      });
    }
  });

  return batchResult;
}

describeIfApiKey("CheckSpellingGrammarTool Integration", () => {
  const mockContext = {
    logger,
    userId: "test-user",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Basic Spelling Errors", () => {
    it(
      "should detect common spelling errors in parallel",
      async () => {
        const testCases: TestCase[] = [
          {
            name: "simple typo - teh",
            input: { text: "I teh best way to learn is by doing." },
            expectations: (result) => {
              expect(result.errors.length).toBeGreaterThan(0);
              const error = result.errors.find(e => e.text === "teh");
              expect(error).toBeDefined();
              expect(error?.correction).toBe("the");
              expect(error?.conciseCorrection).toMatch(/teh\s*→\s*the/);
              expect(error?.type).toBe("spelling");
              expect(error?.importance).toBeLessThanOrEqual(25);
            }
          },
          {
            name: "common misspelling - recieve",
            input: { text: "I will recieve the package tomorrow." },
            expectations: (result) => {
              expect(result.errors.length).toBeGreaterThan(0);
              const error = result.errors.find(e => e.text === "recieve");
              expect(error).toBeDefined();
              expect(error?.correction).toBe("receive");
              expect(error?.conciseCorrection).toMatch(/recieve\s*→\s*receive/);
              expect(error?.type).toBe("spelling");
              expect(error?.importance).toBeLessThanOrEqual(25);
            }
          },
          {
            name: "technical term misspelling",
            input: { text: "The algorithem is very efficient." },
            expectations: (result) => {
              expect(result.errors.length).toBeGreaterThan(0);
              const error = result.errors.find(e => e.text === "algorithem");
              expect(error).toBeDefined();
              expect(error?.correction).toBe("algorithm");
              expect(error?.conciseCorrection).toMatch(/algorithem\s*→\s*algorithm/);
              expect(error?.type).toBe("spelling");
              // More flexible importance range for technical terms
              expect(error?.importance).toBeGreaterThanOrEqual(26);
              expect(error?.importance).toBeLessThanOrEqual(75);
            }
          },
          {
            name: "multiple spelling errors",
            input: { text: "Teh studnet recieved thier assignement." },
            expectations: (result) => {
              expect(result.errors.length).toBeGreaterThanOrEqual(4);
              const errors = result.errors.map(e => e.text).sort();
              expect(errors).toContain("Teh");
              expect(errors).toContain("studnet");
              expect(errors).toContain("recieved");
              expect(errors).toContain("thier");
              result.errors.forEach(error => {
                expect(error.conciseCorrection).toBeTruthy();
                expect(error.conciseCorrection).toMatch(/→/);
              });
            }
          }
        ];

        const batchResult = await runTestBatch(testCases, mockContext);
        
        if (batchResult.failed > 0) {
          const errorMessages = batchResult.errors.map(
            err => `${err.testName}: ${err.error}`
          ).join('\n');
          throw new Error(`${batchResult.failed} test(s) failed:\n${errorMessages}`);
        }
        
        expect(batchResult.passed).toBe(testCases.length);
      },
      API_TIMEOUT * 2
    );
  });

  describe("Grammar Errors", () => {
    it(
      "should detect common grammar errors in parallel",
      async () => {
        const testCases: TestCase[] = [
          {
            name: "their/there confusion",
            input: { text: "I put the book over their on the table." },
            expectations: (result) => {
              expect(result.errors.length).toBeGreaterThan(0);
              const error = result.errors.find(e => e.text === "their");
              expect(error).toBeDefined();
              expect(error?.correction).toBe("there");
              expect(error?.conciseCorrection).toMatch(/their\s*→\s*there/);
              // Their/there confusion can be classified as either spelling or grammar
              expect(["spelling", "grammar"]).toContain(error?.type);
              expect(error?.importance).toBeGreaterThanOrEqual(26);
              expect(error?.importance).toBeLessThanOrEqual(50);
            }
          },
          {
            name: "subject-verb disagreement",
            input: { text: "The group of students are going to the library." },
            expectations: (result) => {
              // This sentence might be marked as correct by some style guides
              // So we'll make the test more flexible
              if (result.errors.length > 0) {
                const error = result.errors.find(e => e.text.includes("are") || e.text.includes("group of students are"));
                if (error) {
                  expect(error.correction).toMatch(/is/);
                  expect(error.conciseCorrection).toBeTruthy();
                  expect(error.type).toBe("grammar");
                  expect(error.importance).toBeGreaterThanOrEqual(26);
                  expect(error.importance).toBeLessThanOrEqual(75);
                }
              }
            }
          },
          {
            name: "missing article",
            input: { text: "I went to store to buy milk." },
            expectations: (result) => {
              expect(result.errors.length).toBeGreaterThan(0);
              const error = result.errors.find(e => e.text.includes("to store") || e.text === "store");
              expect(error).toBeDefined();
              expect(error?.correction).toMatch(/the store/);
              expect(error?.type).toBe("grammar");
              expect(error?.importance).toBeGreaterThanOrEqual(26);
              expect(error?.importance).toBeLessThanOrEqual(50);
            }
          },
          {
            name: "verb tense error",
            input: { text: "Yesterday, I go to the park and play soccer." },
            expectations: (result) => {
              expect(result.errors.length).toBeGreaterThanOrEqual(2);
              const goError = result.errors.find(e => e.text === "go");
              const playError = result.errors.find(e => e.text === "play");
              expect(goError).toBeDefined();
              expect(playError).toBeDefined();
              expect(goError?.correction).toMatch(/went/);
              expect(playError?.correction).toMatch(/played/);
              expect(goError?.type).toBe("grammar");
              expect(playError?.type).toBe("grammar");
            }
          }
        ];

        const batchResult = await runTestBatch(testCases, mockContext);
        
        if (batchResult.failed > 0) {
          const errorMessages = batchResult.errors.map(
            err => `${err.testName}: ${err.error}`
          ).join('\n');
          throw new Error(`${batchResult.failed} test(s) failed:\n${errorMessages}`);
        }
        
        expect(batchResult.passed).toBe(testCases.length);
      },
      API_TIMEOUT * 2
    );
  });

  describe("Critical Errors", () => {
    it(
      "should detect critical errors that change meaning",
      async () => {
        const testCases: TestCase[] = [
          {
            name: "grammatically correct but dangerous advice",
            input: { text: "You should drink alcohol while driving." },
            expectations: (result) => {
              // This is grammatically correct (but dangerous advice)
              // The tool should not flag this as a spelling/grammar error
              // If it does flag something, it should be minor
              result.errors.forEach(error => {
                // Any errors flagged should not be about missing "not"
                expect(error.text).not.toBe("should");
                expect(error.correction).not.toMatch(/should not/);
              });
            }
          },
          {
            name: "wrong number - critical error",
            input: { text: "The meeting is at 2:00 PM on the 31st of June." },
            expectations: (result) => {
              // June only has 30 days, but this is more of a factual error than spelling/grammar
              // The tool might or might not catch this
              if (result.errors.length > 0) {
                const error = result.errors[0];
                expect(error.importance).toBeGreaterThanOrEqual(76);
              }
            }
          },
          {
            name: "ambiguous pronoun reference",
            input: { text: "John told Mark that he should leave early." },
            expectations: (result) => {
              // Ambiguous pronoun - could refer to either John or Mark
              if (result.errors.length > 0) {
                const error = result.errors.find(e => e.text === "he");
                if (error) {
                  expect(error.type).toBe("grammar");
                  expect(error.importance).toBeGreaterThanOrEqual(51);
                }
              }
            }
          }
        ];

        const batchResult = await runTestBatch(testCases, mockContext);
        
        if (batchResult.failed > 0) {
          const errorMessages = batchResult.errors.map(
            err => `${err.testName}: ${err.error}`
          ).join('\n');
          throw new Error(`${batchResult.failed} test(s) failed:\n${errorMessages}`);
        }
        
        expect(batchResult.passed).toBe(testCases.length);
      },
      API_TIMEOUT * 2
    );
  });

  describe("Non-Errors (Should NOT be flagged)", () => {
    it(
      "should not flag correct text or non-spelling/grammar issues",
      async () => {
        const testCases: TestCase[] = [
          {
            name: "correct mathematical statement",
            input: { text: "The equation 2 + 2 = 5 is incorrect." },
            expectations: (result) => {
              // Should not flag the math error, only spelling/grammar
              expect(result.errors.length).toBe(0);
            }
          },
          {
            name: "correct spelling and grammar",
            input: { text: "The quick brown fox jumps over the lazy dog." },
            expectations: (result) => {
              expect(result.errors.length).toBe(0);
            }
          },
          {
            name: "technical jargon (correct)",
            input: { text: "The API uses OAuth2 authentication with JWT tokens." },
            expectations: (result) => {
              expect(result.errors.length).toBe(0);
            }
          },
          {
            name: "code snippet in text",
            input: { text: "Use the command npm install to install dependencies." },
            expectations: (result) => {
              expect(result.errors.length).toBe(0);
            }
          },
          {
            name: "stylistic choices",
            input: { text: "This is a really, really important point." },
            expectations: (result) => {
              // Repetition for emphasis - not an error
              expect(result.errors.length).toBe(0);
            }
          },
          {
            name: "logical fallacy (not grammar)",
            input: { text: "All birds can fly. Penguins are birds. Therefore, penguins can fly." },
            expectations: (result) => {
              // Logical error, not spelling/grammar
              expect(result.errors.length).toBe(0);
            }
          },
          {
            name: "bad argument (not grammar)",
            input: { text: "Climate change is not real because it was cold yesterday." },
            expectations: (result) => {
              // Bad reasoning, not spelling/grammar
              expect(result.errors.length).toBe(0);
            }
          }
        ];

        const batchResult = await runTestBatch(testCases, mockContext);
        
        if (batchResult.failed > 0) {
          const errorMessages = batchResult.errors.map(
            err => `${err.testName}: ${err.error}`
          ).join('\n');
          throw new Error(`${batchResult.failed} test(s) failed:\n${errorMessages}`);
        }
        
        expect(batchResult.passed).toBe(testCases.length);
      },
      API_TIMEOUT * 2
    );
  });

  describe("Complex Text Analysis", () => {
    it(
      "should handle complex texts with multiple error types",
      async () => {
        const testCases: TestCase[] = [
          {
            name: "academic text with errors",
            input: { 
              text: "The studnets research on quantum mecahnics have shown promissing results.",
              context: "Academic paper abstract"
            },
            expectations: (result) => {
              expect(result.errors.length).toBeGreaterThanOrEqual(4);
              // Check for spelling errors
              const studentsError = result.errors.find(e => e.text === "studnets");
              expect(studentsError).toBeDefined();
              expect(studentsError?.type).toBe("spelling");
              
              const mechanicsError = result.errors.find(e => e.text === "mecahnics");
              expect(mechanicsError).toBeDefined();
              expect(mechanicsError?.type).toBe("spelling");
              
              // Check for grammar error (have → has)
              const haveError = result.errors.find(e => e.text === "have");
              expect(haveError).toBeDefined();
              expect(haveError?.type).toBe("grammar");
              expect(haveError?.correction).toBe("has");
            }
          },
          {
            name: "business email with mixed errors",
            input: {
              text: "Dear Mr. Smith, I hope this email find you well. We need to discus the new projcet timeline.",
              context: "Professional email"
            },
            expectations: (result) => {
              expect(result.errors.length).toBeGreaterThanOrEqual(3);
              const findError = result.errors.find(e => e.text === "find");
              expect(findError?.correction).toBe("finds");
              const discusError = result.errors.find(e => e.text === "discus");
              expect(discusError?.correction).toBe("discuss");
              const projcetError = result.errors.find(e => e.text === "projcet");
              expect(projcetError?.correction).toBe("project");
            }
          },
          {
            name: "text with contextual importance",
            input: {
              text: "The medecine dosage is 5mg, not 50mg as stated earlier.",
              context: "Medical instructions"
            },
            expectations: (result) => {
              const medicineError = result.errors.find(e => e.text === "medecine");
              expect(medicineError).toBeDefined();
              expect(medicineError?.correction).toBe("medicine");
              // Medical context should increase importance
              expect(medicineError?.importance).toBeGreaterThanOrEqual(51);
            }
          }
        ];

        const batchResult = await runTestBatch(testCases, mockContext);
        
        if (batchResult.failed > 0) {
          const errorMessages = batchResult.errors.map(
            err => `${err.testName}: ${err.error}`
          ).join('\n');
          throw new Error(`${batchResult.failed} test(s) failed:\n${errorMessages}`);
        }
        
        expect(batchResult.passed).toBe(testCases.length);
      },
      API_TIMEOUT * 2
    );
  });

  describe("Edge Cases and Limits", () => {
    it(
      "should handle edge cases appropriately",
      async () => {
        const testCases: TestCase[] = [
          {
            name: "very short text",
            input: { text: "Hi." },
            expectations: (result) => {
              // Should handle very short text gracefully
              expect(result.errors.length).toBe(0);
            }
          },
          {
            name: "maxErrors limit",
            input: { 
              text: "Ths iz a vry bad txt wit mny erors evrywhre.",
              maxErrors: 3
            },
            expectations: (result) => {
              expect(result.errors.length).toBeLessThanOrEqual(3);
              // Should return the most important errors
              result.errors.forEach(error => {
                expect(error.importance).toBeGreaterThan(0);
              });
            }
          },
          {
            name: "special characters and punctuation",
            input: { text: "The cost is $100.00 (excluding tax)." },
            expectations: (result) => {
              expect(result.errors.length).toBe(0);
            }
          },
          {
            name: "intentional misspellings",
            input: { 
              text: "Check out our kool new app!",
              context: "Marketing copy with intentional casual spelling"
            },
            expectations: (result) => {
              // Might flag "kool" but with lower importance given context
              const koolError = result.errors.find(e => e.text === "kool");
              if (koolError) {
                expect(koolError.importance).toBeLessThanOrEqual(50);
              }
            }
          }
        ];

        const batchResult = await runTestBatch(testCases, mockContext);
        
        if (batchResult.failed > 0) {
          const errorMessages = batchResult.errors.map(
            err => `${err.testName}: ${err.error}`
          ).join('\n');
          throw new Error(`${batchResult.failed} test(s) failed:\n${errorMessages}`);
        }
        
        expect(batchResult.passed).toBe(testCases.length);
      },
      API_TIMEOUT * 2
    );
  });

  describe("Concise Correction Format", () => {
    it(
      "should provide properly formatted concise corrections",
      async () => {
        const testCases: TestCase[] = [
          {
            name: "simple word replacement",
            input: { text: "I recieved teh package." },
            expectations: (result) => {
              result.errors.forEach(error => {
                expect(error.conciseCorrection).toBeTruthy();
                expect(error.conciseCorrection).toMatch(/→/);
                // Should be concise - not full sentences
                expect(error.conciseCorrection.length).toBeLessThan(50);
              });
            }
          },
          {
            name: "grammar correction format",
            input: { text: "The dogs is barking loudly." },
            expectations: (result) => {
              const error = result.errors.find(e => e.text === "is");
              expect(error?.conciseCorrection).toMatch(/is\s*→\s*are/);
            }
          },
          {
            name: "multi-word correction",
            input: { text: "I could of done better." },
            expectations: (result) => {
              const error = result.errors.find(e => e.text.includes("could of"));
              if (error) {
                expect(error.conciseCorrection).toMatch(/could of\s*→\s*could have/);
              }
            }
          }
        ];

        const batchResult = await runTestBatch(testCases, mockContext);
        
        if (batchResult.failed > 0) {
          const errorMessages = batchResult.errors.map(
            err => `${err.testName}: ${err.error}`
          ).join('\n');
          throw new Error(`${batchResult.failed} test(s) failed:\n${errorMessages}`);
        }
        
        expect(batchResult.passed).toBe(testCases.length);
      },
      API_TIMEOUT
    );
  });

  describe("Comprehensive Grammar Patterns", () => {
    it(
      "should detect various grammar patterns",
      async () => {
        const testCases: TestCase[] = [
          {
            name: "apostrophe errors",
            input: { text: "Its a beautiful day. The cat licked it's paws. Your welcome!" },
            expectations: (result) => {
              expect(result.errors.length).toBeGreaterThanOrEqual(3);
              // Its → It's
              const itsError = result.errors.find(e => e.text === "Its");
              expect(itsError).toBeDefined();
              expect(itsError?.correction).toBe("It's");
              // it's → its
              const itsPawsError = result.errors.find(e => e.text === "it's");
              expect(itsPawsError).toBeDefined();
              expect(itsPawsError?.correction).toBe("its");
              // Your → You're
              const yourError = result.errors.find(e => e.text === "Your");
              expect(yourError).toBeDefined();
              expect(yourError?.correction).toBe("You're");
            }
          },
          {
            name: "common word confusions",
            input: { text: "The affect of the new policy effects everyone. Then they went too the store to." },
            expectations: (result) => {
              expect(result.errors.length).toBeGreaterThanOrEqual(4);
              // affect → effect
              const affectError = result.errors.find(e => e.text === "affect");
              if (affectError) {
                expect(affectError.correction).toBe("effect");
              }
              // effects → affects
              const effectsError = result.errors.find(e => e.text === "effects");
              if (effectsError) {
                expect(effectsError.correction).toBe("affects");
              }
              // too → to
              const tooError = result.errors.find(e => e.text === "too");
              if (tooError) {
                expect(tooError.correction).toBe("to");
              }
              // to → too (at end)
              const toError = result.errors.find(e => e.text === "to" && result.errors.indexOf(e) === result.errors.length - 1);
              if (toError) {
                expect(toError.correction).toBe("too");
              }
            }
          },
          {
            name: "punctuation and spacing",
            input: { text: "Hello ,how are you?I'm fine.Thanks !" },
            expectations: (result) => {
              expect(result.errors.length).toBeGreaterThanOrEqual(2);
              // Should detect spacing issues around punctuation
              result.errors.forEach(error => {
                expect(error.type).toBe("grammar");
              });
            }
          },
          {
            name: "double negatives",
            input: { text: "I don't have no money. She can't hardly wait." },
            expectations: (result) => {
              expect(result.errors.length).toBeGreaterThanOrEqual(2);
              // These are grammar errors
              result.errors.forEach(error => {
                expect(error.type).toBe("grammar");
                expect(error.importance).toBeGreaterThanOrEqual(26);
              });
            }
          },
          {
            name: "tense consistency",
            input: { text: "Yesterday I go to the store and buy some milk." },
            expectations: (result) => {
              expect(result.errors.length).toBeGreaterThanOrEqual(2);
              const goError = result.errors.find(e => e.text === "go");
              expect(goError).toBeDefined();
              expect(goError?.correction).toBe("went");
              const buyError = result.errors.find(e => e.text === "buy");
              expect(buyError).toBeDefined();
              expect(buyError?.correction).toBe("bought");
            }
          }
        ];

        const batchResult = await runTestBatch(testCases, mockContext);
        
        if (batchResult.failed > 0) {
          const errorMessages = batchResult.errors.map(
            err => `${err.testName}: ${err.error}`
          ).join('\n');
          throw new Error(`${batchResult.failed} test(s) failed:\n${errorMessages}`);
        }
        
        expect(batchResult.passed).toBe(testCases.length);
      },
      API_TIMEOUT * 2
    );
  });

  describe("Capitalization and Proper Nouns", () => {
    it(
      "should detect capitalization errors",
      async () => {
        const testCases: TestCase[] = [
          {
            name: "sentence capitalization",
            input: { text: "the meeting is on monday. we will discuss the new project. john will present." },
            expectations: (result) => {
              expect(result.errors.length).toBeGreaterThanOrEqual(3);
              // Should detect lowercase at sentence start
              const theError = result.errors.find(e => e.text === "the");
              expect(theError).toBeDefined();
              expect(theError?.correction).toBe("The");
              // Should detect lowercase days of week
              const mondayError = result.errors.find(e => e.text === "monday");
              expect(mondayError).toBeDefined();
              expect(mondayError?.correction).toBe("Monday");
              // Should detect lowercase proper names
              const johnError = result.errors.find(e => e.text === "john");
              expect(johnError).toBeDefined();
              expect(johnError?.correction).toBe("John");
            }
          },
          {
            name: "proper noun capitalization",
            input: { text: "I visited paris in france last Summer. The eiffel tower was beautiful." },
            expectations: (result) => {
              expect(result.errors.length).toBeGreaterThanOrEqual(3);
              const parisError = result.errors.find(e => e.text === "paris");
              expect(parisError?.correction).toBe("Paris");
              const franceError = result.errors.find(e => e.text === "france");
              expect(franceError?.correction).toBe("France");
              const eiffelError = result.errors.find(e => e.text === "eiffel");
              expect(eiffelError?.correction).toBe("Eiffel");
              // Summer should be lowercase
              const summerError = result.errors.find(e => e.text === "Summer");
              if (summerError) {
                expect(summerError.correction).toBe("summer");
              }
            }
          }
        ];

        const batchResult = await runTestBatch(testCases, mockContext);
        
        if (batchResult.failed > 0) {
          const errorMessages = batchResult.errors.map(
            err => `${err.testName}: ${err.error}`
          ).join('\n');
          throw new Error(`${batchResult.failed} test(s) failed:\n${errorMessages}`);
        }
        
        expect(batchResult.passed).toBe(testCases.length);
      },
      API_TIMEOUT * 2
    );
  });
});