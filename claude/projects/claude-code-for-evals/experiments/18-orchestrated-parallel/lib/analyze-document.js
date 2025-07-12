#!/usr/bin/env node

/**
 * Analyze document characteristics using LLM classification
 */

const fs = require('fs');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function classifyDocumentWithLLM(content) {
    const prompt = `Classify this document and recommend appropriate analysis tasks:

${content.slice(0, 2000)}${content.length > 2000 ? '...' : ''}

Respond with JSON only:
{
  "type": "technical|empirical_research|policy_analysis|opinion_essay|personal_narrative",
  "flawDensity": "high|medium|low", 
  "analysisDepth": "comprehensive|focused|minimal",
  "features": ["list_of_features"],
  "recommendations": ["list_of_tasks"],
  "reasoning": "Brief explanation"
}

Document types, flaw density, and typical tasks:
- technical: math/code/models (HIGH flaw density) → ["mathematical_accuracy", "statistical_validity", "factual_verification", "logical_consistency"]
- empirical_research: studies/data (HIGH flaw density) → ["factual_verification", "citation_accuracy", "statistical_validity", "logical_consistency"]  
- policy_analysis: recommendations (MEDIUM flaw density) → ["logical_consistency", "argument_strength", "factual_verification"]
- opinion_essay: blog posts (LOW flaw density) → ["logical_consistency"]

Features: mathematical_content, code_content, empirical_claims, policy_recommendations, argumentative_content, personal_experience

Choose 2-4 most relevant tasks based on document content.`;

    // Write prompt to temp file
    const tempFile = `/tmp/classify-prompt-${Date.now()}.txt`;
    fs.writeFileSync(tempFile, prompt);
    
    try {
        // Use claude CLI with -p flag and read prompt from file
        const { stdout } = await execAsync(`cat ${tempFile} | claude -p`, { timeout: 30000 });
        
        // Clean up temp file
        fs.unlinkSync(tempFile);
        
        // Extract JSON from the response
        const jsonMatch = stdout.match(/\{[\s\S]*?\}/);
        if (!jsonMatch) {
            throw new Error('No JSON found in LLM response');
        }
        
        return JSON.parse(jsonMatch[0]);
    } catch (error) {
        // Clean up temp file on error
        try { fs.unlinkSync(tempFile); } catch {}
        throw new Error(`LLM classification failed: ${error.message}`);
    }
}

async function analyzeDocument(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    // Get LLM classification
    const classification = await classifyDocumentWithLLM(content);
    
    const metadata = {
        type: classification.type,
        features: classification.features,
        flawDensity: classification.flawDensity,
        analysisDepth: classification.analysisDepth,
        reasoning: classification.reasoning,
        statistics: {
            lineCount: lines.length,
            wordCount: content.split(/\s+/).length,
            characterCount: content.length
        },
        recommendations: classification.recommendations
    };
    
    return metadata;
}

// Main execution
if (require.main === module) {
    const filePath = process.argv[2];
    if (!filePath) {
        console.error('Usage: analyze-document.js <document-path>');
        process.exit(1);
    }
    
    analyzeDocument(filePath)
        .then(metadata => {
            console.log(JSON.stringify(metadata, null, 2));
        })
        .catch(error => {
            console.error('Error analyzing document:', error.message);
            process.exit(1);
        });
}

module.exports = { analyzeDocument };