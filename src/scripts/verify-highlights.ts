#!/usr/bin/env tsx

import { Command } from "commander";
import { logger } from "@/lib/logger";
import { readdir, readFile } from "fs/promises";
import path from "path";

const program = new Command();

program
  .name("verify-highlights")
  .description("Verify that highlight offsets in document reviews are correct")
  .option(
    "-f, --file <path>",
    "Path to a specific JSON file to verify (optional)"
  )
  .option(
    "-d, --dir <path>",
    "Path to directory containing JSON files to verify (optional)"
  )
  .parse(process.argv);

const options = program.opts();

interface DocumentReview {
  agentId: string;
  comments: Array<{
    title: string;
    description: string;
    highlight: {
      startOffset: number;
      endOffset: number;
      quotedText: string;
      prefix?: string;
    };
  }>;
}

interface Document {
  content: string;
  reviews: DocumentReview[];
}

// Enhanced text normalization for comparison
function normalizeText(text: string): string {
  return text
    .replace(/\s+/g, " ") // Normalize whitespace
    .replace(/\\n/g, " ") // Replace escaped newlines
    .replace(/\\/g, "") // Remove escape characters
    .replace(/\*\*/g, "") // Remove markdown bold
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1") // Remove markdown links
    .replace(/[.,!?;:]/g, "") // Remove punctuation
    .replace(/['"`]/g, "") // Remove quotes
    .replace(/[‘’]/g, "") // Remove smart quotes
    .replace(/[""]/g, "") // Remove smart double quotes
    .replace(/\n/g, " ") // Replace newlines with spaces
    .replace(/\r/g, "") // Remove carriage returns
    .replace(/\t/g, " ") // Replace tabs with spaces
    .replace(/\s+/g, " ") // Normalize whitespace again
    .replace(/\s*[*-]\s*/g, " ") // Remove markdown list items
    .replace(/\s*#+\s*/g, " ") // Remove markdown headers
    .replace(/\s*_{2,}\s*/g, " ") // Remove markdown horizontal rules
    .replace(/\s*`{1,3}\s*/g, " ") // Remove markdown code blocks
    .toLowerCase() // Case insensitive
    .trim();
}

// Helper function to find text in content with flexible matching
function findTextInContent(
  content: string,
  searchText: string,
  startIndex: number = 0
): { start: number; end: number } | null {
  const normalizedContent = normalizeText(content);
  const normalizedSearchText = normalizeText(searchText);

  // First try exact match
  let index = normalizedContent.indexOf(normalizedSearchText, startIndex);
  if (index !== -1) {
    return {
      start: index,
      end: index + normalizedSearchText.length,
    };
  }

  // If exact match fails, try word-based matching
  const searchWords = normalizedSearchText
    .split(/\s+/)
    .filter((w) => w.length > 3);
  if (searchWords.length === 0) return null;

  // Look for the first substantial word
  const firstWord = searchWords[0];
  let wordIndex = normalizedContent.indexOf(firstWord, startIndex);

  while (wordIndex !== -1) {
    // Check if subsequent words appear in order
    let currentIndex = wordIndex;
    let matchedWords = 1;

    for (let i = 1; i < searchWords.length; i++) {
      const nextWord = searchWords[i];
      const nextIndex = normalizedContent.indexOf(
        nextWord,
        currentIndex + firstWord.length
      );

      if (nextIndex === -1 || nextIndex - currentIndex > 200) {
        // Allow up to 200 chars between words
        break;
      }

      currentIndex = nextIndex;
      matchedWords++;
    }

    // If we matched most words, consider it a match
    if (matchedWords / searchWords.length >= 0.6) {
      return {
        start: wordIndex,
        end: currentIndex + searchWords[matchedWords - 1].length,
      };
    }

    // Try next occurrence of first word
    wordIndex = normalizedContent.indexOf(firstWord, wordIndex + 1);
  }

  return null;
}

export function verifyHighlight(
  content: string,
  highlight: {
    startOffset: number;
    endOffset: number;
    quotedText: string;
    prefix?: string;
  },
  title: string
): {
  isValid: boolean;
  foundText: string;
  expectedText: string;
  error?: string;
} {
  const { startOffset, endOffset, quotedText } = highlight;

  // Basic validation
  if (startOffset < 0 || endOffset > content.length) {
    return {
      isValid: false,
      foundText: "",
      expectedText: quotedText,
      error: `Invalid offsets: start=${startOffset}, end=${endOffset}, content length=${content.length}`,
    };
  }

  // First try exact match at given offsets
  const foundText = content.substring(startOffset, endOffset);

  if (foundText !== quotedText) {
    console.error(
      `❌ Text mismatch for highlight "${title}":\n` +
        `Expected: "${quotedText}"\n` +
        `Found:    "${foundText}"\n` +
        `Start offset: ${startOffset}\n` +
        `End offset: ${endOffset}\n` +
        `Content length: ${content.length}\n` +
        `Context before: "${content.substring(Math.max(0, startOffset - 50), startOffset)}"\n` +
        `Context after: "${content.substring(endOffset, Math.min(content.length, endOffset + 50))}"`
    );
    return {
      isValid: false,
      foundText,
      expectedText: quotedText,
      error: `Text mismatch at offsets ${startOffset}-${endOffset}`,
    };
  }

  return {
    isValid: true,
    foundText,
    expectedText: quotedText,
  };
}

async function verifyFile(filePath: string) {
  try {
    console.log(`\n🔍 Verifying ${filePath}...`);
    const content = await readFile(filePath, "utf-8");
    const document: Document = JSON.parse(content);

    let totalHighlights = 0;
    let validHighlights = 0;
    let invalidHighlights = 0;

    for (const review of document.reviews) {
      console.log(`\n📝 Review by agent: ${review.agentId}`);

      for (const comment of review.comments) {
        totalHighlights++;
        const displayTitle = comment.description || comment.highlight?.quotedText?.substring(0, 50) || "Untitled";
        const result = verifyHighlight(
          document.content,
          comment.highlight,
          displayTitle
        );

        if (result.isValid) {
          validHighlights++;
          console.log(`✅ Valid highlight: "${displayTitle}"`);
        } else {
          invalidHighlights++;
          console.log(`❌ Invalid highlight: "${displayTitle}"`);
          console.log(`   Error: ${result.error}`);
          console.log(`   Expected: "${result.expectedText}"`);
          console.log(`   Found:    "${result.foundText}"`);
        }
      }
    }

    console.log(`\n📊 Summary for ${filePath}:`);
    console.log(`   Total highlights: ${totalHighlights}`);
    console.log(`   Valid highlights: ${validHighlights}`);
    console.log(`   Invalid highlights: ${invalidHighlights}`);
    console.log(
      `   Success rate: ${((validHighlights / totalHighlights) * 100).toFixed(1)}%`
    );

    return {
      totalHighlights,
      validHighlights,
      invalidHighlights,
    };
  } catch (error) {
    console.error(`❌ Error verifying ${filePath}:`, error);
    return {
      totalHighlights: 0,
      validHighlights: 0,
      invalidHighlights: 0,
    };
  }
}

async function main() {
  try {
    if (!options.file && !options.dir) {
      logger.error('❌ Error: Either --file or --dir must be specified');
      process.exit(1);
    }

    let files: string[] = [];

    if (options.file) {
      files = [options.file];
    } else if (options.dir) {
      const dirFiles = await readdir(options.dir);
      files = dirFiles
        .filter((file) => file.endsWith(".json"))
        .map((file) => path.join(options.dir, file));
    }

    let totalStats = {
      totalHighlights: 0,
      validHighlights: 0,
      invalidHighlights: 0,
    };

    for (const file of files) {
      const stats = await verifyFile(file);
      totalStats.totalHighlights += stats.totalHighlights;
      totalStats.validHighlights += stats.validHighlights;
      totalStats.invalidHighlights += stats.invalidHighlights;
    }

    logger.info('\n📊 Overall Summary:');
    console.log(`   Total highlights: ${totalStats.totalHighlights}`);
    console.log(`   Valid highlights: ${totalStats.validHighlights}`);
    console.log(`   Invalid highlights: ${totalStats.invalidHighlights}`);
    console.log(
      `   Success rate: ${((totalStats.validHighlights / totalStats.totalHighlights) * 100).toFixed(1)}%`
    );
  } catch (error) {
    logger.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
