/**
 * Detects US/UK English conventions without using an LLM
 */

export type LanguageConvention = 'US' | 'UK' | 'mixed' | 'unknown';

interface ConventionEvidence {
  word: string;
  convention: 'US' | 'UK';
  count: number;
  patternType?: string;
}

// Strong patterns that are most reliable for US/UK detection
const STRONG_PATTERNS = new Set([
  'ize/ise',  // organize vs organise
  'or/our',   // color vs colour
]);

// Words that are ambiguous or used globally
const AMBIGUOUS_WORDS = new Set([
  'program',    // Both use for software
  'license',    // US spelling but used globally  
  'aluminum',   // Different words entirely (UK: aluminium)
  'check',      // Both use for verification
  'practice',   // Can be noun in both
]);

// Common US/UK spelling differences
const SPELLING_PATTERNS: Array<{
  us: RegExp;
  uk: RegExp;
  examples: { us: string; uk: string }[];
  type: string;
}> = [
  // -ize vs -ise
  {
    us: /\b(\w+)ize(d?|s?|r?|rs?|ation|ations|ing)\b/gi,
    uk: /\b(\w+)ise(d?|s?|r?|rs?|ation|ations|ing)\b/gi,
    examples: [
      { us: 'organize', uk: 'organise' },
      { us: 'recognize', uk: 'recognise' },
      { us: 'realize', uk: 'realise' },
    ],
    type: 'ize/ise'
  },
  // -or vs -our
  {
    us: /\b(\w+)or(s?|ed|ing|ful|less|ship)?\b/gi,
    uk: /\b(\w+)our(s?|ed|ing|ful|less|ship)?\b/gi,
    examples: [
      { us: 'color', uk: 'colour' },
      { us: 'honor', uk: 'honour' },
      { us: 'behavior', uk: 'behaviour' },
    ],
    type: 'or/our'
  },
  // -er vs -re
  {
    us: /\b(cent|met|theat|fib)er(s?|ed)?\b/gi,
    uk: /\b(cent|met|theat|fib)re(s?|d)?\b/gi,
    examples: [
      { us: 'center', uk: 'centre' },
      { us: 'meter', uk: 'metre' },
      { us: 'theater', uk: 'theatre' },
    ],
    type: 'er/re'
  },
  // -yze vs -yse
  {
    us: /\b(\w+)yze(d?|s?|r?|rs?|ing)?\b/gi,
    uk: /\b(\w+)yse(d?|s?|r?|rs?|ing)?\b/gi,
    examples: [
      { us: 'analyze', uk: 'analyse' },
      { us: 'paralyze', uk: 'paralyse' },
    ],
    type: 'yze/yse'
  },
  // Single vs double L
  {
    us: /\b(travel|cancel|model|fuel|dial|cruel|jewel)ed\b/gi,
    uk: /\b(travel|cancel|model|fuel|dial|cruel|jewel)led\b/gi,
    examples: [
      { us: 'traveled', uk: 'travelled' },
      { us: 'canceled', uk: 'cancelled' },
      { us: 'modeled', uk: 'modelled' },
    ],
    type: 'single/double-l'
  },
  {
    us: /\b(travel|cancel|model|fuel|dial|cruel|jewel)ing\b/gi,
    uk: /\b(travel|cancel|model|fuel|dial|cruel|jewel)ling\b/gi,
    examples: [
      { us: 'traveling', uk: 'travelling' },
      { us: 'canceling', uk: 'cancelling' },
    ],
    type: 'single/double-l'
  },
  // -ense vs -ence
  {
    us: /\b(def|off|pret)ense(s?|less)?\b/gi,
    uk: /\b(def|off|pret)ence(s?|less)?\b/gi,
    examples: [
      { us: 'defense', uk: 'defence' },
      { us: 'offense', uk: 'offence' },
    ],
    type: 'ense/ence'
  },
  // -og vs -ogue
  {
    us: /\b(catalog|dialog|monolog|analog)(s?|ed|ing|ue)?\b/gi,
    uk: /\b(catalogue|dialogue|monologue|analogue)(s?|d|ing)?\b/gi,
    examples: [
      { us: 'catalog', uk: 'catalogue' },
      { us: 'dialog', uk: 'dialogue' },
    ],
    type: 'og/ogue'
  }
];

// Specific word differences
const WORD_DIFFERENCES: Record<string, { us: string[]; uk: string[] }> = {
  // Transport
  'elevator': { us: ['elevator', 'elevators'], uk: ['lift', 'lifts'] },
  'truck': { us: ['truck', 'trucks'], uk: ['lorry', 'lorries'] },
  'gas': { us: ['gas', 'gasoline'], uk: ['petrol'] },
  'parking_lot': { us: ['parking lot', 'parking lots'], uk: ['car park', 'car parks'] },
  'sidewalk': { us: ['sidewalk', 'sidewalks'], uk: ['pavement', 'pavements'] },
  
  // Food
  'cookie': { us: ['cookie', 'cookies'], uk: ['biscuit', 'biscuits'] },
  'candy': { us: ['candy', 'candies'], uk: ['sweet', 'sweets'] },
  'french_fries': { us: ['french fries', 'fries'], uk: ['chips'] },
  'chips': { us: ['chips'], uk: ['crisps'] },
  
  // Clothing
  'pants': { us: ['pants'], uk: ['trousers'] },
  'sweater': { us: ['sweater', 'sweaters'], uk: ['jumper', 'jumpers'] },
  'sneakers': { us: ['sneakers'], uk: ['trainers'] },
  
  // Education
  'grade': { us: ['grade', 'grades', 'graded'], uk: ['mark', 'marks', 'marked'] },
  'semester': { us: ['semester', 'semesters'], uk: ['term', 'terms'] },
  
  // Other
  'apartment': { us: ['apartment', 'apartments'], uk: ['flat', 'flats'] },
  'vacation': { us: ['vacation', 'vacations'], uk: ['holiday', 'holidays'] },
  'line': { us: ['line', 'lines', 'in line'], uk: ['queue', 'queues', 'in queue'] },
  'math': { us: ['math'], uk: ['maths'] },
  'gotten': { us: ['gotten'], uk: ['got'] },
};

/**
 * Calculate confidence based on the dominance of one convention
 */
function calculateConfidence(usCount: number, ukCount: number): number {
  const total = usCount + ukCount;
  if (total < 3) return 0; // Need minimum evidence
  
  const stronger = Math.max(usCount, ukCount);
  const weaker = Math.min(usCount, ukCount);
  
  // How dominant is the stronger signal?
  return (stronger - weaker) / total;
}

/**
 * Detect language convention based on spelling patterns
 */
export function detectLanguageConvention(text: string): {
  convention: LanguageConvention;
  confidence: number;
  evidence: ConventionEvidence[];
} {
  const evidence: ConventionEvidence[] = [];
  const wordCounts = new Map<string, { us: number; uk: number; patternType: string }>();

  // Check spelling patterns
  for (const pattern of SPELLING_PATTERNS) {
    // Determine weight based on pattern reliability
    const weight = STRONG_PATTERNS.has(pattern.type) ? 2 : 1;
    
    // Count US spellings
    const usMatches = text.match(pattern.us) || [];
    for (const match of usMatches) {
      const key = match.toLowerCase();
      // Skip ambiguous words
      if (AMBIGUOUS_WORDS.has(key)) continue;
      
      const counts = wordCounts.get(key) || { us: 0, uk: 0, patternType: pattern.type };
      counts.us += weight;
      wordCounts.set(key, counts);
    }

    // Count UK spellings
    const ukMatches = text.match(pattern.uk) || [];
    for (const match of ukMatches) {
      const key = match.toLowerCase();
      // Skip ambiguous words
      if (AMBIGUOUS_WORDS.has(key)) continue;
      
      const counts = wordCounts.get(key) || { us: 0, uk: 0, patternType: pattern.type };
      counts.uk += weight;
      wordCounts.set(key, counts);
    }
  }

  // Check specific word differences
  const lowerText = text.toLowerCase();
  for (const [category, variants] of Object.entries(WORD_DIFFERENCES)) {
    // Count US words
    for (const usWord of variants.us) {
      const regex = new RegExp(`\\b${usWord}\\b`, 'gi');
      const matches = lowerText.match(regex) || [];
      if (matches.length > 0) {
        const key = `${category}_us`;
        const counts = wordCounts.get(key) || { us: 0, uk: 0, patternType: 'vocabulary' };
        counts.us += matches.length;
        wordCounts.set(key, counts);
      }
    }

    // Count UK words
    for (const ukWord of variants.uk) {
      const regex = new RegExp(`\\b${ukWord}\\b`, 'gi');
      const matches = lowerText.match(regex) || [];
      if (matches.length > 0) {
        const key = `${category}_uk`;
        const counts = wordCounts.get(key) || { us: 0, uk: 0, patternType: 'vocabulary' };
        counts.uk += matches.length;
        wordCounts.set(key, counts);
      }
    }
  }

  // Compile evidence
  let usCount = 0;
  let ukCount = 0;

  for (const [word, counts] of wordCounts.entries()) {
    if (counts.us > 0 && counts.uk === 0) {
      // For vocabulary categories, extract the actual word used
      let displayWord = word;
      if (word.includes('_us')) {
        // This is a vocabulary category, find the actual word used
        const category = word.replace('_us', '');
        const variants = WORD_DIFFERENCES[category];
        if (variants) {
          // Find which US word was actually used in the text
          for (const usWord of variants.us) {
            if (text.toLowerCase().includes(usWord.toLowerCase())) {
              displayWord = usWord;
              break;
            }
          }
        }
      }
      
      evidence.push({ 
        word: displayWord, 
        convention: 'US', 
        count: counts.us,
        patternType: counts.patternType 
      });
      usCount += counts.us;
    } else if (counts.uk > 0 && counts.us === 0) {
      // For vocabulary categories, extract the actual word used
      let displayWord = word;
      if (word.includes('_uk')) {
        // This is a vocabulary category, find the actual word used
        const category = word.replace('_uk', '');
        const variants = WORD_DIFFERENCES[category];
        if (variants) {
          // Find which UK word was actually used in the text
          for (const ukWord of variants.uk) {
            if (text.toLowerCase().includes(ukWord.toLowerCase())) {
              displayWord = ukWord;
              break;
            }
          }
        }
      }
      
      evidence.push({ 
        word: displayWord, 
        convention: 'UK', 
        count: counts.uk,
        patternType: counts.patternType 
      });
      ukCount += counts.uk;
    }
  }

  // Determine convention with improved logic
  const total = usCount + ukCount;
  if (total === 0) {
    return { convention: 'unknown', confidence: 0, evidence: [] };
  }

  // Check for mixed usage first
  if (usCount > 0 && ukCount > 0) {
    const ratio = Math.min(usCount, ukCount) / Math.max(usCount, ukCount);
    if (ratio > 0.3) { // Both are substantially present
      // Confidence for mixed is the balance ratio (0.3-1.0 mapped to 0.3-0.99)
      const mixedConfidence = 0.3 + (ratio - 0.3) * 0.99;
      return { 
        convention: 'mixed', 
        confidence: Math.min(mixedConfidence, 0.99), // Cap at 0.99
        evidence: evidence.sort((a, b) => b.count - a.count).slice(0, 10)
      };
    }
  }

  // Calculate confidence using improved method
  const confidence = calculateConfidence(usCount, ukCount);
  
  // Determine dominant convention
  let convention: LanguageConvention;
  if (usCount > ukCount) {
    convention = 'US';
  } else if (ukCount > usCount) {
    convention = 'UK';
  } else {
    convention = 'unknown';
  }

  // Need minimum confidence threshold
  if (confidence < 0.5 && total < 5) {
    convention = 'unknown';
  }

  // Sort evidence by count
  evidence.sort((a, b) => b.count - a.count);

  return { convention, confidence, evidence: evidence.slice(0, 10) }; // Top 10 evidence
}

/**
 * Get examples of the detected convention
 */
export function getConventionExamples(convention: LanguageConvention): string[] {
  const examples: string[] = [];
  
  if (convention === 'US') {
    examples.push(
      'Uses US spelling: organize, color, center',
      'Uses US vocabulary: elevator, truck, apartment',
      'Single L in: traveled, modeling, canceled'
    );
  } else if (convention === 'UK') {
    examples.push(
      'Uses UK spelling: organise, colour, centre',
      'Uses UK vocabulary: lift, lorry, flat',
      'Double L in: travelled, modelling, cancelled'
    );
  } else if (convention === 'mixed') {
    examples.push(
      'Mixed US/UK spelling detected',
      'Document uses both conventions',
      'Consider standardizing to one convention'
    );
  }
  
  return examples;
}

/**
 * Detect document type based on content patterns (simple heuristic)
 */
export function detectDocumentType(text: string): {
  type: 'academic' | 'technical' | 'blog' | 'casual' | 'unknown';
  confidence: number;
} {
  const lowerText = text.toLowerCase();
  
  // Academic indicators
  const academicPatterns = [
    /\b(abstract|introduction|methodology|results|conclusion|references)\b/gi,
    /\b(et al\.?|ibid\.?|cf\.?|viz\.?|i\.e\.?|e\.g\.?)\b/gi,
    /\b(hypothesis|empirical|theoretical|analysis|findings)\b/gi,
    /\[\d+\]|\(\d{4}\)/, // Citations
  ];
  
  // Technical indicators
  const technicalPatterns = [
    /\b(api|function|method|class|interface|implementation)\b/gi,
    /\b(documentation|parameter|return|error|exception)\b/gi,
    /\b(install|configure|setup|deploy|debug)\b/gi,
    /```[\s\S]*?```|`[^`]+`/, // Code blocks
  ];
  
  // Blog indicators
  const blogPatterns = [
    /\b(blog|post|article|reader|comment|share)\b/gi,
    /\b(today|yesterday|recently|lately)\b/gi,
    /\b(i think|i believe|in my opinion|personally)\b/gi,
    /^#{1,2}\s/gm, // Markdown headers
  ];
  
  // Count matches
  const counts = {
    academic: 0,
    technical: 0,
    blog: 0,
  };
  
  for (const pattern of academicPatterns) {
    counts.academic += (text.match(pattern) || []).length;
  }
  
  for (const pattern of technicalPatterns) {
    counts.technical += (text.match(pattern) || []).length;
  }
  
  for (const pattern of blogPatterns) {
    counts.blog += (text.match(pattern) || []).length;
  }
  
  // Determine type
  const total = counts.academic + counts.technical + counts.blog;
  if (total === 0) {
    return { type: 'casual', confidence: 0.5 };
  }
  
  const ratios = {
    academic: counts.academic / total,
    technical: counts.technical / total,
    blog: counts.blog / total,
  };
  
  // Find dominant type
  let maxType: 'academic' | 'technical' | 'blog' | 'casual' = 'casual';
  let maxRatio = 0;
  
  for (const [type, ratio] of Object.entries(ratios)) {
    if (ratio > maxRatio) {
      maxRatio = ratio;
      maxType = type as 'academic' | 'technical' | 'blog';
    }
  }
  
  // If no clear winner, it's casual
  if (maxRatio < 0.4) {
    return { type: 'casual', confidence: 0.5 };
  }
  
  return { type: maxType, confidence: maxRatio };
}