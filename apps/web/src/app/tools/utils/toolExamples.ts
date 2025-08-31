/**
 * Centralized tool examples configuration
 * Each tool can have multiple named examples that populate all fields
 */

export interface ToolExample {
  label: string;
  description?: string;
  values: Record<string, any>;
  // Optional hint about what this example demonstrates
  hint?: string;
}

export const toolExamples: Record<string, ToolExample[]> = {
  'check-math': [
    { 
      label: 'Basic Addition', 
      values: { statement: '2 + 2 = 4' }
    },
    { 
      label: 'Multiplication', 
      values: { statement: '5 * 10 = 50' }
    },
    { 
      label: 'Square Root', 
      values: { statement: 'sqrt(16) = 4' }
    },
    { 
      label: 'Percentage', 
      values: { statement: '10% of 200 = 20' }
    },
    {
      label: 'Complex Equation',
      values: { statement: '(3x + 2) = 14, so x = 4' }
    }
  ],
  
  'check-math-hybrid': [
    { 
      label: 'Simple Math', 
      values: { statement: '2 + 2 = 4' }
    },
    { 
      label: 'Unit Conversion', 
      values: { statement: '5 km + 3000 m = 8 km' }
    },
    { 
      label: 'Trigonometry', 
      values: { statement: 'sin(90 degrees) = 1' }
    },
    { 
      label: 'Percentage Calculation', 
      values: { statement: '10% of 50 is 5' }
    },
    {
      label: 'Area Calculation',
      values: { statement: 'A circle with radius 5 has area π * 5^2 = 25π ≈ 78.54' }
    }
  ],
  
  'check-math-with-mathjs': [
    { 
      label: 'Basic Arithmetic', 
      values: { statement: '2 + 2 = 4' }
    },
    { 
      label: 'Unit Math', 
      values: { statement: '5 km + 3000 m to km' }
    },
    { 
      label: 'Square Root', 
      values: { statement: 'sqrt(144) = 12' }
    },
    { 
      label: 'Percentage', 
      values: { statement: '10% of 50' }
    },
    {
      label: 'Complex Expression',
      values: { statement: '2 * (3 + 4) - 5 = 9' }
    }
  ],
  
  'check-spelling-grammar': [
    { 
      label: 'Common Typos', 
      values: { text: 'This is a exmaple of bad speling and grammer.' }
    },
    { 
      label: 'Subject-Verb Agreement', 
      values: { text: 'The cat are sleeping on the couch. They was very tired.' }
    },
    {
      label: 'Mixed Errors',
      values: { text: 'Their going to there house over they\'re for diner tonite.' }
    }
  ],
  
  'detect-language-convention': [
    { 
      label: 'British English', 
      values: { text: 'colour behaviour analyse centre theatre honour programme' }
    },
    { 
      label: 'American English', 
      values: { text: 'color behavior analyze center theater honor program' }
    },
    {
      label: 'Mixed Convention',
      values: { text: 'I will analyze the colour of the theater and check the program behaviour.' }
    }
  ],
  
  'extract-factual-claims': [
    { 
      label: 'Scientific Facts', 
      values: { 
        text: 'The Earth orbits the Sun once every 365.25 days. Water boils at 100°C at sea level. The speed of light is approximately 299,792 kilometers per second.' 
      }
    },
    { 
      label: 'Historical Facts', 
      values: { 
        text: 'World War II ended in 1945. The Berlin Wall fell in 1989. The United States declared independence in 1776.' 
      }
    },
    {
      label: 'Mixed Claims',
      values: {
        text: 'Paris is the capital of France, which has a population of about 67 million people. The Eiffel Tower was completed in 1889 and stands 330 meters tall.'
      }
    }
  ],
  
  'extract-forecasting-claims': [
    { 
      label: 'Technology Predictions', 
      values: { 
        text: 'By 2030, electric vehicles will account for 50% of new car sales. Autonomous vehicles will be commercially available by 2025. Quantum computers will solve complex problems by 2035.' 
      }
    },
    { 
      label: 'Climate Predictions', 
      values: { 
        text: 'Global temperatures are expected to rise by 1.5°C by 2050. Sea levels could rise by 1 meter by 2100. Arctic summer ice may disappear by 2040.' 
      }
    },
    {
      label: 'Economic Forecasts',
      values: {
        text: 'GDP is projected to grow by 3% next year. Inflation will likely decrease to 2% by Q4 2025. Unemployment is expected to remain below 4% through 2026.'
      }
    }
  ],
  
  'extract-math-expressions': [
    { 
      label: 'Physics Equations', 
      values: { 
        text: 'The formula E = mc² shows that energy equals mass times the speed of light squared. Force equals mass times acceleration (F = ma).' 
      }
    },
    { 
      label: 'Algebra Problems', 
      values: { 
        text: 'If x + 5 = 10, then x = 5. The quadratic formula is x = (-b ± √(b² - 4ac)) / 2a.' 
      }
    },
    {
      label: 'Statistics Formulas',
      values: {
        text: 'The mean is calculated as μ = Σx/n. Standard deviation is σ = √(Σ(x-μ)²/n). The z-score formula is z = (x - μ) / σ.'
      }
    }
  ],
  
  'fuzzy-text-locator': [
    { 
      label: 'Find Repeated Phrase', 
      values: { 
        documentText: 'The quick brown fox jumps over the lazy dog. The dog was very lazy indeed. That lazy dog never moves!',
        searchText: 'lazy dog'
      },
      hint: 'Finds all instances of "lazy dog" in different contexts'
    },
    { 
      label: 'Partial Match', 
      values: { 
        documentText: 'JavaScript is a programming language. Java and JavaScript are different languages. Many people confuse Java with JavaScript.',
        searchText: 'JavaScript programming'
      },
      hint: 'Searches for partial phrase matches'
    },
    {
      label: 'Case Variations',
      values: {
        documentText: 'The API key should be kept SECRET. Never share your secret key. Secret keys provide authentication.',
        searchText: 'secret key'
      },
      hint: 'Demonstrates case-insensitive fuzzy matching'
    }
  ],
  
  'link-validator': [
    { 
      label: 'Common Sites', 
      values: { 
        text: 'https://google.com\nhttps://github.com\nhttps://stackoverflow.com' 
      }
    },
    { 
      label: 'Mixed Valid/Invalid', 
      values: { 
        text: 'https://example.com\nhttp://invalid-url-that-doesnt-exist.com\nhttps://wikipedia.org' 
      }
    },
    {
      label: 'Documentation Links',
      values: {
        text: 'https://docs.python.org\nhttps://developer.mozilla.org\nhttps://react.dev'
      }
    }
  ],
  
  'document-chunker': [
    { 
      label: 'Short Document', 
      values: { 
        text: 'This is a short document. It has multiple sentences. Each sentence could be a chunk. Or we could group them together.',
        chunkSize: 50
      },
      hint: 'Small chunks for detailed processing'
    },
    { 
      label: 'Technical Documentation', 
      values: { 
        text: 'Installation: First, install Node.js from nodejs.org. Then run npm install to install dependencies. Configuration: Create a .env file with your settings. Set DATABASE_URL to your database connection string. Usage: Run npm start to start the application.',
        chunkSize: 100
      },
      hint: 'Medium chunks preserving instruction flow'
    },
    {
      label: 'Paragraph Chunking',
      values: {
        text: 'First paragraph talks about introduction and overview.\n\nSecond paragraph discusses the main features.\n\nThird paragraph explains the implementation details.\n\nFourth paragraph provides conclusions.',
        chunkSize: 80
      },
      hint: 'Balanced chunk size for paragraph-based content'
    }
  ],
  
  'fact-checker': [
    { 
      label: 'True Statement', 
      values: { claim: 'The capital of France is Paris' }
    },
    { 
      label: 'False Statement', 
      values: { claim: 'The sun rises in the west' }
    },
    { 
      label: 'Complex Claim', 
      values: { claim: 'Einstein developed the theory of relativity in 1905' }
    },
    {
      label: 'Current Events',
      values: { claim: 'The current president of the United States is Joe Biden' }
    }
  ],
  
  'perplexity-research': [
    { 
      label: 'Tech Research', 
      values: { query: 'What are the latest developments in quantum computing?' }
    },
    { 
      label: 'Science Question', 
      values: { query: 'Explain how CRISPR gene editing works' }
    },
    { 
      label: 'Current Events', 
      values: { query: 'What are the major AI breakthroughs in 2024?' }
    },
    {
      label: 'Comparison Query',
      values: { query: 'Compare React, Vue, and Angular frameworks' }
    }
  ],
  
  'forecaster': [
    {
      label: 'Technology Timeline',
      values: { 
        question: 'When will fully autonomous vehicles be widely available?',
        context: 'Consider current progress in self-driving technology, regulatory challenges, and adoption rates.'
      },
      hint: 'Long-term tech adoption forecast with multiple factors'
    },
    {
      label: 'Economic Prediction',
      values: {
        question: 'What will the US inflation rate be in 2025?',
        context: 'Current inflation is around 3%, Fed target is 2%, consider monetary policy and economic indicators.'
      },
      hint: 'Near-term economic indicator with current data context'
    },
    {
      label: 'Climate Question',
      values: {
        question: 'Will global average temperature increase exceed 1.5°C by 2030?',
        context: 'Based on current emissions trends and climate models.'
      },
      hint: 'Binary climate prediction with scientific context'
    },
    {
      label: 'Simple Market Question',
      values: {
        question: 'Will Bitcoin be above $100,000 by end of 2025?'
      },
      hint: 'Binary prediction without additional context'
    }
  ]
};