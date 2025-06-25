#!/usr/bin/env tsx

/**
 * Example script demonstrating the URL validator
 * 
 * Usage:
 * npx tsx src/lib/examples/urlValidatorExample.ts
 */

import { validateUrl } from "../urlValidator";
import { logger } from "@/lib/logger";

async function main() {
  logger.info('🔍 URL Validator Example\n');

  // Test cases to demonstrate different scenarios
  const testCases = [
    {
      name: "✅ Valid accessible URL",
      url: "https://react.dev/learn",
    },
    {
      name: "❌ Non-existent URL",
      url: "https://fake-domain-12345.com/article",
    },
    {
      name: "📄 PDF document",
      url: "https://arxiv.org/pdf/1706.03762.pdf",
    },
  ];

  for (const testCase of testCases) {
    console.log(`\n${testCase.name}`);
    console.log(`URL: ${testCase.url}`);
    logger.info('Validating...');

    try {
      const result = await validateUrl({
        url: testCase.url,
      });

      console.log(`📊 Result:`);
      if (result.accessError) {
        console.log(`  • Status: Error (${result.accessError.type})`);
        const errorMsg = 'message' in result.accessError 
          ? result.accessError.message 
          : result.accessError.type;
        console.log(`  • Details: ${errorMsg}`);
      } else {
        console.log(`  • Status: Accessible`);
        if (result.linkDetails) {
          console.log(`  • Content Type: ${result.linkDetails.contentType}`);
          console.log(`  • Status Code: ${result.linkDetails.statusCode}`);
        }
        if (result.finalUrl && result.finalUrl !== result.url) {
          console.log(`  • Redirected to: ${result.finalUrl}`);
        }
      }
    } catch (error) {
      console.error(`❌ Error: ${error}`);
    }

    console.log("─".repeat(60));
  }

  logger.info('\n✨ URL validation examples completed!');
}

if (require.main === module) {
  main().catch(console.error);
}

export { main as runUrlValidatorExample };