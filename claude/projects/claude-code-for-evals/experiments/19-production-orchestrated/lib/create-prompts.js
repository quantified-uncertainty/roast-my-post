#!/usr/bin/env node

/**
 * Create specific prompts for each task
 */

const fs = require('fs');
const path = require('path');

const TASK_INSTRUCTIONS = {
    mathematical_accuracy: `Focus on:
- Verify all equations and formulas are correct
- Check mathematical relationships and derivations
- Validate numerical calculations and examples
- Identify conceptual mathematical errors
- Verify proper use of mathematical notation
- Check consistency of mathematical statements`,
    
    statistical_validity: `Focus on:
- Verify statistical claims and interpretations
- Check proper use of statistical terminology
- Validate probability calculations
- Identify misuse of statistical concepts
- Check data analysis methods
- Verify conclusions drawn from data`,
    
    logical_consistency: `Focus on:
- Check logical flow of arguments
- Identify contradictions between statements
- Verify cause-and-effect relationships
- Find circular reasoning or logical fallacies
- Check consistency of definitions and terms
- Validate inference chains`,
    
    spelling_grammar: `Focus on:
- Spelling errors and typos
- Grammatical mistakes
- Punctuation errors
- Subject-verb agreement
- Tense consistency
- Proper word usage`,
    
    clarity_readability: `Focus on:
- Unclear or ambiguous sentences
- Overly complex sentence structures
- Missing or unclear antecedents
- Jargon without explanation
- Poor paragraph transitions
- Confusing word choices`,
    
    structural_analysis: `Focus on:
- Document organization and flow
- Missing sections or content
- Logical ordering of topics
- Balance between sections
- Appropriate use of headings
- Introduction and conclusion effectiveness`,
    
    factual_verification: `CRITICAL REQUIREMENT: You MUST use web searches for EVERY verifiable factual claim AND include complete, working source URLs.

Your workflow for EACH claim:
1. Identify ALL factual claims (numbers, statistics, dates, research references, policy claims, economic data)
2. For EACH claim, perform targeted web searches using WebSearch tool
3. Search with specific, authoritative sources (e.g., "BLS unemployment rate 2024", "Federal Reserve interest rates", "Census population data")
4. Verify URLs are complete and working (include .html/.htm/.gov extensions)
5. Cross-reference multiple sources when possible

SEARCH STRATEGY:
- Economic data: Search BLS.gov, Federal Reserve, Treasury, Commerce Dept
- Population data: Search Census.gov, demographic agencies
- Research claims: Search PubMed, Google Scholar, institutional websites
- Policy data: Search government agencies, think tanks
- Technology claims: Search official documentation, authoritative tech sites

URL QUALITY STANDARDS:
- Include complete URLs with proper extensions (.html, .htm, .gov, .pdf)
- Verify URLs point to specific pages, not general domains
- Include publication dates in search terms for recent data
- For academic papers: include DOI or specific journal URLs

EXAMPLE FINDING FORMAT:
"Current BLS data shows 3.8% unemployment (March 2024), not the claimed 3.5%. Source: https://www.bls.gov/news.release/empsit.nr0.html"

MINIMUM REQUIREMENT: Find and verify AT LEAST 3-5 factual claims per document, each with complete source URLs.

Examples of required searches with citations:
- Document: "US population is 205M" → SEARCH: "US working age population 2025 statistics"
  → Finding: "Current data shows 211.78M (May 2025). Source: census.gov/data/2025/population"
- Document: "Average wage $25-35" → SEARCH: "average hourly wage United States 2025 BLS"
  → Finding: "BLS reports $36.30/hour (June 2025). Source: bls.gov/news.release/empsit.nr0.htm"
- Document: "Studies show -0.15 elasticity" → SEARCH: "income elasticity labor supply empirical studies"
  → Finding: "Meta-analysis shows -0.1 to -0.2 range. Source: nber.org/papers/w29145"

DO NOT skip searches. DO NOT rely on training data alone.
ALWAYS include the source URL or domain in your findings.

Focus on:
- Statistical claims (SEARCH official statistics, CITE source)
- Population/demographic data (SEARCH Census/government, CITE source)
- Economic figures (SEARCH Fed/BLS, CITE exact report)
- Research citations (SEARCH for papers, CITE DOI or URL)
- Historical facts (SEARCH authoritative sources, CITE reference)`,
    
    missing_content: `Focus on:
- Incomplete explanations
- Missing context or background
- Undefined terms or concepts
- Gaps in logical progression
- Missing examples or evidence
- Incomplete references or citations`,
    
    argument_strength: `Focus on:
- Strength of evidence provided
- Quality of reasoning
- Handling of counterarguments
- Support for claims
- Logical coherence
- Persuasiveness of conclusions`,
    
    code_quality: `Focus on:
- Syntax errors in code snippets
- Logic errors or bugs
- Poor coding practices
- Missing error handling
- Unclear variable names
- Inadequate code comments`,
    
    citation_accuracy: `CRITICAL: USE WEB SEARCHES to verify ALL citations and include source URLs.

Your workflow for EACH citation/reference:
1. Identify any citation, study reference, or external source claim
2. SEARCH for the original source using WebSearch tool
3. Verify it exists and supports the claim
4. Include the actual URL or DOI in your finding

Examples with required citations:
- Document cites "Smith et al. (2023)" → SEARCH: "Smith 2023 study [relevant keywords]"
  → Finding: "Study exists but shows different results. Source: doi.org/10.1234/journal.2023.5678"
- Document claims "According to WHO report" → SEARCH: "WHO report [topic] 2024 2025"
  → Finding: "WHO report not found; similar data at who.int/data/reports/health-statistics-2025"
- Document references "Recent meta-analysis" → SEARCH: "meta-analysis [topic] 2024 2025"
  → Finding: "No recent meta-analysis found. Latest is 2022 at pubmed.gov/12345678"

Focus on:
- Proper citation format (include how to fix)
- Completeness of references (note missing info)
- Accuracy of quotes (SEARCH and compare to original)
- Link validity (TEST all URLs, provide working alternatives)
- Study verification (SEARCH to confirm existence and claims)
- Attribution accuracy (verify author names, dates, journals)

ALWAYS provide the source URL, DOI, or specific reference location.`
};

function createPrompt(documentPath, task) {
    const document = fs.readFileSync(documentPath, 'utf8');
    const instructions = TASK_INSTRUCTIONS[task.type] || '';
    
    // Add WebSearch reminder for fact-checking tasks
    const searchReminder = (task.type === 'factual_verification' || task.type === 'citation_accuracy') 
        ? '\nCRITICAL: You have WebSearch tool available. USE IT for every factual claim!\n' 
        : '';
    
    // Get current date for context
    const currentDate = new Date().toISOString().split('T')[0];
    
    return `You are an expert reviewer performing a focused analysis task. Your ONLY job is to find ${task.type} issues in the document.

IMPORTANT CONTEXT: Today's date is ${currentDate}. When evaluating claims about dates, statistics, or "recent" events, consider that it is currently 2025.
${searchReminder}
CRITICAL: You MUST use this EXACT format for EVERY finding (no other output format is acceptable):

[FINDING]
Category: ${task.type}
Severity: [choose exactly one: critical | major | minor]
Line: [exact line number from document]
Quote: "[exact quote from document, 5-100 characters]"
Issue: [clear, specific description of the problem, 10-200 characters]
[/FINDING]

Severity guidelines:
- critical: Fundamental errors that invalidate key points or could cause serious misunderstanding
- major: Significant issues that affect comprehension or accuracy
- minor: Small issues that should be fixed but don't seriously impact the document

${instructions}

IMPORTANT RULES:
1. ONLY report findings of type "${task.type}"
2. Use EXACTLY the [FINDING] format shown above
3. Quote text EXACTLY as it appears (including any errors)
4. Provide specific line numbers
5. Each finding must be independent and complete
6. Do not include any other text, commentary, or formatting outside of [FINDING] blocks
7. If you find no issues, output only: "No ${task.type} issues found."

Now analyze this document:

${document}`;
}

function createPrompts(documentPath, taskListPath, outputDir) {
    const tasks = JSON.parse(fs.readFileSync(taskListPath, 'utf8'));
    
    tasks.forEach(task => {
        const prompt = createPrompt(documentPath, task);
        const outputPath = path.join(outputDir, `${task.id}.txt`);
        fs.writeFileSync(outputPath, prompt);
    });
    
    console.log(`Created ${tasks.length} prompts in ${outputDir}`);
}

// Main execution
if (require.main === module) {
    const [documentPath, taskListPath, outputDir] = process.argv.slice(2);
    
    if (!documentPath || !taskListPath || !outputDir) {
        console.error('Usage: create-prompts.js <document-path> <task-list-path> <output-dir>');
        process.exit(1);
    }
    
    try {
        createPrompts(documentPath, taskListPath, outputDir);
    } catch (error) {
        console.error('Error creating prompts:', error.message);
        process.exit(1);
    }
}

module.exports = { createPrompt };