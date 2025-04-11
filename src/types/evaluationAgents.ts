export interface EvaluationAgent {
  id: string;
  name: string;
  version: string;
  description: string;
  iconName: string;
  color: string;
  capabilities: string[];
  use_cases: string[];
  limitations: string[];
}

export const evaluationAgents: EvaluationAgent[] = [
  {
    id: "emotional-analyzer",
    name: "Emotional Analyzer",
    version: "2.4",
    description: "Identifies emotional content and sentiment within text. Specializes in detecting subtle emotional undertones and analyzing sentiment distribution across documents.",
    iconName: "HeartIcon",
    color: "bg-red-100 text-red-800",
    capabilities: [
      "Sentiment analysis with 5-point scale",
      "Emotional tone identification",
      "Affective language detection",
      "Subjective vs. objective content classification"
    ],
    use_cases: [
      "Content moderation",
      "Customer feedback analysis",
      "Creative writing feedback",
      "Therapeutic text analysis"
    ],
    limitations: [
      "Limited understanding of cultural context",
      "May misinterpret sarcasm or irony",
      "Primarily optimized for English language"
    ]
  },
  {
    id: "logic-evaluator",
    name: "Logic Evaluator",
    version: "3.1",
    description: "Analyzes logical structure and reasoning within arguments. Identifies logical fallacies, validates argument structure, and assesses inferential connections.",
    iconName: "ScaleIcon",
    color: "bg-blue-100 text-blue-800",
    capabilities: [
      "Formal argument structure analysis",
      "Logical fallacy detection",
      "Premise-conclusion relationship validation",
      "Inferential strength assessment"
    ],
    use_cases: [
      "Academic paper evaluation",
      "Policy document analysis",
      "Debate preparation assistance",
      "Educational critical thinking support"
    ],
    limitations: [
      "Struggles with highly implicit reasoning",
      "Limited understanding of domain-specific inference patterns",
      "May miss subtle logical errors in complex arguments"
    ]
  },
  {
    id: "clarity-coach",
    name: "Clarity Coach",
    version: "1.8",
    description: "Evaluates the clarity, coherence, and readability of written communication. Provides metrics on readability and identifies opportunities for improved expression.",
    iconName: "LightBulbIcon",
    color: "bg-yellow-100 text-yellow-800",
    capabilities: [
      "Readability scoring across multiple scales",
      "Sentence structure complexity analysis",
      "Clarity enhancement suggestions",
      "Jargon and unnecessary complexity detection"
    ],
    use_cases: [
      "Documentation improvement",
      "Educational material optimization",
      "Technical communication simplification",
      "Content accessibility enhancement"
    ],
    limitations: [
      "May prioritize simplicity over nuance",
      "Less effective for specialized technical content",
      "Limited assessment of audience-specific clarity needs"
    ]
  },
  {
    id: "factual-validator",
    name: "Factual Validator",
    version: "4.2",
    description: "Assesses factual accuracy and verifiability of claims. Identifies potentially misleading statements and evaluates evidence quality.",
    iconName: "ClipboardDocumentCheckIcon",
    color: "bg-green-100 text-green-800",
    capabilities: [
      "Claim extraction and verification",
      "Citation and reference quality assessment",
      "Consistency checking across documents",
      "Confidence level assignment for factual claims"
    ],
    use_cases: [
      "Research validation",
      "News and media fact-checking",
      "Educational content verification",
      "Policy document assessment"
    ],
    limitations: [
      "Limited to knowledge available in training data",
      "Cannot independently verify novel claims",
      "May struggle with highly technical domain-specific facts"
    ]
  },
  {
    id: "code-quality-inspector",
    name: "Code Quality Inspector",
    version: "2.7",
    description: "Evaluates software code for quality, maintainability, and adherence to best practices. Identifies potential bugs, security issues, and opportunities for optimization.",
    iconName: "CodeBracketIcon",
    color: "bg-purple-100 text-purple-800",
    capabilities: [
      "Static code analysis",
      "Best practice compliance checking",
      "Security vulnerability detection",
      "Code complexity and maintainability metrics"
    ],
    use_cases: [
      "Code review automation",
      "Technical debt assessment",
      "Security audit assistance",
      "Developer education"
    ],
    limitations: [
      "Language-specific limitations (strongest in Python, JavaScript, Java)",
      "Cannot test runtime behavior",
      "Limited understanding of domain-specific optimizations"
    ]
  },
  {
    id: "statistical-reviewer",
    name: "Statistical Reviewer",
    version: "3.5",
    description: "Analyzes statistical methods, data presentation, and quantitative reasoning. Validates statistical approaches and identifies potential methodological issues.",
    iconName: "ChartBarIcon",
    color: "bg-indigo-100 text-indigo-800",
    capabilities: [
      "Statistical method appropriateness assessment",
      "Data visualization effectiveness evaluation",
      "Sample size and power analysis",
      "Statistical reporting completeness checking"
    ],
    use_cases: [
      "Research paper review",
      "Data journalism validation",
      "Medical study assessment",
      "Experimental design feedback"
    ],
    limitations: [
      "Requires explicit methodological details",
      "Limited to established statistical methods",
      "Cannot independently validate raw data quality"
    ]
  },
  {
    id: "creative-evaluator",
    name: "Creative Evaluator",
    version: "1.9",
    description: "Assesses creative works for originality, coherence, and artistic merit. Provides feedback on narrative structure, stylistic elements, and audience engagement potential.",
    iconName: "LightBulbIcon",
    color: "bg-pink-100 text-pink-800",
    capabilities: [
      "Stylistic analysis and comparison",
      "Narrative structure evaluation",
      "Originality assessment",
      "Genre convention adherence checking"
    ],
    use_cases: [
      "Creative writing feedback",
      "Marketing copy assessment",
      "Content engagement prediction",
      "Arts education support"
    ],
    limitations: [
      "Subjective nature of creative evaluation",
      "Cultural context limitations",
      "May favor conventional over experimental approaches"
    ]
  },
  {
    id: "technical-accuracy-checker",
    name: "Technical Accuracy Checker",
    version: "2.2",
    description: "Verifies technical accuracy in specialized domains including computer science, engineering, and mathematics. Validates terminology, concepts, and technical explanations.",
    iconName: "CpuChipIcon",
    color: "bg-gray-100 text-gray-800",
    capabilities: [
      "Domain-specific terminology validation",
      "Technical concept accuracy verification",
      "Procedural correctness checking",
      "Technical consistency assessment"
    ],
    use_cases: [
      "Technical documentation review",
      "Educational material validation",
      "Professional certification content verification",
      "Technical translation assessment"
    ],
    limitations: [
      "Domain coverage varies (strongest in CS, engineering, mathematics)",
      "Cutting-edge technical innovations may be missed",
      "Limited understanding of cross-domain applications"
    ]
  },
  {
    id: "pedagogical-reviewer",
    name: "Pedagogical Reviewer",
    version: "1.6",
    description: "Evaluates educational content for effectiveness, alignment with learning objectives, and pedagogical soundness. Assesses instructional design and learning progression.",
    iconName: "DocumentTextIcon",
    color: "bg-orange-100 text-orange-800",
    capabilities: [
      "Learning objective alignment checking",
      "Scaffolding and progression assessment",
      "Instructional clarity evaluation",
      "Assessment effectiveness analysis"
    ],
    use_cases: [
      "Course material development",
      "Educational content creation",
      "Training program assessment",
      "Self-learning resource validation"
    ],
    limitations: [
      "Limited adaptation to diverse learning styles",
      "May favor traditional pedagogical approaches",
      "Cannot directly measure learning outcomes"
    ]
  },
  {
    id: "bias-detector",
    name: "Bias Detector",
    version: "3.9",
    description: "Identifies potential biases in language, framing, representation, and reasoning. Analyzes content for fairness, inclusivity, and balanced perspective.",
    iconName: "MagnifyingGlassIcon",
    color: "bg-teal-100 text-teal-800",
    capabilities: [
      "Language bias detection",
      "Representation analysis",
      "Perspective diversity assessment",
      "Citation and reference diversity evaluation"
    ],
    use_cases: [
      "Media content analysis",
      "Policy document review",
      "Educational material assessment",
      "Organizational communication evaluation"
    ],
    limitations: [
      "May reflect training data biases",
      "Cultural context limitations",
      "Cannot assess all forms of subtle bias"
    ]
  }
];