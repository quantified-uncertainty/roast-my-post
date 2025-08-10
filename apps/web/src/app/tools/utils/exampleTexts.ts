/**
 * Centralized example texts for all tools
 * This keeps examples consistent and maintainable
 */

export const toolExamples = {
  'check-spelling-grammar': [
    "Their going to there house over they're.",
    "The cat chased it's tail around the house.",
    "Me and him went to the store yesterday.",
    "I could of gone to the party but I was to tired.",
    "The data shows that sales has increased significantly."
  ],
  
  'extract-factual-claims': `The Earth orbits the Sun once every 365.25 days. 
Climate change is causing global temperatures to rise by 1.5°C above pre-industrial levels. 
The Pacific Ocean is the largest ocean on Earth, covering about 63 million square miles. 
COVID-19 vaccines have been administered to over 5 billion people worldwide. 
The speed of light in a vacuum is exactly 299,792,458 meters per second.`,

  'fact-checker': "The Earth is flat. Water boils at 100°C at sea level. The Great Wall of China is visible from space. Humans only use 10% of their brain.",

  'extract-forecasting-claims': [
    "By 2030, renewable energy will account for 80% of global electricity generation, driven by falling costs and government incentives.",
    "The S&P 500 will likely reach 6,000 points by the end of 2025, assuming continued economic growth and AI sector expansion.",
    "Climate change will cause sea levels to rise by 15-25cm by 2050, affecting coastal cities worldwide.",
    "Electric vehicle adoption will exceed 50% of new car sales in Europe by 2028 due to stricter emissions regulations."
  ],

  'extract-math-expressions': `According to our analysis, revenue grew by 50% from $2 million to $3 million last year. 
The compound annual growth rate (CAGR) is calculated as (V_f/V_i)^(1/n) - 1, where n is the number of years.
With 15% of the budget allocated to R&D, that's approximately $450,000 in research spending.
The efficiency formula E = output/input shows we achieved 85% efficiency this quarter.
Our projections show that if we maintain a 7% growth rate, revenue will double in about 10 years (using the rule of 72: 72/7 ≈ 10).`,

  'check-math': `The area of a circle with radius 5 is 78.5 square units (using π ≈ 3.14).
If you invest $1,000 at 5% annual interest for 10 years, you'll have $1,629 (using compound interest).
The quadratic equation x² + 5x + 6 = 0 has solutions x = -2 and x = -3.`,

  'check-math-hybrid': `Calculate the compound interest: Principal = $1000, Rate = 5%, Time = 10 years, Compounded annually.
Formula: A = P(1 + r/n)^(nt) where A is the amount, P is principal, r is rate, n is compounding frequency, t is time.
Result: A = 1000(1 + 0.05/1)^(1×10) = $1,628.89`,

  'check-math-with-mathjs': `Solve: 2x + 5 = 15
Step 1: Subtract 5 from both sides: 2x = 10
Step 2: Divide by 2: x = 5
Verification: 2(5) + 5 = 10 + 5 = 15 ✓`,

  'link-validator': `Check out these resources:
- Official documentation: https://docs.example.com/guide
- GitHub repository: https://github.com/example/project
- Blog post: https://blog.example.com/2024/introduction
- Broken link: https://notarealwebsite12345.com/page
- Another resource: https://wikipedia.org/wiki/Machine_learning`,

  'perplexity-research': [
    "Latest breakthroughs in large language model efficiency 2024",
    "Current renewable energy investment trends and policy changes",
    "Recent CRISPR safety advances and regulatory updates",
    "What are the latest developments in quantum computing error correction?",
    "Impact of AI on cybersecurity threat detection methods",
    "Recent studies on intermittent fasting and metabolic health"
  ],

  'detect-language-convention': `I realised the colour of the aluminium was different than expected. 
The organization will analyze the program to optimize performance.
She travelled to the centre of town and bought a litre of petrol.`,

  'document-chunker': `Chapter 1: Introduction
This is the introduction to our document. It provides context and background information that readers need to understand the rest of the content.

Chapter 2: Main Content
The main content goes here with detailed explanations and examples. This section is longer and may need to be split into multiple chunks for processing.

Chapter 3: Conclusion
The conclusion summarizes the key points and provides final thoughts on the topic.`,

  'fuzzy-text-locator': {
    text: `The quick brown fox jumps over the lazy dog. This sentence contains all letters of the alphabet.
The quick brown fox runs across the field. This is a similar but different sentence.
A lazy dog sleeps under the tree while the quick brown fox hunts for food.`,
    search: "quick brown fox"
  },

  'forecaster-simple': `Global EV sales will reach 50% market share by 2030.
AI will automate 30% of current jobs within the next decade.
Renewable energy costs will fall below fossil fuels globally by 2025.`
};

// Helper function to get examples for a tool
export function getToolExamples(toolId: string): string | string[] | Record<string, any> | undefined {
  const examples = toolExamples[toolId as keyof typeof toolExamples];
  if (Array.isArray(examples)) {
    return [...examples]; // Return a mutable copy
  }
  return examples as any;
}

// Helper function to get a random example for tools with multiple examples
export function getRandomExample(toolId: string): string | undefined {
  const examples = getToolExamples(toolId);
  if (Array.isArray(examples)) {
    return examples[Math.floor(Math.random() * examples.length)];
  }
  return typeof examples === 'string' ? examples : undefined;
}