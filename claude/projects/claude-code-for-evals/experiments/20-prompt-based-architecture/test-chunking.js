#!/usr/bin/env node

/**
 * Test and visualize different chunking strategies
 */

const fs = require('fs').promises;
const { CHUNKING_STRATEGIES } = require('./semantic-analyzer');

async function testChunking() {
    // Create a test document with clear structure
    const testDoc = `# The Impact of Economic Policy on Market Dynamics

## Introduction

This paper examines the relationship between fiscal policy decisions and market behavior during the period 2020-2024. Our analysis focuses on three key areas: monetary policy impacts, fiscal stimulus effects, and market volatility patterns.

Recent studies have shown that traditional economic models may not fully capture the complexity of modern markets. As noted by Smith et al. (2023), "the interconnectedness of global markets requires new analytical frameworks."

## Literature Review

### Classical Economic Theory

The foundations of modern economic analysis rest on several key principles established by early theorists. Adam Smith's invisible hand concept suggests that markets naturally tend toward equilibrium through individual self-interest.

However, Keynesian economics challenged this view by arguing that government intervention is sometimes necessary to stabilize markets. The multiplier effect, first described by Keynes, shows how initial spending can have amplified impacts on the economy.

### Modern Developments

In recent decades, behavioral economics has added nuance to our understanding. Kahneman and Tversky's work on cognitive biases demonstrates that market participants don't always act rationally. This has profound implications for policy design.

The efficient market hypothesis (EMH) proposed by Fama suggests that asset prices reflect all available information. Yet numerous anomalies have been documented that challenge this view.

## Methodology

Our research employs a mixed-methods approach combining quantitative analysis with qualitative insights.

### Data Collection

We gathered data from multiple sources:
- Federal Reserve economic data (FRED)
- Bloomberg terminal for market prices
- Survey data from institutional investors (n=500)
- Interviews with 25 senior portfolio managers

The time period covers January 2020 through December 2024, capturing both pre and post-pandemic market conditions.

### Statistical Analysis

We use several econometric techniques:
1. Vector autoregression (VAR) to examine dynamic relationships
2. GARCH models for volatility analysis
3. Difference-in-differences for policy impact assessment

All statistical tests use a significance level of p<0.05. We control for multiple comparisons using the Bonferroni correction.

## Results

### Policy Impact on Markets

Our findings reveal a complex relationship between policy announcements and market reactions. The data shows:

- Interest rate changes explain 23% of market variance (R²=0.23, p<0.01)
- Fiscal stimulus announcements led to an average 2.3% market increase within 48 hours
- Volatility decreased by 15% following clear policy guidance

### Statistical Findings

The regression results are summarized below:

Market Return = 0.02 + 0.45(Policy Rate) - 0.12(Uncertainty Index) + ε

Where:
- Policy Rate coefficient: 0.45 (SE=0.08, t=5.625, p<0.001)
- Uncertainty coefficient: -0.12 (SE=0.03, t=-4.0, p<0.001)

### Robustness Checks

We performed several robustness checks:
1. Alternative model specifications
2. Different time windows
3. Subsample analysis

All results remain qualitatively similar across specifications.

## Discussion

### Theoretical Implications

Our results support a nuanced view of market-policy interactions. While classical theory predicts certain relationships, we find that behavioral factors play a significant role.

The asymmetric response to positive versus negative policy news suggests that loss aversion affects institutional investors, not just retail traders.

### Policy Recommendations

Based on our analysis, we recommend:
1. Clear communication strategies to reduce uncertainty
2. Graduated policy changes rather than sudden shifts
3. Coordination between fiscal and monetary authorities

### Limitations

Several limitations should be noted:
- Our sample period includes an unprecedented global pandemic
- Survey data may suffer from selection bias
- Causal identification remains challenging despite our econometric approach

## Conclusion

This study provides new evidence on the complex dynamics between economic policy and financial markets. Our findings suggest that policymakers must consider both traditional economic channels and behavioral factors when designing interventions.

Future research should explore the role of social media in amplifying policy signals and investigate whether our findings hold in other market contexts.

## References

1. Smith, J., Johnson, K., & Williams, R. (2023). "Modern Market Dynamics." Journal of Finance, 78(3), 45-72.
2. Keynes, J.M. (1936). The General Theory of Employment, Interest, and Money. London: Macmillan.
3. Kahneman, D., & Tversky, A. (1979). "Prospect Theory." Econometrica, 47(2), 263-291.`;

    console.log('📊 Testing Chunking Strategies\n');
    console.log('Document: Academic paper with clear structure');
    console.log(`Total length: ${testDoc.length} characters, ${testDoc.split('\n').length} lines\n`);

    // Test each strategy
    for (const [name, strategy] of Object.entries(CHUNKING_STRATEGIES)) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`Strategy: ${strategy.name}`);
        console.log(`${'='.repeat(60)}\n`);

        const chunks = strategy.chunk(testDoc);
        
        console.log(`Total chunks: ${chunks.length}\n`);

        // Show chunk details
        chunks.forEach((chunk, i) => {
            console.log(`Chunk ${i + 1}:`);
            console.log(`  Type: ${chunk.type}`);
            if (chunk.header) console.log(`  Header: "${chunk.header}"`);
            console.log(`  Lines: ${chunk.startLine}-${chunk.endLine} (${chunk.lines} lines)`);
            console.log(`  Size: ${chunk.content.length} characters`);
            
            if (chunk.metadata) {
                console.log(`  Metadata:`);
                console.log(`    - Complexity: ${chunk.metadata.complexity}`);
                console.log(`    - Has numbers: ${chunk.metadata.hasNumbers}`);
                console.log(`    - Has citations: ${chunk.metadata.hasCitations}`);
                console.log(`    - Has lists: ${chunk.metadata.hasLists}`);
            }
            
            // Show preview
            const preview = chunk.content.split('\n')[0].slice(0, 60);
            console.log(`  Preview: "${preview}${preview.length >= 60 ? '...' : ''}"`);
            console.log();
        });

        // Analysis summary
        console.log('Summary:');
        const avgSize = chunks.reduce((sum, c) => sum + c.content.length, 0) / chunks.length;
        console.log(`  Average chunk size: ${Math.round(avgSize)} characters`);
        
        if (chunks[0].metadata) {
            const complexityDist = chunks.reduce((acc, c) => {
                const complexity = c.metadata?.complexity || 'unknown';
                acc[complexity] = (acc[complexity] || 0) + 1;
                return acc;
            }, {});
            console.log(`  Complexity distribution:`, complexityDist);
        }
    }

    // Save test document for manual testing
    await fs.writeFile('test-documents/structured-paper.md', testDoc);
    console.log('\n✅ Test document saved to: test-documents/structured-paper.md');
    console.log('\nYou can now run:');
    console.log('  ./semantic-analyzer.js test-documents/structured-paper.md --strategy headers');
    console.log('  ./semantic-analyzer.js test-documents/structured-paper.md --strategy hybrid');
}

// Run test
testChunking().catch(console.error);