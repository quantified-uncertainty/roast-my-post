export interface MockComment {
  id: string;
  text: string;
  highlightStart: number;
  highlightEnd: number;
  author: string;
  timestamp: Date;
  replies?: MockComment[];
}

// Markdown content similar to a real document
export const mockMarkdownContent = `# The Future of Artificial Intelligence: Challenges and Opportunities

## Introduction

The rapid advancement of artificial intelligence has sparked intense debates about its potential impact on society. While some experts predict transformative benefits, others warn of significant risks that must be carefully managed. This comprehensive analysis explores the multifaceted implications of AI across various sectors and examines the critical considerations for its responsible development and deployment.

## Current State of AI Technology

### Machine Learning Revolution

Machine learning algorithms have already revolutionized numerous industries, from healthcare diagnostics to financial trading. These systems can process vast amounts of data and identify patterns that would be impossible for humans to detect manually. The sophistication of modern ML models has exceeded even the most optimistic predictions from a decade ago.

Recent breakthroughs in deep learning have enabled:
- **Computer vision** systems that surpass human accuracy in image recognition
- **Natural language processing** models that can understand and generate human-like text
- **Reinforcement learning** algorithms that master complex games and real-world tasks

### Ethical Considerations

However, the deployment of AI systems raises important ethical questions. Issues of bias, transparency, and accountability must be addressed to ensure these technologies benefit all of humanity. The "black box" nature of many AI systems poses particular challenges for industries where explainability is crucial.

Key ethical concerns include:
1. Algorithmic bias and discrimination
2. Privacy and surveillance implications
3. Job displacement and economic inequality
4. Autonomous weapons and military applications

## Industry Applications

### Healthcare Transformation

One of the most promising applications of AI is in healthcare, where machine learning models are being used to diagnose diseases, predict patient outcomes, and personalize treatment plans. Early detection systems powered by AI have shown remarkable success in identifying cancers and other conditions that might be missed by human practitioners.

**Case Study: Radiology AI**
Recent studies have shown that AI systems can detect breast cancer in mammograms with 94.5% accuracy, compared to 88% for human radiologists. When used in conjunction with human expertise, the combined accuracy rises to 99.5%.

### Financial Services Evolution

In the financial sector, AI algorithms are transforming everything from credit scoring to fraud detection. High-frequency trading systems can execute thousands of transactions per second, fundamentally changing how markets operate. However, these systems also introduce new risks, including the potential for flash crashes and algorithmic bias in lending decisions.

#### Risk Management
Modern AI-driven risk management systems analyze:
- Market volatility patterns
- Credit default probabilities
- Fraudulent transaction indicators
- Regulatory compliance metrics

### Educational Innovation

The education sector is also experiencing a revolution through AI-powered adaptive learning systems. These platforms can customize educational content to individual students' learning styles and pace, potentially addressing long-standing challenges in personalized education. Virtual tutors and automated grading systems are freeing up teachers to focus on more creative and interpersonal aspects of education.

**Benefits of AI in Education:**
- Personalized learning paths
- Real-time feedback and assessment
- Accessibility for students with disabilities
- Scalable educational resources

### Transportation and Logistics

Transportation is another domain where AI is making significant inroads. Autonomous vehicles promise to reduce accidents, optimize traffic flow, and provide mobility solutions for those unable to drive. The technology is advancing rapidly, with several companies already testing self-driving cars on public roads.

#### Current Progress:
- Level 4 autonomous vehicles in limited deployments
- AI-optimized routing reducing delivery times by 30%
- Predictive maintenance preventing 45% of vehicle breakdowns
- Smart traffic management systems reducing congestion by 25%

## Technological Challenges

### Natural Language Processing

Natural language processing has evolved to the point where AI can engage in sophisticated conversations, translate between languages with high accuracy, and even generate creative content. Large language models have demonstrated capabilities that were thought to be decades away just a few years ago.

However, challenges remain:
- Understanding context and nuance
- Handling multiple languages and dialects
- Avoiding hallucinations and misinformation
- Maintaining coherence in long-form content

### Environmental Applications

The environmental applications of AI are particularly noteworthy. Machine learning is being used to optimize energy grids, predict weather patterns with greater accuracy, and identify areas at risk of deforestation. These tools are becoming essential in the fight against climate change.

**Climate AI Applications:**
1. Smart grid optimization reducing energy waste by 15%
2. Precision agriculture decreasing water usage by 30%
3. Wildlife tracking and conservation efforts
4. Carbon footprint analysis and reduction strategies

## Economic and Social Impact

### Manufacturing and Industry 4.0

In manufacturing, AI-powered robotics and quality control systems are increasing efficiency and reducing waste. Predictive maintenance algorithms can identify equipment failures before they occur, minimizing downtime and saving billions in lost productivity.

**Industry 4.0 Metrics:**
- 50% reduction in unplanned downtime
- 20% increase in production efficiency
- 85% accuracy in demand forecasting
- 30% decrease in maintenance costs

### Creative Industries

The creative industries are also being transformed by AI. From generating music and art to assisting in film production and game design, AI tools are augmenting human creativity in unprecedented ways. This has sparked debates about authorship, originality, and the nature of creativity itself.

Examples of AI in creativity:
- Music composition and production
- Visual art and design generation
- Story and screenplay writing assistance
- Video game procedural content generation

## Security and Governance

### Defense and Security

Security and defense applications of AI include advanced threat detection systems, autonomous drones, and predictive analytics for preventing cyber attacks. While these technologies offer significant benefits for national security, they also raise concerns about privacy, autonomous weapons, and the potential for an AI arms race.

### Legal and Regulatory Frameworks

The legal profession is adapting to AI through tools that can analyze vast amounts of case law, predict judicial outcomes, and automate document review. This is making legal services more accessible while also changing the nature of legal work.

**AI in Legal Services:**
- Contract analysis and review
- Legal research automation
- Predictive case outcome modeling
- Compliance monitoring and reporting

## Future Outlook

### Research Directions

Researchers are working on developing more explainable AI models that can provide insights into their decision-making processes. This transparency is crucial for building trust and ensuring responsible deployment. Key research areas include:

1. **Explainable AI (XAI)**: Making black-box models interpretable
2. **Federated Learning**: Training models while preserving privacy
3. **Neuromorphic Computing**: Brain-inspired computing architectures
4. **Quantum AI**: Leveraging quantum computing for AI applications

### Policy and Regulation

The future of AI will likely depend on our ability to balance innovation with thoughtful regulation and ethical considerations. Collaboration between technologists, policymakers, and ethicists will be essential. Emerging regulatory frameworks include:

- EU AI Act establishing risk-based regulations
- US federal AI guidelines for government use
- Industry-specific standards for healthcare and finance
- International cooperation on AI governance

### Long-term Implications

As we look to the future, the integration of AI into society will require careful consideration of numerous factors. We must ensure that the benefits of AI are distributed equitably and that appropriate safeguards are in place to prevent misuse. The decisions we make today about AI governance will shape the trajectory of human civilization for generations to come.

## Conclusion

The AI revolution presents both unprecedented opportunities and significant challenges. Success will require:
- Continued investment in research and development
- Robust ethical frameworks and governance structures
- Public education and engagement
- International cooperation and standards
- Adaptive regulatory approaches

By working together across disciplines and borders, we can harness the transformative power of AI while mitigating its risks, creating a future where artificial intelligence serves as a tool for human flourishing rather than a source of division or harm.

---

*This document represents current thinking on AI development and deployment. As the field evolves rapidly, regular updates and revisions will be necessary to maintain relevance and accuracy.*`;

export const mockComments: MockComment[] = [
  {
    id: 'comment-1',
    text: 'This claim needs more supporting evidence. What specific debates are being referenced? The statement about "intense debates" is quite vague and could benefit from concrete examples. For instance, are we talking about the debates at the AI Safety Summit in November 2023? Or perhaps the ongoing discussions in Congress about AI regulation? Without specific references, readers cannot verify these claims or understand the full context of the discussion. I would suggest adding at least 2-3 specific examples of these debates, including dates, participants, and key points of contention.',
    highlightStart: 108,
    highlightEnd: 152,
    author: 'Alice Johnson',
    timestamp: new Date('2024-01-15T10:30:00'),
    replies: [
      {
        id: 'reply-1-1',
        text: 'I agree. Some citations to recent policy discussions would strengthen this point.',
        highlightStart: 108,
        highlightEnd: 152,
        author: 'Bob Smith',
        timestamp: new Date('2024-01-15T11:15:00'),
      }
    ]
  },
  {
    id: 'comment-2',
    text: 'The healthcare example is particularly compelling, but it needs more depth. Can we add specific case studies from major medical centers? I\'m thinking of the work at Stanford Medical Center using AI for early cancer detection, or the Mayo Clinic\'s use of AI in predicting patient deterioration. These concrete examples would make the benefits much more tangible to readers. Additionally, we should address the challenges these institutions faced during implementation - issues with data privacy, physician buy-in, and integration with existing systems. This balanced view would strengthen the credibility of our analysis.',
    highlightStart: 520,
    highlightEnd: 590,
    author: 'Carol Davis',
    timestamp: new Date('2024-01-15T14:20:00'),
  },
  {
    id: 'comment-3',
    text: 'This section on machine learning is technically accurate but may be too abstract for our intended audience. Consider adding a concrete example here - perhaps how Netflix uses ML for recommendations or how Gmail filters spam. These everyday examples help readers connect with the technology.',
    highlightStart: 540,
    highlightEnd: 560,
    author: 'David Wilson',
    timestamp: new Date('2024-01-15T14:25:00'),
  },
  {
    id: 'comment-4',
    text: 'I strongly disagree with the framing here. The emphasis on "revolutionized" is hyperbolic. While ML has made significant advances, many industries still operate largely as they did before. A more nuanced discussion would acknowledge both the transformative potential and the current limitations.',
    highlightStart: 545,
    highlightEnd: 570,
    author: 'Sarah Chen',
    timestamp: new Date('2024-01-15T14:30:00'),
  },
  {
    id: 'comment-5',
    text: 'Critical point about bias that deserves its own section. We should elaborate on specific examples of AI bias in deployment. The ProPublica investigation into COMPAS is a must-mention, as is the Amazon hiring algorithm scandal. But we also need to discuss progress made - differential privacy, fairness-aware ML, and new auditing frameworks. I can provide a comprehensive literature review if helpful. This is too important to gloss over in a single paragraph.',
    highlightStart: 1235,
    highlightEnd: 1290,
    author: 'Eve Martinez',
    timestamp: new Date('2024-01-16T09:00:00'),
  },
  {
    id: 'comment-6',
    text: 'The 94.5% accuracy figure is misleading without context. This number comes from a specific study on mammogram analysis, not a general capability. We need to clarify: (1) This was on a curated dataset, not real-world messy data, (2) The comparison wasn\'t fair - radiologists had limited time while AI had unlimited processing, (3) The study was partially funded by the AI company itself. I\'m not saying the results are invalid, but presenting them without these caveats is irresponsible. We should either provide full context or use a different example.',
    highlightStart: 2280,
    highlightEnd: 2295,
    author: 'Frank Thompson',
    timestamp: new Date('2024-01-16T09:30:00'),
  },
  {
    id: 'comment-7',
    text: 'Actually, recent meta-analyses show even higher accuracy when AI and radiologists work together. See Zhang et al. (2024) in Nature Medicine.',
    highlightStart: 2290,
    highlightEnd: 2295,
    author: 'Lisa Wang',
    timestamp: new Date('2024-01-16T09:45:00'),
  },
  {
    id: 'comment-8',
    text: 'Both valid points above, but we\'re missing the bigger picture about healthcare AI. The real revolution isn\'t in diagnostic accuracy - it\'s in accessibility. AI can bring specialist-level diagnostics to rural areas where no specialists exist. That\'s the story we should be telling.',
    highlightStart: 2285,
    highlightEnd: 2300,
    author: 'Dr. Michael Ross',
    timestamp: new Date('2024-01-16T10:00:00'),
  },
  {
    id: 'comment-9',
    text: 'This section on transportation could benefit from discussing infrastructure requirements. Self-driving cars aren\'t just a technology problem - they require smart road infrastructure, updated regulations, insurance frameworks, and public acceptance. The technology might be advancing rapidly, but these other factors are the real bottlenecks. We should acknowledge that full deployment is likely decades away, not years. Also, the environmental impact of replacing the entire vehicle fleet shouldn\'t be glossed over.',
    highlightStart: 3840,
    highlightEnd: 3950,
    author: 'Grace Lee',
    timestamp: new Date('2024-01-16T15:45:00'),
  },
  {
    id: 'comment-10',
    text: 'Important to mention the environmental cost of training large AI models here. Recent studies show that training a single large language model can emit as much CO2 as five cars over their entire lifetime. This undermines the environmental benefits discussed. We need a more balanced view that acknowledges AI\'s carbon footprint while discussing its potential for environmental good.',
    highlightStart: 5520,
    highlightEnd: 5580,
    author: 'Henry Chen',
    timestamp: new Date('2024-01-17T08:00:00'),
  },
  {
    id: 'comment-11',
    text: 'The Industry 4.0 metrics seem cherry-picked. Where\'s the discussion of implementation costs? Small manufacturers can\'t afford these systems. Also, "50% reduction in downtime" is meaningless without knowing the baseline. Were these factories already optimized? What industries? What scale? We need to present a more realistic picture that includes failed implementations and the challenges of retrofitting existing facilities. Otherwise, we\'re just parroting vendor marketing materials.',
    highlightStart: 6450,
    highlightEnd: 6510,
    author: 'Isabel Rodriguez',
    timestamp: new Date('2024-01-17T10:30:00'),
  },
  {
    id: 'comment-12',
    text: 'Legal liability for AI-generated content is a crucial topic missing from this section. Who\'s responsible when AI gives bad legal advice? What about malpractice? Bar associations are already grappling with these questions. We had a case last month where a lawyer used ChatGPT for research and cited non-existent cases. The judge was not amused. We need at least a paragraph on professional liability and the evolving regulatory landscape. I can draft something based on recent ABA guidelines.',
    highlightStart: 7120,
    highlightEnd: 7200,
    author: 'Jack Murphy',
    timestamp: new Date('2024-01-17T14:00:00'),
  },
  {
    id: 'comment-13',
    text: 'Excellent conclusion, but it reads like corporate boilerplate. The multi-stakeholder approach is essential for responsible AI development, yes, but what does that mean concretely? We should end with specific calls to action: What should policymakers do tomorrow? What should companies implement next quarter? What can individuals do? Vague aspirations won\'t drive change. Let\'s be bold and specific.',
    highlightStart: 10250,
    highlightEnd: 10400,
    author: 'Karen White',
    timestamp: new Date('2024-01-18T11:00:00'),
  },
  {
    id: 'comment-14',
    text: 'Consider adding a section on AI governance in developing countries. The entire document has a Western bias. What about AI deployment in Africa, where mobile money leapfrogged traditional banking? Or India\'s Aadhaar system? These contexts have different challenges and opportunities that our framework doesn\'t address.',
    highlightStart: 9100,
    highlightEnd: 9200,
    author: 'Liam Anderson',
    timestamp: new Date('2024-01-18T13:30:00'),
  },
  {
    id: 'comment-15',
    text: 'The quantum AI mention is intriguing but premature. Current quantum computers can\'t run meaningful AI algorithms - we\'re decades away from practical quantum ML. Including this makes us look like we\'re chasing buzzwords. Either expand with real technical detail about quantum advantage for specific ML tasks, or remove it entirely.',
    highlightStart: 8650,
    highlightEnd: 8700,
    author: 'Maria Garcia',
    timestamp: new Date('2024-01-18T16:00:00'),
  }
];

// Helper function to convert markdown to simple slate format
export function markdownToSlateDocument() {
  // This is a simplified conversion - in reality you'd use remark-slate
  return [
    {
      type: 'paragraph',
      children: [{ text: mockMarkdownContent }],
    },
  ];
}

// Helper function to get comments for testing collision scenarios
export function getOverlappingComments(): MockComment[] {
  // Return comments 4, 5, and 6 which are close together
  return mockComments.slice(3, 7);
}