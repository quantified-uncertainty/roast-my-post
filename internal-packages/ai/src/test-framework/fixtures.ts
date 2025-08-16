/**
 * Shared test fixtures for all test types
 */

export const TestDocuments = {
  spelling: {
    withErrors: `This document contians several spelling mistaks and grammer issues.
Their are many reasons why proofreading is important:
- It helps maintain professionalism
- It ensures clarity of communication
However, some people dont take the time to proofread there work carefully.`,

    clean: `This document has been carefully proofread and contains no errors.
Professional writing requires attention to detail and commitment to quality.`,

    mixedConventions: `In the United States, we organize our code. 
In the United Kingdom, they organise their code.
Color vs colour, optimization vs optimisation.`
  },

  math: {
    withErrors: `Revenue increased by 15%: from $1000 to $1200.
Total: 100 + 200 + 300 = 500.
Average of 80, 90, 100 is 85.`,

    correct: `Revenue increased by 20%: from $1000 to $1200.
Total: 100 + 200 + 300 = 600.
Average of 80, 90, 100 is 90.`,

    unitConversions: `The component is 254mm long, which equals 10 inches.
Weight: 2.2 pounds equals 1 kilogram.
Temperature: 0°C equals 32°F.`
  },

  facts: {
    withErrors: `The moon landing happened in 1971.
Einstein discovered DNA in 1955.
Microsoft was founded by Bill Gates and Steve Jobs.`,

    correct: `The moon landing happened in 1969.
Watson and Crick discovered DNA structure in 1953.
Microsoft was founded by Bill Gates and Paul Allen.`,

    mixed: `The transistor was invented at Bell Labs in 1947. (correct)
Facebook was founded in 2006. (error: 2004)
SpaceX landed its first booster in 2015. (correct)`
  },

  forecasts: {
    clear: `We predict 70% chance of success by Q2 2025.
There's a 90% probability costs will decrease 30% within 2 years.
AGI has 30% chance by 2030, 60% by 2035.`,

    vague: `Technology will advance significantly soon.
Many changes will happen in the coming years.
The future will be different from today.`,

    timeline: `Q4 2024: Launch new product (95% confidence)
Q1 2025: Reach 10,000 users (80% probability)
Q2 2025: Series A funding (60% likelihood)`
  },

  links: {
    valid: `Documentation: [React](https://react.dev/)
Package manager: [NPM](https://www.npmjs.com/)
Cloud: [AWS](https://aws.amazon.com/)`,

    broken: `Old docs: [Angular](https://angularjs.org/oldversion)
Tutorial: [Example](https://example-tutorial-site.com/404)
Download: [SDK](https://downloads.example.org/missing.tar.gz)`,

    malformed: `Bad protocol: [Site](htp://malformed.com)
Missing protocol: [Docs](www.example.com)
Incomplete: [Link](https://incomplete.)`
  },

  comprehensive: `# Technical Analysis Report

## Overview
This document contians spelling errors and mathematical calculations.

## Statistics
Our revenue grew from $1000 to $1200, an increase of 15%.
The average response time is (100 + 200 + 300) / 3 = 150ms.

## Historical Context
The first computer bug was found in 1945.
Moore's Law was proposed in 1970.

## Future Predictions
We expect 80% adoption by 2025.
There's a 60% chance of reaching profitability in Q3.

## Resources
Learn more at [https://broken-link.example.com/404](https://broken-link.example.com/404)
Documentation at [https://valid-site.com](https://valid-site.com)

## Conclusion
Despite these erors, the analysis is complete.`
};

export const ExpectedResults = {
  spelling: {
    withErrors: {
      minErrors: 5,
      mustFind: ['contians', 'mistaks', 'grammer', 'Their', 'dont'],
      maxGrade: 70
    },
    clean: {
      maxErrors: 0,
      minGrade: 95
    }
  },

  math: {
    withErrors: {
      minErrors: 3,
      mustFind: ['20%', '600', '90'],
      maxGrade: 60
    },
    correct: {
      maxErrors: 0,
      minGrade: 95
    }
  },

  facts: {
    withErrors: {
      minErrors: 3,
      mustFind: ['1969', '1953', 'Paul Allen'],
      maxGrade: 50
    },
    correct: {
      maxErrors: 0,
      minGrade: 90
    }
  },

  forecasts: {
    clear: {
      minComments: 3,
      mustFind: ['70%', '90%', '2025', '2030']
    },
    vague: {
      maxComments: 2
    }
  },

  links: {
    valid: {
      maxErrors: 0,
      minGrade: 100
    },
    broken: {
      minErrors: 3,
      mustFind: ['404', 'broken', 'invalid'],
      maxGrade: 40
    }
  }
};

/**
 * Generate a document with specific error types
 */
export function generateTestDocument(options: {
  spellingErrors?: number;
  mathErrors?: number;
  factErrors?: number;
  brokenLinks?: number;
  predictions?: number;
}): string {
  const sections: string[] = [];

  if (options.spellingErrors) {
    sections.push('## Spelling Section');
    const errors = ['teh', 'recieve', 'occured', 'seperate', 'definately'];
    for (let i = 0; i < options.spellingErrors && i < errors.length; i++) {
      sections.push(`This sentence contains ${errors[i]} error.`);
    }
  }

  if (options.mathErrors) {
    sections.push('## Math Section');
    const calculations = [
      '2 + 2 = 5',
      '10 * 10 = 90',
      '100 / 4 = 30',
      'sqrt(16) = 5',
      '3^2 = 6'
    ];
    for (let i = 0; i < options.mathErrors && i < calculations.length; i++) {
      sections.push(`Calculation: ${calculations[i]}`);
    }
  }

  if (options.factErrors) {
    sections.push('## Facts Section');
    const facts = [
      'The sun orbits the Earth.',
      'Water boils at 90°C.',
      'There are 8 days in a week.',
      'The speed of light is 100,000 km/s.',
      'Humans have 3 lungs.'
    ];
    for (let i = 0; i < options.factErrors && i < facts.length; i++) {
      sections.push(facts[i]);
    }
  }

  if (options.brokenLinks) {
    sections.push('## Links Section');
    for (let i = 0; i < options.brokenLinks; i++) {
      sections.push(`Resource ${i + 1}: [Link](https://broken-site-${i}.invalid/404)`);
    }
  }

  if (options.predictions) {
    sections.push('## Predictions Section');
    for (let i = 0; i < options.predictions; i++) {
      const probability = 50 + i * 10;
      sections.push(`Prediction ${i + 1}: ${probability}% chance by 2025`);
    }
  }

  return sections.join('\n\n');
}