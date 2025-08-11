import type { PairedExamples } from '../types/examples';

export const examples: PairedExamples = [
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
];