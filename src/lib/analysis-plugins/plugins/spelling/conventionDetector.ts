/**
 * Detects US/UK English conventions without using an LLM
 */

export type LanguageConvention = 'US' | 'UK' | 'mixed' | 'unknown';

interface ConventionEvidence {
  word: string;
  convention: 'US' | 'UK';
  count: number;
}

// Common US/UK spelling differences
const SPELLING_PATTERNS: Array<{
  us: RegExp;
  uk: RegExp;
  examples: { us: string; uk: string }[];
}> = [
  // -ize vs -ise
  {
    us: /\b(\w+)ize(d?|s?|r?|rs?|ation|ations|ing)\b/gi,
    uk: /\b(\w+)ise(d?|s?|r?|rs?|ation|ations|ing)\b/gi,
    examples: [
      { us: 'organize', uk: 'organise' },
      { us: 'recognize', uk: 'recognise' },
      { us: 'realize', uk: 'realise' },
    ]
  },
  // -or vs -our
  {
    us: /\b(\w+)or(s?|ed|ing|ful|less|ship)?\b/gi,
    uk: /\b(\w+)our(s?|ed|ing|ful|less|ship)?\b/gi,
    examples: [
      { us: 'color', uk: 'colour' },
      { us: 'honor', uk: 'honour' },
      { us: 'behavior', uk: 'behaviour' },
    ]
  },
  // -er vs -re
  {
    us: /\b(cent|met|theat|fib)er(s?|ed)?\b/gi,
    uk: /\b(cent|met|theat|fib)re(s?|d)?\b/gi,
    examples: [
      { us: 'center', uk: 'centre' },
      { us: 'meter', uk: 'metre' },
      { us: 'theater', uk: 'theatre' },
    ]
  },
  // -yze vs -yse
  {
    us: /\b(\w+)yze(d?|s?|r?|rs?|ing)?\b/gi,
    uk: /\b(\w+)yse(d?|s?|r?|rs?|ing)?\b/gi,
    examples: [
      { us: 'analyze', uk: 'analyse' },
      { us: 'paralyze', uk: 'paralyse' },
    ]
  },
  // Single vs double L
  {
    us: /\b(travel|cancel|model|fuel|dial|cruel|jewel)ed\b/gi,
    uk: /\b(travel|cancel|model|fuel|dial|cruel|jewel)led\b/gi,
    examples: [
      { us: 'traveled', uk: 'travelled' },
      { us: 'canceled', uk: 'cancelled' },
      { us: 'modeled', uk: 'modelled' },
    ]
  },
  {
    us: /\b(travel|cancel|model|fuel|dial|cruel|jewel)ing\b/gi,
    uk: /\b(travel|cancel|model|fuel|dial|cruel|jewel)ling\b/gi,
    examples: [
      { us: 'traveling', uk: 'travelling' },
      { us: 'canceling', uk: 'cancelling' },
    ]
  },
  // -ense vs -ence
  {
    us: /\b(def|off|pret)ense(s?|less)?\b/gi,
    uk: /\b(def|off|pret)ence(s?|less)?\b/gi,
    examples: [
      { us: 'defense', uk: 'defence' },
      { us: 'offense', uk: 'offence' },
    ]
  },
  // -og vs -ogue
  {
    us: /\b(catalog|dialog|monolog|analog)(s?|ed|ing|ue)?\b/gi,
    uk: /\b(catalogue|dialogue|monologue|analogue)(s?|d|ing)?\b/gi,
    examples: [
      { us: 'catalog', uk: 'catalogue' },
      { us: 'dialog', uk: 'dialogue' },
    ]
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
 * Detect language convention based on spelling patterns
 */
export function detectLanguageConvention(text: string): {
  convention: LanguageConvention;
  confidence: number;
  evidence: ConventionEvidence[];
} {
  const evidence: ConventionEvidence[] = [];
  const wordCounts = new Map<string, { us: number; uk: number }>();

  // Check spelling patterns
  for (const pattern of SPELLING_PATTERNS) {
    // Count US spellings
    const usMatches = text.match(pattern.us) || [];
    for (const match of usMatches) {
      const key = match.toLowerCase();
      const counts = wordCounts.get(key) || { us: 0, uk: 0 };
      counts.us++;
      wordCounts.set(key, counts);
    }

    // Count UK spellings
    const ukMatches = text.match(pattern.uk) || [];
    for (const match of ukMatches) {
      const key = match.toLowerCase();
      const counts = wordCounts.get(key) || { us: 0, uk: 0 };
      counts.uk++;
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
        const counts = wordCounts.get(key) || { us: 0, uk: 0 };
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
        const counts = wordCounts.get(key) || { us: 0, uk: 0 };
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
      evidence.push({ word, convention: 'US', count: counts.us });
      usCount += counts.us;
    } else if (counts.uk > 0 && counts.us === 0) {
      evidence.push({ word, convention: 'UK', count: counts.uk });
      ukCount += counts.uk;
    }
  }

  // Determine convention
  const total = usCount + ukCount;
  if (total === 0) {
    return { convention: 'unknown', confidence: 0, evidence: [] };
  }

  const usRatio = usCount / total;
  const ukRatio = ukCount / total;

  let convention: LanguageConvention;
  let confidence: number;

  if (usRatio > 0.8) {
    convention = 'US';
    confidence = usRatio;
  } else if (ukRatio > 0.8) {
    convention = 'UK';
    confidence = ukRatio;
  } else if (usRatio > 0.2 && ukRatio > 0.2) {
    convention = 'mixed';
    confidence = 1 - Math.abs(usRatio - ukRatio);
  } else {
    convention = 'unknown';
    confidence = 0;
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