#!/usr/bin/env npx tsx
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// README content for each agent
const AGENT_READMES = {
  // Link Verifier
  'MUpu1JN0oSJFxz6_': `# Link Verifier

**Type**: ENRICHER  
**Current Version**: 3  
**Created by**: RoastMyPost Team  

## What This Agent Does

The Link Verifier systematically checks all URLs in a document to verify their status, identify broken links, and report on link health. Unlike other agents, it uses a specialized non-LLM workflow to directly validate URLs.

## When to Use This Agent

- **Checking link integrity before publication**
- **Auditing older documents for link rot**
- **Verifying references and citations are accessible**
- **Quality control for documentation and blog posts**
- **Preparing content for archival or long-term storage**

## What to Expect

### Analysis Style
- Direct HTTP validation of each URL
- Status codes and redirect information
- Error messages for failed connections
- Summary statistics on link health

### Comments
- One comment per problematic link
- Status codes and specific error messages
- Suggestions for fixing common issues
- No subjective evaluation—just technical validation

### Grading
- **90-100**: All links working perfectly
- **70-89**: Minor issues (1-2 broken links or redirects)
- **50-69**: Several broken links but majority working
- **30-49**: Many broken links affecting document quality
- **0-29**: Majority of links broken or inaccessible

### Typical Cost
- ~$0.02 per evaluation (non-LLM based, very efficient)

## Capabilities

- ✅ Validates HTTP/HTTPS URLs
- ✅ Follows redirects and reports final destinations
- ✅ Identifies common link issues (404, 500, timeouts)
- ✅ Checks for security issues (invalid certificates)
- ✅ Provides detailed status for each link

## Limitations

- ❌ Cannot evaluate link relevance or quality
- ❌ No access to paywalled or authenticated content
- ❌ Cannot check non-HTTP protocols (FTP, etc.)
- ❌ No JavaScript execution for dynamic content
- ⚠️ Rate limits may affect checking many links quickly

## Sample Output

### Analysis Example
> Link Verification Report:
> - Total links found: 23
> - Working links: 19 (83%)
> - Broken links: 3 (13%)
> - Redirected links: 1 (4%)
> 
> Critical issues requiring attention:
> - 3 broken links that return 404 errors
> - 1 link redirecting to potentially different content

### Comment Example
> **Title**: Broken link - Page not found  
> **Location**: Line 142  
> **Comment**: The link to https://example.com/old-resource returns a 404 error. This resource appears to have been moved or deleted. Consider finding an alternative source or using the Wayback Machine.

---

## For LLMs Modifying This Agent

### Architecture Notes
- Uses \`extendedCapabilityId: "simple-link-verifier"\`
- Bypasses standard LLM evaluation workflow
- Does NOT use analysisInstructions or selfCritiqueInstructions
- Implements custom link checking logic

### Key Design Decisions
1. **Non-LLM approach**: Direct HTTP validation is more reliable and cost-effective
2. **Technical focus**: Reports only objective link status, no content evaluation
3. **Efficiency**: Parallel link checking with appropriate rate limiting

### Modification Guidelines

**DO NOT**:
- Add analysisInstructions or selfCritiqueInstructions (they won't be used)
- Try to make it evaluate link quality or relevance
- Remove the extendedCapabilityId

**Safe modifications**:
- Update grading criteria
- Adjust comment formatting
- Modify the description
- Change summary format in genericInstructions

### Special Workflow Notes

This agent uses a completely custom implementation that:
1. Extracts all URLs from the document
2. Validates each URL using HTTP requests
3. Generates structured reports programmatically
4. Does NOT use any LLM evaluation steps

The \`genericInstructions\` field is used only for configuring the report format, not for LLM prompting.`,

  // Quantitative Forecaster
  'iAc2aQYnJLUURDGJ': `# Quantitative Forecaster

**Type**: ENRICHER  
**Current Version**: 10  
**Created by**: RoastMyPost Team  

## What This Agent Does

The Quantitative Forecaster transforms qualitative discussions into concrete, measurable predictions. It specializes in creating probability distributions, Fermi estimates, and statistical models from abstract claims, helping readers understand the quantitative implications of arguments.

## When to Use This Agent

- **Converting claims into testable predictions**
- **Adding statistical rigor to policy discussions**
- **Evaluating risk assessments and scenarios**
- **Quantifying vague statements like "likely" or "significant"**
- **Creating benchmarks for future evaluation**
- **Analyzing EA cause prioritization arguments**

## What to Expect

### Analysis Style
- Systematic extraction of implicit quantitative claims
- Creation of explicit probability distributions
- Fermi estimation breakdowns
- Sensitivity analysis on key parameters
- Reference class forecasting where applicable

### Comments
- Typically 3-5 focused quantitative insights
- Each comment adds specific numerical predictions
- Includes confidence intervals and uncertainty bounds
- References similar historical cases when available

### Grading
This agent does not provide grades (gradeInstructions not set)

### Typical Cost
- ~$0.08 per evaluation (varies with document complexity)

## Capabilities

- ✅ Transforms vague claims into numerical predictions
- ✅ Creates probability distributions and confidence intervals
- ✅ Performs Fermi estimation and order-of-magnitude calculations
- ✅ Identifies key uncertainties and sensitivity points
- ✅ Applies reference class forecasting methods
- ✅ Suggests measurable indicators for tracking

## Limitations

- ❌ Cannot access real-time data or current statistics
- ❌ May oversimplify complex multifactor situations
- ❌ Limited by quality of base rates available
- ❌ Cannot perform actual statistical analysis on data
- ⚠️ Predictions should be calibrated against actual forecasting track records

## Sample Output

### Analysis Example
> This document makes several implicit quantitative claims that benefit from explicit forecasting:
> 
> 1. **AI Timeline Claim**: "AGI is likely within the decade"
>    - Operationalized: P(AGI by 2034) = 0.65 [0.45-0.80]
>    - Key indicators: Benchmark performance, compute scaling
>    - Reference class: Previous technology adoption curves
> 
> 2. **Impact Estimate**: "This intervention could save thousands of lives"
>    - Quantified range: 2,000-8,000 lives (90% CI)
>    - Cost per life saved: $1,200-$4,500
>    - Comparison: Similar to malaria net distribution

### Comment Example
> **Title**: Quantifying "revolutionary impact" claim  
> **Location**: Lines 78-85  
> **Comment**: The claim of "revolutionary impact on education" can be quantified as:
> - Student outcome improvement: 0.4-0.8 SD (similar to one-on-one tutoring)
> - Adoption timeline: 20% of schools within 3 years, 60% within 7 years
> - Cost reduction: 30-50% per student for equivalent outcomes
> - Uncertainty: High variance due to implementation quality (±40%)

---

## For LLMs Modifying This Agent

### Architecture Notes
- Uses standard comprehensiveAnalysis workflow
- Has both analysisInstructions and selfCritiqueInstructions
- Extensive examples in genericInstructions for consistency
- No gradeInstructions (intentionally omitted)

### Key Design Decisions
1. **Enrichment focus**: Adds quantitative value rather than criticizing
2. **Epistemic humility**: Always includes uncertainty ranges
3. **Practical orientation**: Predictions should be trackable/verifiable
4. **Reference classes**: Uses historical data where possible

### Modification Guidelines

**When updating instructions**:
- Preserve the focus on extracting implicit quantities
- Maintain the practice of providing ranges, not point estimates
- Keep the emphasis on testable/trackable predictions
- Include calibration against known base rates

**Common pitfalls**:
- Overconfident point predictions without ranges
- Ignoring model uncertainty and parameter sensitivity
- Creating unfalsifiable predictions
- Neglecting to operationalize vague terms

**Testing recommendations**:
- Test on documents with both explicit and implicit claims
- Verify uncertainty ranges are reasonable
- Check that predictions are genuinely trackable
- Ensure reference classes are appropriate

### Instruction Field Usage

| Field | Used | Purpose | Notes |
|-------|------|---------|-------|
| genericInstructions | ✅ | Core forecasting methodology | ~30K words with examples |
| analysisInstructions | ✅ | Structured prediction format | Added in v10 |
| summaryInstructions | ❌ | Not specified | Falls back to generic |
| commentInstructions | ❌ | Not specified | Falls back to generic |
| gradeInstructions | ❌ | Intentionally omitted | Enrichers shouldn't grade |
| selfCritiqueInstructions | ✅ | Calibration checking | Extensive framework |`,

  // Research Scholar
  'eU4F919UQKlsLS26': `# Research Scholar

**Type**: ENRICHER  
**Current Version**: 1  
**Created by**: RoastMyPost Team  

## What This Agent Does

The Research Scholar enriches documents by finding and recommending relevant external resources. It identifies key concepts, theories, and claims in the document, then suggests academic papers, books, studies, and authoritative sources that provide deeper context, supporting evidence, or contrasting perspectives.

## When to Use This Agent

- **Adding scholarly citations to arguments**
- **Finding empirical support for claims**
- **Discovering related academic literature**
- **Identifying seminal works in a field**
- **Connecting ideas to established research**
- **Preparing literature reviews or research proposals**

## What to Expect

### Analysis Style
- Identifies key concepts and claims needing support
- Suggests specific papers, books, and studies
- Provides brief explanations of why each resource is relevant
- Includes a mix of foundational and recent works
- Organizes recommendations by topic or theme

### Comments
- Typically 4-6 resource recommendations
- Each comment links a document claim to external research
- Includes publication details and brief relevance notes
- Mixes empirical studies, theoretical works, and reviews

### Grading
This agent does not provide grades (gradeInstructions not set)

### Typical Cost
- ~$0.06 per evaluation

## Capabilities

- ✅ Identifies research gaps and unsupported claims
- ✅ Recommends peer-reviewed academic sources
- ✅ Suggests both supporting and contrasting literature
- ✅ Provides context on why sources are relevant
- ✅ Includes mix of classic and contemporary works
- ✅ Covers interdisciplinary connections

## Limitations

- ❌ Cannot access paywalled papers or verify current availability
- ❌ No real-time search of publication databases
- ❌ May suggest sources published only up to training cutoff
- ❌ Cannot read or summarize the suggested papers
- ⚠️ Recommendations based on titles/abstracts, not full text

## Sample Output

### Analysis Example
> The document discusses behavioral interventions for climate action but lacks empirical grounding. Key areas requiring scholarly support:
> 
> 1. **Social norms and energy consumption**: See Allcott (2011) "Social norms and energy conservation" in Journal of Public Economics
> 
> 2. **Nudge effectiveness**: Thaler & Sunstein (2008) "Nudge" provides foundational framework; Benartzi et al. (2017) in Psychological Science offers meta-analysis
> 
> 3. **Cultural variations**: Recommended: Henrich's "The WEIRDest People in the World" (2020) for cross-cultural behavioral differences

### Comment Example
> **Title**: Empirical support for habit formation claim  
> **Location**: Lines 122-130  
> **Comment**: Your discussion of "21 days to form a habit" needs updating. See:
> - Lally et al. (2010) "How are habits formed" European Journal of Social Psychology - finds 66 days average
> - Wood & Rünger (2016) "Psychology of Habit" Annual Review of Psychology - comprehensive review
> - Clear (2018) "Atomic Habits" - popular synthesis with practical applications
> These sources show high variability (18-254 days) based on behavior complexity.

---

## For LLMs Modifying This Agent

### Architecture Notes
- Uses standard comprehensiveAnalysis workflow
- Only genericInstructions are specified
- No grading or self-critique instructions
- Focuses purely on enrichment through citations

### Key Design Decisions
1. **Citation-only focus**: Never creates new analysis, only suggests sources
2. **Academic priority**: Emphasizes peer-reviewed and authoritative sources
3. **Relevance explanations**: Always explains why a source matters
4. **Balanced perspectives**: Includes supporting and challenging sources

### Modification Guidelines

**When updating instructions**:
- Maintain focus on ONLY providing external resources
- Preserve the practice of explaining relevance
- Keep the academic/authoritative source requirement
- Include publication details for findability

**Common pitfalls**:
- Starting to analyze content instead of just citing
- Recommending non-academic sources without justification
- Providing too many sources without clear relevance
- Forgetting to include contrasting viewpoints

**Testing recommendations**:
- Verify all recommendations are external sources
- Check that relevance explanations are clear
- Ensure mix of supporting/challenging sources
- Confirm publication details are included

### Instruction Field Usage

| Field | Used | Purpose | Notes |
|-------|------|---------|-------|
| genericInstructions | ✅ | Core citation methodology | Focus on external resources |
| analysisInstructions | ❌ | Not specified | Uses generic approach |
| summaryInstructions | ❌ | Not specified | Falls back to generic |
| commentInstructions | ❌ | Not specified | Falls back to generic |
| gradeInstructions | ❌ | Intentionally omitted | Enrichers don't grade |
| selfCritiqueInstructions | ❌ | Not specified | Basic self-assessment |

### Performance Notes
- Efficient due to focused scope
- Lower token usage than analytical agents
- Quick processing time
- Consistent quality across topics`
};

async function addAgentReadmes() {
  console.log('📝 Adding READMEs to agents...\n');

  for (const [agentId, readme] of Object.entries(AGENT_READMES)) {
    try {
      const agent = await prisma.agent.findUnique({
        where: { id: agentId },
        include: { 
          versions: { 
            orderBy: { version: 'desc' }, 
            take: 1 
          } 
        }
      });

      if (!agent) {
        console.log(`❌ Agent ${agentId} not found`);
        continue;
      }

      const latestVersion = agent.versions[0];
      const agentName = latestVersion.name;
      
      // Check if already has readme
      if (latestVersion.readme) {
        console.log(`⏭️  ${agentName} already has a README (skipping)`);
        continue;
      }

      console.log(`📝 Adding README to ${agentName}...`);

      // Create new version with README
      const newVersion = await prisma.agentVersion.create({
        data: {
          agentId: agent.id,
          version: latestVersion.version + 1,
          name: latestVersion.name,
          agentType: latestVersion.agentType,
          description: latestVersion.description,
          genericInstructions: latestVersion.genericInstructions,
          summaryInstructions: latestVersion.summaryInstructions,
          analysisInstructions: latestVersion.analysisInstructions,
          commentInstructions: latestVersion.commentInstructions,
          gradeInstructions: latestVersion.gradeInstructions,
          selfCritiqueInstructions: latestVersion.selfCritiqueInstructions,
          extendedCapabilityId: latestVersion.extendedCapabilityId,
          readme: readme
        }
      });

      console.log(`✅ Created version ${newVersion.version} with README`);
      console.log(`   README length: ${readme.length} characters\n`);
    } catch (error) {
      console.error(`❌ Error processing agent ${agentId}:`, error);
    }
  }

  console.log('✨ Done adding READMEs!');
}

// Run the script
addAgentReadmes()
  .then(() => prisma.$disconnect())
  .catch(console.error);