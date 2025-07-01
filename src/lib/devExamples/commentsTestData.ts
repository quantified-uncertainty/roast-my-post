export interface MockComment {
  id: string;
  author: string;
  text: string;
  timestamp: string;
  highlightStart: number;
  highlightEnd: number;
  replies?: {
    author: string;
    text: string;
    timestamp: string;
  }[];
}

export const mockMarkdownContent = `# The Future of AI Safety

Artificial intelligence is rapidly advancing, and with it comes both tremendous opportunities and significant risks. As we develop more powerful AI systems, it's crucial that we consider their impact on society and implement appropriate safety measures.

## Current State of AI

Today's AI systems excel at specific tasks but lack general intelligence. Machine learning models can recognize images, translate languages, and even generate human-like text. However, these systems operate within narrow domains and require extensive training data.

The development of large language models has accelerated in recent years. These models demonstrate impressive capabilities in natural language understanding and generation. Yet they also exhibit limitations, including occasional hallucinations and biases inherited from their training data.

## Potential Risks

As AI systems become more capable, several risks emerge:

1. **Misalignment**: AI systems might pursue goals that differ from human values
2. **Autonomous weapons**: Military applications could lead to unprecedented dangers
3. **Economic disruption**: Automation may displace workers faster than new jobs emerge
4. **Privacy concerns**: AI can analyze personal data at unprecedented scales
5. **Manipulation**: Sophisticated AI could influence human behavior in harmful ways

## Safety Approaches

Researchers are developing various approaches to ensure AI safety:

### Technical Solutions

- **Interpretability**: Understanding how AI systems make decisions
- **Robustness**: Ensuring AI behaves reliably in diverse situations
- **Value alignment**: Teaching AI systems human values and ethics

### Governance and Policy

Effective AI governance requires collaboration between technologists, policymakers, and ethicists. International cooperation is essential to establish global standards and prevent a race to the bottom in safety practices.

## Looking Forward

The path to safe AI requires sustained effort from multiple stakeholders. We must balance innovation with caution, ensuring that as we advance AI capabilities, we also advance our ability to control and align these systems with human values.`;

export const mockComments: MockComment[] = [
  {
    id: 'comment-1',
    author: 'Dr. Sarah Chen',
    text: 'This section oversimplifies the current state of AI. While it\'s true that most systems are narrow, there are emerging capabilities in foundation models that blur these boundaries. GPT-4 and similar models show signs of emergent reasoning that wasn\'t explicitly trained.',
    timestamp: '2024-01-15T10:30:00Z',
    highlightStart: 234,
    highlightEnd: 362,
    replies: [
      {
        author: 'Prof. James Wilson',
        text: 'I agree. The distinction between narrow and general AI is becoming less clear.',
        timestamp: '2024-01-15T11:15:00Z'
      }
    ]
  },
  {
    id: 'comment-2',
    author: 'Prof. Michael Ross',
    text: 'The misalignment problem deserves more emphasis. It\'s not just about differing goals, but also about the difficulty of specifying human values in a way that AI systems can understand and implement. This is a fundamental challenge in AI safety research that goes beyond technical implementation.',
    timestamp: '2024-01-15T14:20:00Z',
    highlightStart: 887,
    highlightEnd: 986
  },
  {
    id: 'comment-3',
    author: 'Dr. Emily Watson',
    text: 'Economic disruption from AI is often discussed in apocalyptic terms, but historical precedent suggests adaptation is possible. The industrial revolution displaced many jobs but created new ones. However, the speed of AI advancement may not allow for the same gradual transition.',
    timestamp: '2024-01-15T16:45:00Z',
    highlightStart: 1088,
    highlightEnd: 1186
  },
  {
    id: 'comment-4',
    author: 'Alex Thompson',
    text: 'Interpretability research has made significant progress, but we\'re still far from understanding complex neural networks. Techniques like attention visualization help, but they don\'t provide complete explanations of model behavior.',
    timestamp: '2024-01-16T09:00:00Z',
    highlightStart: 1434,
    highlightEnd: 1506,
    replies: [
      {
        author: 'Dr. Sarah Chen',
        text: 'Mechanistic interpretability is showing promise though. Recent work on circuit discovery is revealing how models perform specific tasks.',
        timestamp: '2024-01-16T09:30:00Z'
      },
      {
        author: 'Prof. Michael Ross',
        text: 'True, but scaling these techniques to larger models remains challenging.',
        timestamp: '2024-01-16T10:00:00Z'
      }
    ]
  },
  {
    id: 'comment-5',
    author: 'Dr. Linda Park',
    text: 'International cooperation on AI governance faces significant challenges. Different countries have varying priorities and values. The EU focuses on privacy and rights, the US on innovation, and China on strategic advantage. Finding common ground is essential but difficult.',
    timestamp: '2024-01-16T11:30:00Z',
    highlightStart: 1712,
    highlightEnd: 1889
  },
  {
    id: 'comment-6',
    author: 'Prof. David Kim',
    text: 'The call for balancing innovation with caution is important, but we need specific metrics and milestones. How do we measure "sufficient" safety? What are acceptable risk levels? Without concrete benchmarks, this remains aspirational rather than actionable.',
    timestamp: '2024-01-16T15:00:00Z',
    highlightStart: 2036,
    highlightEnd: 2235
  },
  {
    id: 'comment-7',
    author: 'Dr. Rachel Green',
    text: 'Value alignment is presented as a technical problem, but it\'s fundamentally philosophical. Whose values do we align AI with? How do we handle value pluralism in diverse societies?',
    timestamp: '2024-01-16T17:30:00Z',
    highlightStart: 1571,
    highlightEnd: 1622
  },
  {
    id: 'comment-8',
    author: 'Sam Martinez',
    text: 'The mention of autonomous weapons deserves expansion. The risk isn\'t just from fully autonomous systems, but from the current trend of increasing automation in military decision-making. We need clear international agreements before it\'s too late.',
    timestamp: '2024-01-17T08:45:00Z',
    highlightStart: 1024,
    highlightEnd: 1087
  }
];