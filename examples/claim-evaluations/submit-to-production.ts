#!/usr/bin/env tsx
/**
 * Submit YAML claim evaluations to RoastMyPost production API
 *
 * Usage:
 *   ROAST_MY_POST_PRODUCTION_PERSONAL_USER_KEY=rmp_... tsx submit-to-production.ts <yaml-file>
 *
 * Example:
 *   ROAST_MY_POST_PRODUCTION_PERSONAL_USER_KEY=rmp_... tsx submit-to-production.ts informativeness-experiment.yaml
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

const PRODUCTION_URL = 'https://www.roastmypost.org';

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: submit-to-production.ts <yaml-file>');
    console.error('');
    console.error('Example:');
    console.error('  ROAST_MY_POST_PRODUCTION_PERSONAL_USER_KEY=rmp_... tsx submit-to-production.ts informativeness-experiment.yaml');
    process.exit(1);
  }

  // Get API key from environment
  const apiKey = process.env.ROAST_MY_POST_PRODUCTION_PERSONAL_USER_KEY;
  if (!apiKey) {
    console.error('Error: ROAST_MY_POST_PRODUCTION_PERSONAL_USER_KEY environment variable not set');
    process.exit(1);
  }

  const yamlPath = resolve(args[0]);
  console.log(`Loading YAML from: ${yamlPath}`);

  // Read YAML file
  let yamlContent: string;
  try {
    yamlContent = readFileSync(yamlPath, 'utf-8');
  } catch (error) {
    console.error(`Failed to read file: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }

  console.log(`✓ Read ${yamlContent.length} bytes`);
  console.log('');

  // Submit to production API
  console.log(`Submitting to ${PRODUCTION_URL}/api/claim-evaluations/bulk...`);
  console.log('');

  try {
    const response = await fetch(`${PRODUCTION_URL}/api/claim-evaluations/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        yaml: yamlContent,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API request failed with status ${response.status}`);
      console.error('Response:', errorText);
      process.exit(1);
    }

    const result = await response.json();

    // Log full result for debugging
    console.log('\nFull API Response:');
    console.log(JSON.stringify(result, null, 2));

    // Print results
    console.log('═══════════════════════════════════════════════════════');
    console.log('BULK CLAIM EVALUATION RESULTS');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`Total:      ${result.total}`);
    console.log(`Successful: ${result.successful}`);
    console.log(`Failed:     ${result.failed}`);
    console.log('');

    if (result.successful > 0) {
      console.log('✓ Successful evaluations:');
      result.results
        .filter((r: any) => r.success)
        .forEach((r: any, i: number) => {
          const claimPreview = r.claim.slice(0, 80) + (r.claim.length > 80 ? '...' : '');
          console.log(`  ${i + 1}. [${r.id}] ${claimPreview}`);
          console.log(`     View at: ${PRODUCTION_URL}/claim-evaluations/${r.id}`);
        });
      console.log('');
    }

    if (result.failed > 0) {
      console.log('✗ Failed evaluations:');
      result.results
        .filter((r: any) => !r.success)
        .forEach((r: any, i: number) => {
          const claimPreview = r.claim.slice(0, 80) + (r.claim.length > 80 ? '...' : '');
          console.log(`  ${i + 1}. ${claimPreview}`);
          console.log(`     Error: ${r.error}`);
        });
      console.log('');
    }

    console.log('═══════════════════════════════════════════════════════');

    // Exit with error code if any failed
    if (result.failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run main
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
