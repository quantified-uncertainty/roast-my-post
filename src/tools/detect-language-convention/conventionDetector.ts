/**
 * Convention detector for US vs UK English spelling
 * Uses pattern matching to identify spelling conventions without LLM calls
 */

// Words that are ambiguous or context-dependent (should be ignored)
const AMBIGUOUS_WORDS = new Set([
  'program', 'programs', // Could be US program or UK programme depending on context
  'license', 'licenses', // US uses for both noun/verb, UK uses licence (noun) / license (verb)
  'practice', 'practices', // US uses for both noun/verb, UK uses practice (noun) / practise (verb)
  'check', 'checks', // Could mean verify or UK cheque
  'tire', 'tires', // Could mean become tired or UK tyre
  'curb', 'curbs', // Could mean restrain or UK kerb
  'draft', 'drafts', // Could mean preliminary version or UK draught
  'meter', 'meters', // Could be measuring device (same in both) or US spelling of metre
]);

// Common words that differ between US and UK English
const US_UK_WORD_PAIRS: Record<string, string> = {
  // -ize vs -ise endings
  'organize': 'organise',
  'organized': 'organised',
  'organizer': 'organiser',
  'organizers': 'organisers',
  'organizing': 'organising',
  'organization': 'organisation',
  'organizations': 'organisations',
  'organizational': 'organisational',
  'recognize': 'recognise',
  'recognized': 'recognised',
  'recognizing': 'recognising',
  'recognition': 'recognition', // same in both
  'realize': 'realise',
  'realized': 'realised',
  'realizing': 'realising',
  'realization': 'realisation',
  'analyze': 'analyse',
  'analyzed': 'analysed',
  'analyzer': 'analyser',
  'analyzing': 'analysing',
  'analysis': 'analysis', // same in both
  'optimize': 'optimise',
  'optimized': 'optimised',
  'optimizing': 'optimising',
  'optimization': 'optimisation',
  'minimize': 'minimise',
  'minimized': 'minimised',
  'minimizing': 'minimising',
  'maximize': 'maximise',
  'maximized': 'maximised',
  'maximizing': 'maximising',
  'utilize': 'utilise',
  'utilized': 'utilised',
  'utilizing': 'utilising',
  'utilization': 'utilisation',
  'specialize': 'specialise',
  'specialized': 'specialised',
  'specializing': 'specialising',
  'specialization': 'specialisation',
  'generalize': 'generalise',
  'generalized': 'generalised',
  'generalizing': 'generalising',
  'generalization': 'generalisation',
  'prioritize': 'prioritise',
  'prioritized': 'prioritised',
  'prioritizing': 'prioritising',
  'categorize': 'categorise',
  'categorized': 'categorised',
  'categorizing': 'categorising',
  'standardize': 'standardise',
  'standardized': 'standardised',
  'standardizing': 'standardising',
  'authorize': 'authorise',
  'authorized': 'authorised',
  'authorizing': 'authorising',
  'authorization': 'authorisation',
  'customize': 'customise',
  'customized': 'customised',
  'customizing': 'customising',
  'customization': 'customisation',
  'memorize': 'memorise',
  'memorized': 'memorised',
  'memorizing': 'memorising',
  'apologize': 'apologise',
  'apologized': 'apologised',
  'apologizing': 'apologising',
  'summarize': 'summarise',
  'summarized': 'summarised',
  'summarizing': 'summarising',
  'emphasize': 'emphasise',
  'emphasized': 'emphasised',
  'emphasizing': 'emphasising',
  
  // -or vs -our endings
  'color': 'colour',
  'colors': 'colours',
  'colored': 'coloured',
  'coloring': 'colouring',
  'colorful': 'colourful',
  'colorless': 'colourless',
  'honor': 'honour',
  'honors': 'honours',
  'honored': 'honoured',
  'honoring': 'honouring',
  'honorable': 'honourable',
  'behavior': 'behaviour',
  'behaviors': 'behaviours',
  'behavioral': 'behavioural',
  'neighbor': 'neighbour',
  'neighbors': 'neighbours',
  'neighborhood': 'neighbourhood',
  'neighboring': 'neighbouring',
  'flavor': 'flavour',
  'flavors': 'flavours',
  'flavored': 'flavoured',
  'flavorful': 'flavourful',
  'favor': 'favour',
  'favors': 'favours',
  'favored': 'favoured',
  'favoring': 'favouring',
  'favorable': 'favourable',
  'favorite': 'favourite',
  'favorites': 'favourites',
  'labor': 'labour',
  'labored': 'laboured',
  'laboring': 'labouring',
  'laborious': 'laborious', // same in both
  'odor': 'odour',
  'odors': 'odours',
  'odorless': 'odourless',
  'humor': 'humour',
  'humorous': 'humorous', // same in both
  'harbor': 'harbour',
  'harbors': 'harbours',
  'harbored': 'harboured',
  
  // -er vs -re endings
  'center': 'centre',
  'centers': 'centres',
  'centered': 'centred',
  'centering': 'centring',
  'central': 'central', // same in both
  'meter': 'metre',
  'meters': 'metres',
  'metric': 'metric', // same in both
  'theater': 'theatre',
  'theaters': 'theatres',
  'theatrical': 'theatrical', // same in both
  'fiber': 'fibre',
  'fibers': 'fibres',
  'fibrous': 'fibrous', // same in both
  
  // Single vs double L
  'traveled': 'travelled',
  'traveler': 'traveller',
  'travelers': 'travellers',
  'traveling': 'travelling',
  'modeled': 'modelled',
  'modeling': 'modelling',
  'modeler': 'modeller',
  'canceled': 'cancelled',
  'canceling': 'cancelling',
  'cancellation': 'cancellation', // same in both
  'labeled': 'labelled',
  'labeling': 'labelling',
  'fueled': 'fuelled',
  'fueling': 'fuelling',
  'leveled': 'levelled',
  'leveling': 'levelling',
  
  // Other common differences
  'defense': 'defence',
  'defenses': 'defences',
  'defensive': 'defensive', // same in both
  'offense': 'offence',
  'offenses': 'offences',
  'offensive': 'offensive', // same in both
  'license': 'licence', // US verb/noun, UK noun only
  'licenses': 'licences',
  'licensed': 'licensed', // verb form same in both
  'licensing': 'licensing', // same in both
  'gray': 'grey',
  'grays': 'greys',
  'graying': 'greying',
  'aluminum': 'aluminium',
  'airplane': 'aeroplane',
  'airplanes': 'aeroplanes',
  'plow': 'plough',
  'plows': 'ploughs',
  'plowed': 'ploughed',
  'mom': 'mum',
  'moms': 'mums',
  'catalog': 'catalogue',
  'catalogs': 'catalogues',
  'dialog': 'dialogue',
  'dialogs': 'dialogues',
  'analog': 'analogue',
  'pediatric': 'paediatric',
  'pediatrician': 'paediatrician',
  'anesthesia': 'anaesthesia',
  'anesthetic': 'anaesthetic',
  'skeptic': 'sceptic',
  'skeptical': 'sceptical',
  'skepticism': 'scepticism',
  'artifact': 'artefact',
  'artifacts': 'artefacts',
  'donut': 'doughnut',
  'donuts': 'doughnuts',
  'pajamas': 'pyjamas',
  'mustache': 'moustache',
  'mustaches': 'moustaches',
  'cozy': 'cosy',
  'cozier': 'cosier',
  'coziest': 'cosiest'
};

// Create reverse mapping for UK to US
const UK_US_WORD_PAIRS: Record<string, string> = {};
for (const [us, uk] of Object.entries(US_UK_WORD_PAIRS)) {
  UK_US_WORD_PAIRS[uk] = us;
}

// Weight multipliers for different types of differences
const PATTERN_WEIGHTS = {
  'ize/ise': 1.5,      // Very strong indicator
  'or/our': 1.5,       // Very strong indicator  
  'er/re': 1.3,        // Strong indicator
  'single/double-l': 1.2, // Good indicator
  'other': 1.0         // Standard weight
};

// Word frequency multipliers (more common words count more)
const WORD_FREQUENCY_WEIGHTS: Record<string, number> = {
  // Very common words (2.0x weight)
  'organize': 2.0, 'organized': 2.0, 'organizing': 2.0, 'organization': 2.0,
  'organise': 2.0, 'organised': 2.0, 'organising': 2.0, 'organisation': 2.0,
  'color': 2.0, 'colors': 2.0, 'colored': 2.0,
  'colour': 2.0, 'colours': 2.0, 'coloured': 2.0,
  'center': 1.8, 'centers': 1.8, 'centered': 1.8,
  'centre': 1.8, 'centres': 1.8, 'centred': 1.8,
  'realize': 1.8, 'realized': 1.8, 'realizing': 1.8,
  'realise': 1.8, 'realised': 1.8, 'realising': 1.8,
  'recognize': 1.6, 'recognized': 1.6, 'recognizing': 1.6,
  'recognise': 1.6, 'recognised': 1.6, 'recognising': 1.6,
  'analyze': 1.6, 'analyzed': 1.6, 'analyzing': 1.6, 'analysis': 1.6,
  'analyse': 1.6, 'analysed': 1.6, 'analysing': 1.6,
  'behavior': 1.4, 'behaviors': 1.4,
  'behaviour': 1.4, 'behaviours': 1.4,
  'favorite': 1.4, 'favorites': 1.4,
  'favourite': 1.4, 'favourites': 1.4,
  'neighbor': 1.3, 'neighbors': 1.3, 'neighborhood': 1.3,
  'neighbour': 1.3, 'neighbours': 1.3, 'neighbourhood': 1.3,
  // Medium frequency (1.0-1.2x weight) - default
  // Low frequency (0.8x weight)
  'harbour': 0.8, 'harbours': 0.8,
  'harbor': 0.8, 'harbors': 0.8,
  'plough': 0.8, 'ploughs': 0.8,
  'plow': 0.8, 'plows': 0.8,
  'aluminium': 0.8,
  'aluminum': 0.8,
  'aeroplane': 0.8, 'aeroplanes': 0.8,
  'airplane': 0.8, 'airplanes': 0.8,
};

export interface ConventionDetectionResult {
  convention: 'US' | 'UK';
  confidence: number;
  consistency: number;
  evidence: Array<{
    word: string;
    convention: 'US' | 'UK';
    count: number;
  }>;
}

export interface DocumentTypeResult {
  type: 'academic' | 'technical' | 'blog' | 'casual' | 'unknown';
  confidence: number;
}

function getPatternType(usWord: string, ukWord: string): string {
  if (usWord.includes('ize') && ukWord.includes('ise')) return 'ize/ise';
  if (usWord.endsWith('or') && ukWord.endsWith('our')) return 'or/our';
  if (usWord.endsWith('er') && ukWord.endsWith('re')) return 'er/re';
  if (usWord.match(/l+ed|l+ing|l+er/) && ukWord.match(/ll+ed|ll+ing|ll+er/)) return 'single/double-l';
  return 'other';
}

export function detectLanguageConvention(text: string): ConventionDetectionResult {
  // Normalize text to lowercase for matching
  const normalizedText = text.toLowerCase();
  const words = normalizedText.match(/\b[\w']+\b/g) || [];
  
  const usMatches = new Map<string, number>();
  const ukMatches = new Map<string, number>();
  
  // Check each word against our dictionaries
  for (const word of words) {
    // Skip ambiguous words
    if (AMBIGUOUS_WORDS.has(word)) {
      continue;
    }
    
    if (US_UK_WORD_PAIRS[word]) {
      // This is a US spelling
      usMatches.set(word, (usMatches.get(word) || 0) + 1);
    } else if (UK_US_WORD_PAIRS[word]) {
      // This is a UK spelling
      ukMatches.set(word, (ukMatches.get(word) || 0) + 1);
    }
  }
  
  // Calculate weighted scores
  let usScore = 0;
  let ukScore = 0;
  
  for (const [word, count] of usMatches) {
    const ukEquivalent = US_UK_WORD_PAIRS[word];
    const patternType = getPatternType(word, ukEquivalent);
    const patternWeight = PATTERN_WEIGHTS[patternType as keyof typeof PATTERN_WEIGHTS] || 1;
    const frequencyWeight = WORD_FREQUENCY_WEIGHTS[word] || 1.0;
    usScore += count * patternWeight * frequencyWeight;
  }
  
  for (const [word, count] of ukMatches) {
    const usEquivalent = UK_US_WORD_PAIRS[word];
    const patternType = getPatternType(usEquivalent, word);
    const patternWeight = PATTERN_WEIGHTS[patternType as keyof typeof PATTERN_WEIGHTS] || 1;
    const frequencyWeight = WORD_FREQUENCY_WEIGHTS[word] || 1.0;
    ukScore += count * patternWeight * frequencyWeight;
  }
  
  // Prepare evidence array
  const evidence: ConventionDetectionResult['evidence'] = [];
  
  // Add US evidence
  for (const [word, count] of usMatches) {
    evidence.push({ word, convention: 'US', count });
  }
  
  // Add UK evidence
  for (const [word, count] of ukMatches) {
    evidence.push({ word, convention: 'UK', count });
  }
  
  // Sort evidence by count (descending)
  evidence.sort((a, b) => b.count - a.count);
  
  // Calculate results
  const totalScore = usScore + ukScore;
  const totalEvidenceCount = Array.from(usMatches.values()).reduce((a, b) => a + b, 0) + 
                            Array.from(ukMatches.values()).reduce((a, b) => a + b, 0);
  
  let convention: 'US' | 'UK';
  let confidence = 0;
  let consistency = 1; // Default to fully consistent
  
  if (totalEvidenceCount < 3) {
    // Insufficient evidence, default to US with 0 confidence
    convention = 'US';
    confidence = 0;
    consistency = 1; // No inconsistency when there's no evidence
  } else {
    // Calculate dominance
    const dominance = totalScore > 0 ? Math.max(usScore, ukScore) / totalScore : 0;
    
    if (dominance > 0.8) { // 80%+ one way
      convention = usScore > ukScore ? 'US' : 'UK';
      confidence = dominance;
      consistency = dominance; // How "pure" the usage is
    } else {
      // Mixed but we still pick the dominant one
      convention = usScore >= ukScore ? 'US' : 'UK';
      confidence = dominance;
      consistency = dominance; // Lower consistency for mixed usage
    }
    
    // Scale confidence based on amount of evidence
    // More evidence = more confident in our assessment
    const evidenceFactor = Math.min(1, totalEvidenceCount / 10);
    confidence = confidence * 0.7 + evidenceFactor * 0.3;
  }
  
  return {
    convention,
    confidence,
    consistency,
    evidence: evidence.slice(0, 10) // Return top 10 pieces of evidence
  };
}

export function detectDocumentType(text: string): DocumentTypeResult {
  const patterns = {
    academic: {
      indicators: [
        /\babstract\s*:/i,
        /\bintroduction\s*:/i,
        /\bmethodology\s*:/i,
        /\bliterature review\b/i,
        /\bconclusion\s*:/i,
        /\breferences\s*:/i,
        /\bfigure \d+/i,
        /\btable \d+/i,
        /\bet al\.?/i,
        /\b\(\d{4}\)/,  // Year citations
        /\bthesis\b/i,
        /\bdissertation\b/i,
        /\bpeer[- ]reviewed?\b/i,
        /\bjournal\b/i,
        /\bempirical\b/i,
        /\btheoretical framework\b/i,
        /\bhypothes[ie]s\b/i,
        /\bfindings suggest\b/i,
        /\bstatistically significant\b/i
      ],
      weight: 1.5
    },
    technical: {
      indicators: [
        /\bAPI\b/,
        /\bSDK\b/,
        /\bdocumentation\b/i,
        /\binstallation\b/i,
        /\bconfiguration\b/i,
        /\bparameters?\b/i,
        /\bfunction\s*\(/,
        /\bclass\s+\w+/,
        /\bimport\s+/,
        /\brequire\s*\(/,
        /\bREADME\b/i,
        /\b(GET|POST|PUT|DELETE)\s+\//,
        /\bversion\s+\d+\.\d+/i,
        /\b```[\w]*\n/,  // Code blocks
        /\bgit\s+(clone|pull|push|commit)\b/i,
        /\bnpm\s+(install|run)\b/i,
        /\blocalhost:\d+/,
        /\bdebugging?\b/i,
        /\bframework\b/i,
        /\blibrary\b/i
      ],
      weight: 1.3
    },
    blog: {
      indicators: [
        /\b(I|I've|I'm|we|we've|we're)\b/i,
        /\btoday\s+(I|we)/i,
        /\blet's\s+/i,
        /\byou'll\s+/i,
        /\bhave you ever\b/i,
        /\bcheck out\b/i,
        /\bstay tuned\b/i,
        /\btips?\s+and\s+tricks?\b/i,
        /\bhow to\b/i,
        /\btop \d+\b/i,
        /\bultimate guide\b/i,
        /\bcomments? below\b/i,
        /\bsubscribe\b/i,
        /\bshare this\b/i,
        /\bmy experience\b/i,
        /\bpersonal(ly)?\b/i
      ],
      weight: 1.0
    },
    casual: {
      indicators: [
        /\b(lol|omg|btw|fyi|imho|imo)\b/i,
        /\b(gonna|wanna|gotta|kinda|sorta)\b/i,
        /!{2,}/,  // Multiple exclamation marks
        /\?{2,}/,  // Multiple question marks
        /\.\.\./,  // Ellipsis
        /\bemoji/i,
        /\b(hey|hi|hello)\s+guys\b/i,
        /\b(awesome|amazing|cool|great)\b/i,
        /\b(yeah|yep|nope|ok|okay)\b/i,
        /\bthx|thanks\b/i,
        /\bpls|please\b/i
      ],
      weight: 0.8
    }
  };
  
  const scores: Record<string, number> = {
    academic: 0,
    technical: 0,
    blog: 0,
    casual: 0
  };
  
  // Calculate scores for each type
  for (const [type, config] of Object.entries(patterns)) {
    for (const pattern of config.indicators) {
      const matches = text.match(pattern);
      if (matches) {
        scores[type] += matches.length * config.weight;
      }
    }
  }
  
  // Find the highest scoring type
  let maxScore = 0;
  let detectedType: DocumentTypeResult['type'] = 'unknown';
  
  for (const [type, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      detectedType = type as DocumentTypeResult['type'];
    }
  }
  
  // Calculate confidence based on score strength
  const confidence = maxScore > 0 ? Math.min(1, maxScore / 20) : 0;
  
  return {
    type: detectedType,
    confidence
  };
}

export function getConventionExamples(convention: string): string[] {
  switch (convention) {
    case 'US':
      return [
        'Uses -ize endings (organize, realize)',
        'Uses -or endings (color, honor)',
        'Uses -er endings (center, theater)',
        'Single L in past tense (traveled, modeled)'
      ];
    case 'UK':
      return [
        'Uses -ise endings (organise, realise)',
        'Uses -our endings (colour, honour)',
        'Uses -re endings (centre, theatre)',
        'Double L in past tense (travelled, modelled)'
      ];
    default:
      return [];
  }
}