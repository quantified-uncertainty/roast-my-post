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
  
  'extract-factual-claims': [
    `The Earth orbits the Sun once every 365.25 days. Climate change is causing global temperatures to rise by 1.5°C above pre-industrial levels. The Pacific Ocean is the largest ocean on Earth, covering about 63 million square miles.`,
    `COVID-19 vaccines have been administered to over 5 billion people worldwide. The speed of light in a vacuum is exactly 299,792,458 meters per second. Water boils at 100°C at sea level.`,
    `The human brain contains approximately 86 billion neurons. Mount Everest is 8,849 meters tall. The Amazon rainforest produces 20% of the world's oxygen.`,
    `Bitcoin was created in 2009 by Satoshi Nakamoto. The Great Wall of China is over 13,000 miles long. Honey never spoils due to its low moisture content and acidic pH.`
  ],

  'fact-checker': [
    "The Earth is flat. Water boils at 100°C at sea level. The Great Wall of China is visible from space. Humans only use 10% of their brain.",
    "Lightning never strikes the same place twice. You can see the Great Wall of China from the moon. Cracking your knuckles causes arthritis. We only use 10% of our brains.",
    "Goldfish have a 3-second memory. Hair and fingernails continue growing after death. The tongue has different taste zones. Bulls are enraged by the color red.",
    "Eating carrots improves your vision. You need to wait 30 minutes after eating before swimming. Shaving makes hair grow back thicker. Different parts of the tongue taste different flavors."
  ],

  'extract-forecasting-claims': [
    "By 2030, renewable energy will account for 80% of global electricity generation, driven by falling costs and government incentives.",
    "The S&P 500 will likely reach 6,000 points by the end of 2025, assuming continued economic growth and AI sector expansion.",
    "Climate change will cause sea levels to rise by 15-25cm by 2050, affecting coastal cities worldwide.",
    "Electric vehicle adoption will exceed 50% of new car sales in Europe by 2028 due to stricter emissions regulations."
  ],

  'extract-math-expressions': [
    `According to our analysis, revenue grew by 50% from $2 million to $3 million last year. The compound annual growth rate (CAGR) is calculated as (V_f/V_i)^(1/n) - 1, where n is the number of years.`,
    `With 15% of the budget allocated to R&D, that's approximately $450,000 in research spending. The efficiency formula E = output/input shows we achieved 85% efficiency this quarter.`,
    `Our survey had a margin of error of ±3% with 95% confidence. If we increase production by 25%, we can reduce unit costs from $12 to $9 per item.`,
    `The population growth rate of 2.1% means the city will have 1.2 million residents by 2030. Using the formula A = P(1+r)^t where P = 1 million today.`
  ],

  'check-math': [
    `The area of a circle with radius 5 is 78.5 square units (using π ≈ 3.14). If you invest $1,000 at 5% annual interest for 10 years, you'll have $1,629 (using compound interest).`,
    `The quadratic equation x² + 5x + 6 = 0 has solutions x = -2 and x = -3. The derivative of x³ is 3x². The integral of 2x is x² + C.`,
    `If 30% of 150 students passed the exam, that's 45 students. The Pythagorean theorem: a² + b² = c², so if a=3 and b=4, then c=5.`,
    `The average of 12, 15, 18, and 21 is (12+15+18+21)/4 = 16.5. Simple interest formula: I = PRT, where I is interest, P is principal, R is rate, T is time.`
  ],

  'check-math-hybrid': [
    `Calculate the compound interest: Principal = $1000, Rate = 5%, Time = 10 years, Compounded annually. Formula: A = P(1 + r/n)^(nt) where A is the amount, P is principal, r is rate, n is compounding frequency, t is time. Result: A = 1000(1 + 0.05/1)^(1×10) = $1,628.89`,
    `Find the slope of the line through points (2, 5) and (6, 13). Using slope formula: m = (y₂-y₁)/(x₂-x₁) = (13-5)/(6-2) = 8/4 = 2. So the slope is 2.`,
    `Calculate the area of a triangle with base 8 meters and height 6 meters. Area = (1/2) × base × height = (1/2) × 8 × 6 = 24 square meters.`,
    `Solve for x: 3x + 7 = 22. Subtract 7 from both sides: 3x = 15. Divide by 3: x = 5. Check: 3(5) + 7 = 15 + 7 = 22 ✓`
  ],

  'check-math-with-mathjs': [
    `Solve: 2x + 5 = 15. Step 1: Subtract 5 from both sides: 2x = 10. Step 2: Divide by 2: x = 5. Verification: 2(5) + 5 = 10 + 5 = 15 ✓`,
    `Calculate: 3² + 4² = 9 + 16 = 25. Therefore √25 = 5. This confirms the Pythagorean theorem: 3² + 4² = 5².`,
    `Evaluate: (2 + 3) × 4 - 7 = 5 × 4 - 7 = 20 - 7 = 13. Order of operations: parentheses, multiplication, then subtraction.`,
    `Factor: x² - 5x + 6. Looking for two numbers that multiply to 6 and add to -5: -2 and -3. So x² - 5x + 6 = (x - 2)(x - 3).`
  ],

  'link-validator': [
    `Check out these resources:
- Official documentation: https://docs.example.com/guide
- GitHub repository: https://github.com/example/project
- Blog post: https://blog.example.com/2024/introduction
- Broken link: https://notarealwebsite12345.com/page`,
    `Important links for research:
- Wikipedia: https://en.wikipedia.org/wiki/Machine_learning
- Research paper: https://arxiv.org/abs/1234.5678
- Tutorial: https://www.youtube.com/watch?v=invalid123
- Dataset: https://kaggle.com/datasets/example`,
    `Useful development resources:
- Stack Overflow: https://stackoverflow.com/questions/12345
- MDN Docs: https://developer.mozilla.org/en-US/docs/Web
- npm package: https://www.npmjs.com/package/example
- Broken API: https://api.nonexistent.com/v1/data`,
    `Business and news sources:
- Company site: https://company.com/about
- Press release: https://techcrunch.com/2024/01/01/fake-article
- Financial data: https://finance.yahoo.com/quote/AAPL
- Dead link: https://old-site-that-no-longer-exists.com`
  ],

  'perplexity-research': [
    "Latest breakthroughs in large language model efficiency 2024",
    "Current renewable energy investment trends and policy changes",
    "Recent CRISPR safety advances and regulatory updates",
    "What are the latest developments in quantum computing error correction?",
    "Impact of AI on cybersecurity threat detection methods",
    "Recent studies on intermittent fasting and metabolic health"
  ],

  'detect-language-convention': [
    `I realised the colour of the aluminium was different than expected. The organisation will analyze the programme to optimize performance.`,
    `She travelled to the centre of town and bought a litre of petrol. The theatre programme was cancelled due to bad weather.`,
    `The defense team organized a meeting about the aluminum manufacturing process. They realized the program needed optimization.`,
    `The company specializes in analyzing data from their research center. They utilize advanced algorithms to maximize efficiency.`
  ],

  'document-chunker': [
    `Chapter 1: Introduction
This is the introduction to our document. It provides context and background information that readers need to understand the rest of the content.

Chapter 2: Main Content  
The main content goes here with detailed explanations and examples. This section is longer and may need to be split into multiple chunks for processing.

Chapter 3: Conclusion
The conclusion summarizes the key points and provides final thoughts on the topic.`,
    `Executive Summary
This report analyzes market trends in renewable energy. Key findings show 30% growth in solar installations.

Market Analysis
Solar panel installations increased dramatically in 2024, driven by government incentives and falling costs. Wind energy also showed strong growth.

Financial Projections
Revenue is projected to reach $500M by 2026, with EBITDA margins of 25%. Investment requirements total $200M over three years.`,
    `Research Methodology
We conducted a systematic literature review of 150 papers on machine learning applications in healthcare from 2020-2024.

Key Findings
Deep learning models showed 95% accuracy in medical image analysis. Natural language processing improved clinical documentation efficiency by 40%.

Discussion and Implications
These results suggest AI can significantly enhance healthcare delivery while reducing costs and improving patient outcomes.`,
    `Product Overview
Our new software platform integrates seamlessly with existing workflows. It features real-time analytics, automated reporting, and advanced security.

Technical Specifications
Built on cloud-native architecture using microservices. Supports 100,000+ concurrent users with 99.9% uptime SLA.

Implementation Guide
Deployment typically takes 2-4 weeks including data migration, user training, and system integration with legacy applications.`
  ],

  'fuzzy-text-locator': [
    {
      text: `The quick brown fox jumps over the lazy dog. This sentence contains all letters of the alphabet.
The quick brown fox runs across the field. This is a similar but different sentence.
A lazy dog sleeps under the tree while the quick brown fox hunts for food.`,
      search: "quick brown fox"
    },
    {
      text: `Machine learning algorithms can process vast amounts of data efficiently. Deep learning models use neural networks with multiple layers.
Artificial intelligence applications include natural language processing, computer vision, and robotics.
Data science combines statistics, programming, and domain expertise to extract insights from data.`,
      search: "neural networks"
    },
    {
      text: `Climate change is causing global temperatures to rise. Renewable energy sources like solar and wind are becoming more affordable.
Carbon emissions from fossil fuels contribute to greenhouse gas concentrations. International cooperation is needed for environmental protection.
Sustainable development goals aim to balance economic growth with ecological preservation.`,
      search: "sustainable development"
    },
    {
      text: `Software development requires careful planning and testing. Agile methodologies emphasize iterative development and collaboration.
Version control systems like Git help manage code changes. Continuous integration automates testing and deployment processes.
Code reviews improve quality and help developers learn from each other's work.`,
      search: "continuous integration"
    }
  ],

  'forecaster-simple': [
    `Global EV sales will reach 50% market share by 2030. AI will automate 30% of current jobs within the next decade. Renewable energy costs will fall below fossil fuels globally by 2025.`,
    `Bitcoin price will exceed $150,000 by 2028. The global population will reach 8.5 billion people by 2030. Space tourism will become accessible to middle-class travelers by 2035.`,
    `Quantum computers will break current encryption methods by 2030. Virtual reality will replace traditional video conferencing by 2027. Lab-grown meat will cost less than conventional meat by 2029.`,
    `Sea levels will rise 30cm by 2050 due to climate change. Fusion power will provide 20% of global electricity by 2040. Autonomous vehicles will comprise 70% of new car sales by 2035.`
  ]
};

// Helper function to get examples for a tool
export function getToolExamples(toolId: string): string | string[] | Record<string, any> | undefined {
  const examples = toolExamples[toolId as keyof typeof toolExamples];
  if (Array.isArray(examples)) {
    return [...examples]; // Return a mutable copy
  }
  return examples as any;
}