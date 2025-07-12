#!/usr/bin/env node

/**
 * Dedicated fact-checking using Perplexity API or other search tools
 */

const fs = require('fs');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function extractFactualClaims(documentPath) {
    const content = fs.readFileSync(documentPath, 'utf8');
    
    const prompt = `Extract specific factual claims from this document that should be verified:

${content.slice(0, 4000)}

Focus on claims that are:
- Statistical data (populations, percentages, economic figures)
- Historical facts with specific dates/numbers
- Research citations or study references
- Technical specifications or measurements

Return as JSON array:
[
  {
    "claim": "exact quote from document",
    "line": line_number,
    "type": "statistic|historical|research|technical",
    "searchQuery": "optimized search query to verify this claim"
  }
]`;

    const tempFile = `/tmp/extract-claims-${Date.now()}.txt`;
    fs.writeFileSync(tempFile, prompt);
    
    try {
        const { stdout } = await execAsync(`cat ${tempFile} | claude -p`, { timeout: 30000 });
        fs.unlinkSync(tempFile);
        
        const jsonMatch = stdout.match(/\[[\s\S]*?\]/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return [];
    } catch (error) {
        try { fs.unlinkSync(tempFile); } catch {}
        console.warn('Failed to extract claims:', error.message);
        return [];
    }
}

async function searchFactCheck(claim) {
    // Could integrate with:
    // 1. Perplexity API
    // 2. Claude Code WebSearch tool 
    // 3. SerpAPI or similar
    
    console.log(`Would search: "${claim.searchQuery}" to verify: "${claim.claim}"`);
    
    // For now, return placeholder - would be replaced with actual search
    return {
        claim: claim.claim,
        line: claim.line,
        verified: "unknown",
        sources: [],
        issues: []
    };
}

async function factCheckDocument(documentPath) {
    console.log('Extracting factual claims...');
    const claims = await extractFactualClaims(documentPath);
    
    console.log(`Found ${claims.length} claims to verify:`);
    claims.forEach(claim => {
        console.log(`- Line ${claim.line}: ${claim.claim}`);
        console.log(`  Search: "${claim.searchQuery}"`);
    });
    
    const results = [];
    for (const claim of claims) {
        const result = await searchFactCheck(claim);
        results.push(result);
    }
    
    return results;
}

// Main execution
if (require.main === module) {
    const documentPath = process.argv[2];
    if (!documentPath) {
        console.error('Usage: search-fact-check.js <document-path>');
        process.exit(1);
    }
    
    factCheckDocument(documentPath)
        .then(results => {
            console.log(JSON.stringify(results, null, 2));
        })
        .catch(error => {
            console.error('Error:', error.message);
            process.exit(1);
        });
}

module.exports = { factCheckDocument };