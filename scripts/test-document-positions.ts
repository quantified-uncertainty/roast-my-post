#!/usr/bin/env tsx

// Test to understand the position issue

const documentText = `# Test Document

This is a test document with severl spelling errors.

## Section 1: Introduction

The authr of this document made many mistaks in their writing.
We can see that the reserch shows a 15% improvment over the baseline.
Their are many problms with this approch to solving the issue.

## Section 2: Analysis

This times the increase in the risk of death due to something is a common mistake.
The scientsts discovered that thier calculations were incorrect.
We should focuss on the main isues rather than minor detals.

## Conclusion

In concluson, we have identifed multiple speling errors throughout the text.`;

// Find actual positions
const section1Header = "## Section 1: Introduction";
const section1Start = documentText.indexOf(section1Header);
console.log(`Section 1 header starts at: ${section1Start}`);
console.log(`Text at that position: "${documentText.substring(section1Start, section1Start + 30)}..."`);

const section2Header = "## Section 2: Analysis";
const section2Start = documentText.indexOf(section2Header);
console.log(`\nSection 2 header starts at: ${section2Start}`);
console.log(`Text at that position: "${documentText.substring(section2Start, section2Start + 30)}..."`);

// Find where "authr" is
const authrPos = documentText.indexOf("authr");
console.log(`\n"authr" found at position: ${authrPos}`);
console.log(`Text around it: "${documentText.substring(authrPos - 10, authrPos + 10)}"`);

// Check the chunks with corrected positions
const chunk1Text = `## Section 1: Introduction

The authr of this document made many mistaks in their writing.
We can see that the reserch shows a 15% improvment over the baseline.
Their are many problms with this approch to solving the issue.`;

const chunk1ActualStart = documentText.indexOf(chunk1Text);
console.log(`\nChunk 1 actual position: ${chunk1ActualStart}`);
console.log(`Chunk 1 should end at: ${chunk1ActualStart + chunk1Text.length}`);

// Verify extraction
const extracted = documentText.substring(chunk1ActualStart, chunk1ActualStart + chunk1Text.length);
console.log(`\nExtraction matches: ${extracted === chunk1Text}`);