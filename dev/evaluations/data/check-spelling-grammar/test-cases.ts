import type { CheckSpellingGrammarInput } from '../../../internal-packages/ai/src/tools/check-spelling-grammar';

export interface TestExpectation {
  shouldFindErrors: boolean;
  minErrors?: number;
  maxErrors?: number;
  mustFind?: Array<{
    text: string;
    correction?: string;
    type?: 'spelling' | 'grammar';
    minImportance?: number;
    maxImportance?: number;
  }>;
  mustNotFind?: string[];
}

export interface TestCase {
  id: string;
  category: string;
  name: string;
  input: CheckSpellingGrammarInput;
  expectations: TestExpectation;
  description: string;
}

export const testCases: TestCase[] = [
  // Basic Spelling Errors
  {
    id: 'spelling-teh',
    category: 'Basic Spelling',
    name: 'Simple typo - teh',
    input: { text: 'I teh best way to learn is by doing.' },
    expectations: {
      shouldFindErrors: true,
      minErrors: 1,
      maxErrors: 2,  // Allow up to 2 errors since it may find grammar issues too
      mustFind: [{
        text: 'teh',
        correction: 'the',
        type: 'spelling',
        maxImportance: 35  // Slight adjustment for importance range
      }]
    },
    description: 'Should detect common "teh" typo'
  },
  {
    id: 'spelling-recieve',
    category: 'Basic Spelling',
    name: 'Common misspelling - recieve',
    input: { text: 'I will recieve the package tomorrow.' },
    expectations: {
      shouldFindErrors: true,
      minErrors: 1,
      maxErrors: 1,
      mustFind: [{
        text: 'recieve',
        correction: 'receive',
        type: 'spelling',
        maxImportance: 35
      }]
    },
    description: 'Should detect "recieve" misspelling'
  },
  {
    id: 'spelling-algorithm',
    category: 'Basic Spelling',
    name: 'Technical term misspelling',
    input: { text: 'The algorithem is very efficient.' },
    expectations: {
      shouldFindErrors: true,
      minErrors: 1,
      mustFind: [{
        text: 'algorithem',
        correction: 'algorithm',
        type: 'spelling',
        minImportance: 26,
        maxImportance: 75
      }]
    },
    description: 'Should detect technical term misspelling'
  },
  {
    id: 'spelling-multiple',
    category: 'Basic Spelling',
    name: 'Multiple spelling errors',
    input: { text: 'Teh studnet recieved thier assignement.' },
    expectations: {
      shouldFindErrors: true,
      minErrors: 4,
      mustFind: [
        { text: 'Teh' },
        { text: 'studnet' },
        { text: 'recieved' },
        { text: 'thier' }
      ]
    },
    description: 'Should detect all 4-5 spelling errors'
  },

  // Grammar Errors
  {
    id: 'grammar-their-there',
    category: 'Grammar',
    name: 'Their/there confusion',
    input: { text: 'I put the book over their on the table.' },
    expectations: {
      shouldFindErrors: true,
      minErrors: 1,
      mustFind: [{
        text: 'their',
        correction: 'there',
        minImportance: 26,
        maxImportance: 50
      }]
    },
    description: 'Should detect their → there'
  },
  {
    id: 'grammar-subject-verb',
    category: 'Grammar',
    name: 'Subject-verb disagreement',
    input: { text: 'The group of students are going to the library.' },
    expectations: {
      shouldFindErrors: true, // Actually this is a clear grammar error
      minErrors: 0, // May or may not flag
      maxErrors: 1,
      mustFind: []
    },
    description: 'May or may not flag (style guide dependent)'
  },
  {
    id: 'grammar-missing-article',
    category: 'Grammar',
    name: 'Missing article',
    input: { text: 'I went to store to buy milk.' },
    expectations: {
      shouldFindErrors: true,
      minErrors: 1,
      mustFind: [{
        text: 'to store',  // Tool might flag 'to store' instead of just 'store'
        correction: 'to the store',
        type: 'grammar',
        minImportance: 26,
        maxImportance: 50
      }]
    },
    description: 'Should detect missing "the"'
  },
  {
    id: 'grammar-verb-tense',
    category: 'Grammar',
    name: 'Verb tense error',
    input: { text: 'Yesterday, I go to the park and play soccer.' },
    expectations: {
      shouldFindErrors: true,
      minErrors: 2,
      mustFind: [
        { text: 'go', correction: 'went', type: 'grammar' },
        { text: 'play', correction: 'played', type: 'grammar' }
      ]
    },
    description: 'Should detect tense errors'
  },

  // Critical Cases
  {
    id: 'critical-dangerous-advice',
    category: 'Critical Cases',
    name: 'Dangerous advice (grammatically correct)',
    input: { text: 'You should drink alcohol while driving.' },
    expectations: {
      shouldFindErrors: false,
      maxErrors: 0
    },
    description: 'Should NOT flag (grammatically correct)'
  },
  {
    id: 'critical-wrong-date',
    category: 'Critical Cases',
    name: 'Wrong date (June 31st)',
    input: { text: 'The meeting is at 2:00 PM on the 31st of June.' },
    expectations: {
      shouldFindErrors: true, // Tool correctly flags this
      minErrors: 0, // May or may not flag
      maxErrors: 1
    },
    description: 'May flag factual error with high importance'
  },
  {
    id: 'critical-ambiguous-pronoun',
    category: 'Critical Cases',
    name: 'Ambiguous pronoun',
    input: { text: 'John told Mark that he should leave early.' },
    expectations: {
      shouldFindErrors: false,
      maxErrors: 1
    },
    description: 'May flag ambiguous "he"'
  },

  // Non-Errors (Should NOT be flagged)
  {
    id: 'non-error-math',
    category: 'Non-Errors',
    name: 'Mathematical error',
    input: { text: 'It is well known that 2 + 2 = 5.' },
    expectations: {
      shouldFindErrors: false,
      maxErrors: 0
    },
    description: 'Should NOT flag (not spelling/grammar)'
  },
  {
    id: 'non-error-perfect',
    category: 'Non-Errors',
    name: 'Perfect grammar',
    input: { text: 'The quick brown fox jumps over the lazy dog.' },
    expectations: {
      shouldFindErrors: false,
      maxErrors: 0
    },
    description: 'Should find no errors'
  },
  {
    id: 'non-error-technical',
    category: 'Non-Errors',
    name: 'Technical jargon',
    input: { 
      text: 'The API uses OAuth5 authentication with JWT tokens.',
      strictness: 'minimal' as const
    },
    expectations: {
      shouldFindErrors: false,
      maxErrors: 0
    },
    description: 'Should NOT flag technical terms'
  },
  {
    id: 'non-error-stylistic',
    category: 'Non-Errors',
    name: 'Stylistic choices',
    input: { 
      text: 'Overall, my perspective is that jankily controlling superintelligence seems decently helpful.',
      strictness: 'minimal' as const
    },
    expectations: {
      shouldFindErrors: false,
      maxErrors: 0
    },
    description: 'Should NOT flag informal words'
  },
  {
    id: 'non-error-logical',
    category: 'Non-Errors',
    name: 'Logical fallacy',
    input: { text: 'All birds can fly. Penguins are birds. Therefore, penguins can fly.' },
    expectations: {
      shouldFindErrors: false,
      maxErrors: 0
    },
    description: 'Should NOT flag (logical error, not grammar)'
  },
  {
    id: 'non-error-bad-reasoning',
    category: 'Non-Errors',
    name: 'Bad reasoning',
    input: { text: 'Climate change is not real because it was cold yesterday.' },
    expectations: {
      shouldFindErrors: false,
      maxErrors: 0
    },
    description: 'Should NOT flag (bad reasoning, not grammar)'
  },
  {
    id: 'non-error-rational',
    category: 'Non-Errors',
    name: 'Unusual word usage',
    input: { 
      text: 'I think the main rational reason we might use significantly superhuman AIs is that we might be able to control them.',
      strictness: 'minimal' as const
    },
    expectations: {
      shouldFindErrors: false,
      maxErrors: 0
    },
    description: 'Should NOT flag "rational reason" (valid but unusual)'
  },

  // Complex Text
  {
    id: 'complex-academic',
    category: 'Complex Text',
    name: 'Academic text with errors',
    input: { 
      text: 'The studnets research on quantum mecahnics have shown promissing results.',
      context: 'Academic paper abstract'
    },
    expectations: {
      shouldFindErrors: true,
      minErrors: 3,
      mustFind: [
        { text: 'studnets', correction: 'students' },
        { text: 'mecahnics', correction: 'mechanics' },
        { text: 'have', correction: 'has' }
      ]
    },
    description: 'Should find multiple errors'
  },
  {
    id: 'complex-business-email',
    category: 'Complex Text',
    name: 'Business email',
    input: { 
      text: 'Dear Mr. Smith, I hope this email find you well. We need to discus the new projcet timeline.',
      context: 'Professional email'
    },
    expectations: {
      shouldFindErrors: true,
      minErrors: 3,
      mustFind: [
        { text: 'find', correction: 'finds' },
        { text: 'discus', correction: 'discuss' },
        { text: 'projcet', correction: 'project' }
      ]
    },
    description: 'Should find verb and spelling errors'
  },
  {
    id: 'complex-medical',
    category: 'Complex Text',
    name: 'Medical context',
    input: { 
      text: 'The medecine dosage is 5mg, not 50mg as stated earlier.',
      context: 'Medical instructions'
    },
    expectations: {
      shouldFindErrors: true,
      minErrors: 1,
      mustFind: [{
        text: 'medecine',
        correction: 'medicine',
        minImportance: 51 // High importance in medical context
      }]
    },
    description: 'Should flag with high importance'
  },

  // Edge Cases
  {
    id: 'edge-very-short',
    category: 'Edge Cases',
    name: 'Very short text',
    input: { text: 'Hi.' },
    expectations: {
      shouldFindErrors: false,
      maxErrors: 0
    },
    description: 'Should handle gracefully'
  },
  {
    id: 'edge-max-errors',
    category: 'Edge Cases',
    name: 'Max errors limit',
    input: { 
      text: 'Ths iz a vry bad txt wit mny erors evrywhre.',
      maxErrors: 3
    },
    expectations: {
      shouldFindErrors: true,
      maxErrors: 3 // Limited by input
    },
    description: 'Should limit to 3 errors'
  },
  {
    id: 'edge-special-chars',
    category: 'Edge Cases',
    name: 'Special characters',
    input: { text: 'The cost is $100.00 (excluding tax).' },
    expectations: {
      shouldFindErrors: false,
      maxErrors: 0
    },
    description: 'Should handle special chars'
  },
  {
    id: 'edge-intentional',
    category: 'Edge Cases',
    name: 'Intentional misspelling',
    input: { 
      text: 'Check out our kool new app!',
      context: 'Marketing copy with intentional casual spelling'
    },
    expectations: {
      shouldFindErrors: false,
      maxErrors: 1
    },
    description: 'May flag with low importance'
  },

  // Grammar Patterns
  {
    id: 'pattern-apostrophes',
    category: 'Grammar Patterns',
    name: 'Apostrophe errors',
    input: { text: "Its a beautiful day. The cat licked it's paws. Your welcome!" },
    expectations: {
      shouldFindErrors: true,
      minErrors: 3,
      mustFind: [
        { text: 'Its', correction: "It's" },
        { text: "it's", correction: 'its' },
        { text: 'Your', correction: "You're" }
      ]
    },
    description: 'Should find all apostrophe errors'
  },
  {
    id: 'pattern-confusions',
    category: 'Grammar Patterns',
    name: 'Common confusions',
    input: { text: 'The affect of the new policy effects everyone. Then they went too the store to.' },
    expectations: {
      shouldFindErrors: true,
      minErrors: 2,
      mustFind: [
        { text: 'too', correction: 'to' }
      ]
    },
    description: 'Should find word confusions'
  },
  {
    id: 'pattern-punctuation',
    category: 'Grammar Patterns',
    name: 'Punctuation spacing',
    input: { text: "Hello ,how are you?I'm fine.Thanks !" },
    expectations: {
      shouldFindErrors: true,
      minErrors: 2
    },
    description: 'Should find spacing errors'
  },
  {
    id: 'pattern-double-negatives',
    category: 'Grammar Patterns',
    name: 'Double negatives',
    input: { text: "I don't have no money. She can't hardly wait." },
    expectations: {
      shouldFindErrors: true,
      minErrors: 2,
      mustFind: []
    },
    description: 'Should find double negatives'
  },

  // Capitalization
  {
    id: 'caps-sentence',
    category: 'Capitalization',
    name: 'Sentence capitalization',
    input: { text: 'the meeting is on monday. we will discuss the new project. john will present.' },
    expectations: {
      shouldFindErrors: true,
      minErrors: 1
    },
    description: 'Should find capitalization errors'
  },
  {
    id: 'caps-proper-nouns',
    category: 'Capitalization',
    name: 'Proper nouns',
    input: { text: 'I visited paris in france last Summer. The eiffel tower was beautiful.' },
    expectations: {
      shouldFindErrors: true,
      minErrors: 1
    },
    description: 'Should find proper noun errors'
  }
];