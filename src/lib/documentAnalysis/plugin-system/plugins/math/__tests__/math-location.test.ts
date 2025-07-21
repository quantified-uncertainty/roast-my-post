/**
 * Test the math location finding
 */

import { findMathLocation, normalizeMathExpression } from '../locationFinder';

// Test cases
const testCases = [
  {
    name: "Exact match",
    document: "The equation 2 + 2 = 4 is correct.",
    search: "2 + 2 = 4",
    expected: true
  },
  {
    name: "Different spacing",
    document: "The equation 2+2=4 is correct.",
    search: "2 + 2 = 4",
    expected: true
  },
  {
    name: "With parentheses",
    document: "We calculate (a + b) * c = 10",
    search: "(a+b)*c",
    expected: true
  },
  {
    name: "Scientific notation",
    document: "The speed of light is 3.0 × 10^8 m/s",
    search: "3.0 × 10^8",
    expected: true
  },
  {
    name: "Alternative multiplication",
    document: "We have 5 x 6 = 30",
    search: "5 × 6 = 30",
    expected: true
  },
  {
    name: "Exponent variations",
    document: "E = mc^2 is Einstein's equation",
    search: "E = mc**2",
    expected: true
  },
  {
    name: "Complex expression",
    document: "The formula is ∫(x^2 + 3x - 1)dx from 0 to 5",
    search: "∫(x^2 + 3x - 1)dx",
    expected: true
  }
];

console.log("Testing math location finding...\n");

testCases.forEach(test => {
  const result = findMathLocation(test.search, test.document);
  const found = result !== null;
  const status = found === test.expected ? "✓" : "✗";
  
  console.log(`${status} ${test.name}`);
  if (result) {
    console.log(`  Found: "${result.quotedText}" at position ${result.startOffset}`);
  } else {
    console.log(`  Not found`);
  }
  console.log(`  Document: "${test.document}"`);
  console.log(`  Search: "${test.search}"`);
  console.log();
});

// Test normalization
console.log("\nTesting normalization:");
const expressions = [
  "2 + 2 = 4",
  "2+2=4",
  "(a + b) * c",
  "(a+b)*c",
  "x^2 + y^2",
  "x**2 + y**2",
  "5 x 6",
  "5 × 6"
];

expressions.forEach(expr => {
  console.log(`"${expr}" → "${normalizeMathExpression(expr)}"`);
});